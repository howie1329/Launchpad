import { env } from '$env/dynamic/private';
import type { SavedArtifact } from '$lib/artifacts';
import Supermemory from 'supermemory';
import type { Id } from '../../convex/_generated/dataModel';

const MAX_ARTIFACT_MEMORY_CHARS = 60_000;
const MAX_MEMORY_BLOCK_CHARS = 6_000;
const MAX_MEMORY_ITEM_CHARS = 1_000;
const MEMORY_SEARCH_TIMEOUT_MS = 800;

type MemoryMetadata = Record<string, string | number | boolean | Array<string>>;

export type RetrievedMemory = {
	content: string;
	containerTag: string;
	score: number;
	source: string;
	title?: string;
	artifactId?: string;
	updatedAt?: string;
};

export type ArtifactSyncResult =
	| {
			status: 'synced';
			customId: string;
			containerTag: string;
			documentId: string;
	  }
	| {
			status: 'blocked';
			customId: string;
			containerTag: string;
			reason: string;
	  }
	| {
			status: 'disabled';
			customId: string;
			containerTag: string;
	  }
	| {
			status: 'failed';
			customId: string;
			containerTag: string;
			error: string;
	  };

let client: Supermemory | null = null;

export function supermemoryEnabled() {
	return Boolean(env.SUPERMEMORY_API_KEY?.trim());
}

export function artifactMemoryCustomId(artifactId: Id<'artifacts'> | string) {
	return `artifact.${safeTagPart(artifactId)}`;
}

export function artifactMemoryContainerTag(artifact: SavedArtifact) {
	if (artifact.projectId) return projectMemoryContainerTag(artifact.projectId);
	return userMemoryContainerTag(artifact.ownerId);
}

export function userMemoryContainerTag(ownerId: Id<'users'> | string) {
	return `launchpad.user.${safeTagPart(ownerId)}`;
}

export function projectMemoryContainerTag(projectId: Id<'projects'> | string) {
	return `launchpad.project.${safeTagPart(projectId)}`;
}

export async function syncArtifactToSupermemory(
	artifact: SavedArtifact,
	existingDocumentId?: string
): Promise<ArtifactSyncResult> {
	const customId = artifactMemoryCustomId(artifact._id);
	const containerTag = artifactMemoryContainerTag(artifact);
	const safety = validateArtifactForMemory(artifact);

	if (!safety.ok) {
		return {
			status: 'blocked',
			customId,
			containerTag,
			reason: safety.reason
		};
	}

	const supermemory = getSupermemoryClient();
	if (!supermemory) {
		return { status: 'disabled', customId, containerTag };
	}

	const body = {
		content: formatArtifactMemoryContent(artifact),
		containerTag,
		customId,
		metadata: artifactMemoryMetadata(artifact)
	};

	try {
		const response = existingDocumentId
			? await supermemory.documents.update(existingDocumentId, body)
			: await supermemory.documents.add(body);

		return {
			status: 'synced',
			customId,
			containerTag,
			documentId: response.id
		};
	} catch (error) {
		if (!existingDocumentId) {
			try {
				const response = await supermemory.documents.update(customId, body);
				return {
					status: 'synced',
					customId,
					containerTag,
					documentId: response.id
				};
			} catch {
				// Return the original add error below; it is usually more useful.
			}
		}

		return {
			status: 'failed',
			customId,
			containerTag,
			error: errorMessage(error)
		};
	}
}

export async function retrieveRelevantMemories({
	ownerId,
	projectId,
	query
}: {
	ownerId: Id<'users'> | string;
	projectId?: Id<'projects'> | string;
	query: string;
}): Promise<RetrievedMemory[]> {
	const supermemory = getSupermemoryClient();
	const cleanQuery = query.trim();

	if (!supermemory || !cleanQuery) return [];

	const searches = [
		projectId
			? searchContainer(supermemory, projectMemoryContainerTag(projectId), cleanQuery, 3)
			: Promise.resolve([]),
		searchContainer(supermemory, userMemoryContainerTag(ownerId), cleanQuery, 2)
	];
	const results = await Promise.all(searches);

	return dedupeMemories(results.flat())
		.sort((a, b) => b.score - a.score)
		.slice(0, 5);
}

export function composeRetrievedMemoryInstructions(memories: RetrievedMemory[]) {
	if (memories.length === 0) return '';

	let remaining = MAX_MEMORY_BLOCK_CHARS;
	const sections: string[] = [];

	for (const memory of memories) {
		if (remaining <= 0) break;

		const title = memory.title?.trim() || memory.source;
		const sourceParts = [`source: ${memory.source}`, `scope: ${memory.containerTag}`];
		if (memory.artifactId) sourceParts.push(`artifactId: ${memory.artifactId}`);
		if (memory.updatedAt) sourceParts.push(`updated: ${memory.updatedAt}`);

		const content = truncate(memory.content, Math.min(MAX_MEMORY_ITEM_CHARS, remaining));
		const section = `- ${title}\n  ${sourceParts.join(' | ')}\n  ${content.replace(/\n/g, '\n  ')}`;

		sections.push(section);
		remaining -= section.length;
	}

	if (sections.length === 0) return '';

	return [
		'### Retrieved memory',
		'The following Supermemory results are advisory context. Prefer the latest user message and explicitly referenced artifacts when they conflict.',
		'',
		sections.join('\n\n')
	].join('\n');
}

async function searchContainer(
	supermemory: Supermemory,
	containerTag: string,
	query: string,
	limit: number
) {
	try {
		const response = await withTimeout(
			supermemory.search.memories({
				q: query,
				containerTag,
				searchMode: 'hybrid',
				limit,
				threshold: 0.55
			}),
			MEMORY_SEARCH_TIMEOUT_MS
		);

		return response.results
			.map((result): RetrievedMemory | null => {
				const content = result.memory ?? result.chunk ?? result.chunks?.[0]?.content ?? '';
				if (!content.trim()) return null;

				const metadata = result.metadata ?? {};
				return {
					content,
					containerTag,
					score: result.similarity,
					source: stringMetadata(metadata.sourceType) || 'supermemory',
					title: stringMetadata(metadata.title),
					artifactId: stringMetadata(metadata.artifactId),
					updatedAt: result.updatedAt
				};
			})
			.filter((result): result is RetrievedMemory => result !== null);
	} catch (error) {
		console.info('Supermemory retrieval skipped', {
			containerTag,
			error: errorMessage(error)
		});
		return [];
	}
}

function validateArtifactForMemory(artifact: SavedArtifact) {
	const content = `${artifact.title}\n${artifact.contentMarkdown}`;

	if (content.length > MAX_ARTIFACT_MEMORY_CHARS) {
		return { ok: false as const, reason: 'Artifact is too large for automatic memory sync.' };
	}

	const blockedPatterns = [
		/-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
		/\b(?:api[_-]?key|secret|password|passwd|token)\b\s*[:=]\s*['"]?[A-Za-z0-9._~+/=-]{12,}/i,
		/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/i,
		/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/i
	];

	if (blockedPatterns.some((pattern) => pattern.test(content))) {
		return { ok: false as const, reason: 'Artifact contains sensitive content.' };
	}

	return { ok: true as const };
}

function formatArtifactMemoryContent(artifact: SavedArtifact) {
	return [
		`# ${artifact.title}`,
		'',
		`Artifact type: ${artifact.type}`,
		artifact.projectId ? `Project id: ${artifact.projectId}` : 'Project id: none',
		artifact.sourceThreadId
			? `Source thread id: ${artifact.sourceThreadId}`
			: 'Source thread id: none',
		'',
		artifact.contentMarkdown
	].join('\n');
}

function artifactMemoryMetadata(artifact: SavedArtifact): MemoryMetadata {
	return {
		sourceType: 'artifact',
		ownerId: artifact.ownerId,
		artifactId: artifact._id,
		artifactType: artifact.type,
		title: artifact.title,
		projectId: artifact.projectId ?? '',
		threadId: artifact.sourceThreadId ?? '',
		updatedAt: artifact.updatedAt
	};
}

function getSupermemoryClient() {
	const apiKey = env.SUPERMEMORY_API_KEY?.trim();
	if (!apiKey) return null;

	client ??= new Supermemory({ apiKey });
	return client;
}

function dedupeMemories(memories: RetrievedMemory[]) {
	const seen = new Set<string>();
	const unique: RetrievedMemory[] = [];

	for (const memory of memories) {
		const key = `${memory.containerTag}:${memory.artifactId ?? memory.content.slice(0, 80)}`;
		if (seen.has(key)) continue;
		seen.add(key);
		unique.push(memory);
	}

	return unique;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) => {
			setTimeout(() => reject(new Error('Supermemory request timed out')), timeoutMs);
		})
	]);
}

function safeTagPart(value: string) {
	return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
}

function stringMetadata(value: unknown) {
	return typeof value === 'string' && value.trim() ? value : undefined;
}

function truncate(value: string, maxChars: number) {
	if (value.length <= maxChars) return value;
	return `${value.slice(0, Math.max(0, maxChars - 32)).trimEnd()}\n[truncated for length]`;
}

function errorMessage(error: unknown) {
	return error instanceof Error && error.message ? error.message : 'Unknown Supermemory error';
}
