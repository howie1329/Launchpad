import type Supermemory from 'supermemory';
import type { SearchDocumentsParams } from 'supermemory/resources/search';
import type { Id } from '../../../convex/_generated/dataModel';
import { getSupermemoryClient } from './client';
import { memoryLog } from './log';
import { projectMemoryContainerTag, userMemoryContainerTag } from './tags';
import { errorMessage, MEMORY_SEARCH_TIMEOUT_MS, withTimeout } from './fallback';

/** Limit retrieval to Launchpad-owned document kinds (metadata.sourceType). */
const memorySourceFilter = {
	OR: [
		{ key: 'sourceType', value: 'artifact', filterType: 'metadata' as const },
		{ key: 'sourceType', value: 'user_note', filterType: 'metadata' as const }
	]
} satisfies SearchDocumentsParams.Or;

export type RetrievedMemory = {
	documentId: string;
	content: string;
	containerTag: string;
	score: number;
	source: string;
	title?: string;
	artifactId?: string;
	updatedAt?: string;
};

function stringMetadata(value: unknown) {
	return typeof value === 'string' && value.trim() ? value : undefined;
}

async function searchContainer(
	sm: Supermemory,
	containerTag: string,
	query: string,
	limit: number
) {
	try {
		const response = await withTimeout(
			sm.search.documents({
				q: query,
				containerTags: [containerTag],
				limit,
				chunkThreshold: 0.55,
				onlyMatchingChunks: true,
				filters: memorySourceFilter
			}),
			MEMORY_SEARCH_TIMEOUT_MS
		);

		return response.results
			.map((result): RetrievedMemory | null => {
				const content =
					result.chunks
						.filter((chunk) => chunk.isRelevant)
						.map((chunk) => chunk.content)
						.join('\n\n') ||
					result.summary ||
					'';
				if (!content.trim()) return null;

				const metadata = result.metadata ?? {};
				return {
					documentId: result.documentId,
					content,
					containerTag,
					score: result.score,
					source: stringMetadata(metadata.sourceType) || 'supermemory',
					title: stringMetadata(metadata.title) ?? result.title ?? undefined,
					artifactId: stringMetadata(metadata.artifactId),
					updatedAt: result.updatedAt
				};
			})
			.filter((result): result is RetrievedMemory => result !== null);
	} catch (error) {
		memoryLog('supermemory.retrieval_skipped', {
			containerTag,
			error: errorMessage(error)
		});
		return [];
	}
}

function dedupeMemories(memories: RetrievedMemory[]) {
	const seen = new Set<string>();
	const unique: RetrievedMemory[] = [];

	for (const memory of memories) {
		if (seen.has(memory.documentId)) continue;
		seen.add(memory.documentId);
		unique.push(memory);
	}

	return unique;
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
	const sm = getSupermemoryClient();
	const cleanQuery = query.trim();

	if (!sm || !cleanQuery) return [];

	const searches = [
		projectId
			? searchContainer(sm, projectMemoryContainerTag(projectId), cleanQuery, 3)
			: Promise.resolve([]),
		searchContainer(sm, userMemoryContainerTag(ownerId), cleanQuery, 2)
	];
	const results = await Promise.all(searches);

	return dedupeMemories(results.flat())
		.sort((a, b) => b.score - a.score)
		.slice(0, 5);
}
