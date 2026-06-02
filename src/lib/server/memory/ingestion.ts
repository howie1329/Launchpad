import type { SavedArtifact } from '$lib/artifacts';
import type { Id } from '../../../convex/_generated/dataModel';
import { getSupermemoryClient } from './client';
import { memoryLog } from './log';
import {
	MAX_PROJECT_DECISION_MEMORY_CHARS,
	MAX_THREAD_INSIGHT_MEMORY_CHARS,
	MAX_USER_PREFERENCE_MEMORY_CHARS,
	validateArtifactForMemory,
	validateMemoryContent,
	validateMemoryEvidence,
	validateUserMemoryText
} from './safety';
import {
	artifactMemoryContainerTag,
	artifactMemoryCustomId,
	projectMemoryContainerTag,
	safeTagPart,
	userMemoryContainerTag
} from './tags';
import { errorMessage, withTimeout } from './fallback';
import {
	isProjectDecisionCategory,
	isReadableMemorySourceType,
	isSemanticSourceType,
	isThreadInsightCategory,
	isUserPreferenceCategory,
	projectDecisionCategories,
	readableMemorySourceTypes,
	semanticMemoryCustomId,
	threadInsightCategories,
	type InspectedMemoryDocument,
	type MemoryConfidence,
	type MemoryScope,
	type ProjectDecisionCategory,
	type ScopedMemorySummary,
	type SemanticMemorySourceType,
	type ThreadInsightCategory,
	type UserPreferenceCategory,
	userPreferenceCategories
} from './semantic';

const DELETE_TIMEOUT_MS = 5_000;
const BULK_DELETE_TIMEOUT_MS = 30_000;
const ADD_TIMEOUT_MS = 30_000;

type MemoryMetadata = Record<string, string | number | boolean | Array<string>>;

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

export async function deleteSupermemoryDocument(
	documentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
	const sm = getSupermemoryClient();
	if (!sm) return { ok: false, error: 'Supermemory is not configured.' };

	try {
		await withTimeout(sm.documents.delete(documentId), DELETE_TIMEOUT_MS);
		memoryLog('supermemory.document_deleted', { documentId: documentId.slice(0, 12) });
		return { ok: true };
	} catch (error) {
		const msg = errorMessage(error);
		memoryLog(
			'supermemory.document_delete_failed',
			{ documentId: documentId.slice(0, 12), error: msg },
			'warn'
		);
		return { ok: false, error: msg };
	}
}

export async function deleteSupermemoryAccountData(args: {
	ownerId: Id<'users'>;
	projectIds: Id<'projects'>[];
	documentIds?: string[];
}): Promise<
	{ status: 'disabled' | 'deleted'; deletedCount: number } | { status: 'failed'; error: string }
> {
	const sm = getSupermemoryClient();
	if (!sm) return { status: 'disabled', deletedCount: 0 };

	const containerTags = [
		userMemoryContainerTag(args.ownerId),
		...args.projectIds.map((projectId) => projectMemoryContainerTag(projectId))
	];

	try {
		let deletedCount = 0;
		const documentIds = [...new Set(args.documentIds ?? [])];
		for (let index = 0; index < documentIds.length; index += 100) {
			const ids = documentIds.slice(index, index + 100);
			if (ids.length === 0) continue;
			const result = await withTimeout(sm.documents.deleteBulk({ ids }), BULK_DELETE_TIMEOUT_MS);
			if (!result.success) {
				const detail = result.errors?.map((item) => `${item.id}: ${item.error}`).join('; ');
				return {
					status: 'failed',
					error: detail
						? `Supermemory document deletion failed: ${detail}`
						: 'Supermemory document deletion failed.'
				};
			}
			deletedCount += result.deletedCount;
		}

		const result = await withTimeout(
			sm.documents.deleteBulk({ containerTags }),
			BULK_DELETE_TIMEOUT_MS
		);
		if (!result.success) {
			return { status: 'failed', error: 'Supermemory account memory deletion failed.' };
		}

		deletedCount += result.deletedCount;
		memoryLog('supermemory.account_data_deleted', {
			containerTagCount: containerTags.length,
			documentIdCount: documentIds.length,
			deletedCount
		});

		return { status: 'deleted', deletedCount };
	} catch (error) {
		const msg = errorMessage(error);
		memoryLog('supermemory.account_data_delete_failed', { error: msg }, 'warn');
		return { status: 'failed', error: msg };
	}
}

export async function syncArtifactToSupermemory(
	artifact: SavedArtifact,
	existingDocumentId: string | undefined,
	options?: { previousSyncedContainerTag?: string }
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

	const sm = getSupermemoryClient();
	if (!sm) {
		return { status: 'disabled', customId, containerTag };
	}

	const prevTag = options?.previousSyncedContainerTag;
	let docIdToUpdate = existingDocumentId;
	if (prevTag && prevTag !== containerTag && existingDocumentId) {
		const del = await deleteSupermemoryDocument(existingDocumentId);
		if (!del.ok) {
			memoryLog(
				'supermemory.container_change_delete_failed',
				{
					artifactId: String(artifact._id).slice(0, 8),
					error: del.error
				},
				'warn'
			);
		}
		docIdToUpdate = undefined;
	}

	const body = {
		content: formatArtifactMemoryContent(artifact),
		containerTags: [containerTag],
		customId,
		metadata: artifactMemoryMetadata(artifact)
	};

	try {
		const response = docIdToUpdate
			? await withTimeout(sm.documents.update(docIdToUpdate, body), ADD_TIMEOUT_MS)
			: await withTimeout(sm.add(body), ADD_TIMEOUT_MS);

		return {
			status: 'synced',
			customId,
			containerTag,
			documentId: response.id
		};
	} catch (error) {
		if (!docIdToUpdate) {
			try {
				const response = await withTimeout(sm.documents.update(customId, body), ADD_TIMEOUT_MS);
				return {
					status: 'synced',
					customId,
					containerTag,
					documentId: response.id
				};
			} catch {
				// fall through
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

export type AddUserMemoryResult =
	| { status: 'synced'; documentId: string; containerTag: string }
	| { status: 'blocked'; reason: string }
	| { status: 'disabled' }
	| { status: 'failed'; error: string };

export async function addUserMemoryDocument(args: {
	ownerId: Id<'users'>;
	projectId?: Id<'projects'>;
	threadId: Id<'chatThreads'>;
	text: string;
}): Promise<AddUserMemoryResult> {
	const safety = validateUserMemoryText(args.text);
	if (!safety.ok) {
		return { status: 'blocked', reason: safety.reason };
	}

	const sm = getSupermemoryClient();
	if (!sm) return { status: 'disabled' };

	const containerTag = args.projectId
		? projectMemoryContainerTag(args.projectId)
		: userMemoryContainerTag(args.ownerId);

	const customId = `user-note:${safeTagPart(String(args.threadId))}:${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
	const body = {
		content: safety.text,
		containerTags: [containerTag],
		customId,
		metadata: {
			sourceType: 'user_note',
			ownerId: args.ownerId,
			threadId: args.threadId,
			projectId: args.projectId ?? '',
			createdAt: Date.now()
		} satisfies MemoryMetadata
	};

	try {
		const response = await withTimeout(sm.add(body), ADD_TIMEOUT_MS);
		memoryLog('supermemory.user_memory_added', {
			containerTag,
			threadId: String(args.threadId).slice(0, 8)
		});
		return { status: 'synced', documentId: response.id, containerTag };
	} catch (error) {
		return { status: 'failed', error: errorMessage(error) };
	}
}

type AddSemanticMemoryResult =
	| { status: 'synced'; documentId: string; containerTag: string }
	| { status: 'blocked'; reason: string }
	| { status: 'disabled' }
	| { status: 'failed'; error: string };

function sanitizeMetadataValue(value: unknown) {
	return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
		? value
		: '';
}

function metadataRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function stringMetadata(metadata: Record<string, unknown>, key: string) {
	const value = metadata[key];
	return typeof value === 'string' && value.trim() ? value : undefined;
}

function numberOrStringMetadata(metadata: Record<string, unknown>, key: string) {
	const value = metadata[key];
	return typeof value === 'string' || typeof value === 'number' ? value : undefined;
}

function summarizeContent(content: string, maxChars = 500) {
	const trimmed = content.trim().replace(/\s+/g, ' ');
	if (trimmed.length <= maxChars) return trimmed;
	return `${trimmed.slice(0, Math.max(0, maxChars - 16)).trimEnd()}…`;
}

async function addSemanticMemoryDocument(args: {
	ownerId: Id<'users'>;
	projectId?: Id<'projects'>;
	threadId: Id<'chatThreads'>;
	sourceType: SemanticMemorySourceType;
	category: string;
	content: string;
	evidence?: string;
	confidence: MemoryConfidence;
	containerTag: string;
	maxChars: number;
}): Promise<AddSemanticMemoryResult> {
	const content = validateMemoryContent(args.content, args.maxChars);
	if (!content.ok) return { status: 'blocked', reason: content.reason };

	const evidence = validateMemoryEvidence(args.evidence);
	if (!evidence.ok) return { status: 'blocked', reason: evidence.reason };

	const sm = getSupermemoryClient();
	if (!sm) return { status: 'disabled' };

	const now = Date.now();
	const metadata = {
		sourceType: args.sourceType,
		category: args.category,
		ownerId: args.ownerId,
		projectId: args.projectId ?? '',
		threadId: args.threadId,
		createdAt: now,
		updatedAt: now,
		confidence: args.confidence,
		...(evidence.evidence ? { evidence: evidence.evidence } : {})
	} satisfies MemoryMetadata;

	try {
		const response = await withTimeout(
			sm.add({
				content: content.text,
				containerTags: [args.containerTag],
				customId: semanticMemoryCustomId({ sourceType: args.sourceType, threadId: args.threadId }),
				metadata
			}),
			ADD_TIMEOUT_MS
		);
		memoryLog('supermemory.semantic_memory_added', {
			sourceType: args.sourceType,
			category: args.category,
			containerTag: args.containerTag
		});
		return { status: 'synced', documentId: response.id, containerTag: args.containerTag };
	} catch (error) {
		return { status: 'failed', error: errorMessage(error) };
	}
}

export async function addUserPreferenceMemoryDocument(args: {
	ownerId: Id<'users'>;
	threadId: Id<'chatThreads'>;
	category: UserPreferenceCategory;
	content: string;
	evidence?: string;
	confidence: MemoryConfidence;
}) {
	if (!isUserPreferenceCategory(args.category)) {
		return { status: 'blocked' as const, reason: 'Unsupported user preference category.' };
	}
	return addSemanticMemoryDocument({
		...args,
		sourceType: 'user_preference',
		containerTag: userMemoryContainerTag(args.ownerId),
		maxChars: MAX_USER_PREFERENCE_MEMORY_CHARS
	});
}

export async function addProjectDecisionMemoryDocument(args: {
	ownerId: Id<'users'>;
	projectId: Id<'projects'>;
	threadId: Id<'chatThreads'>;
	category: ProjectDecisionCategory;
	content: string;
	evidence?: string;
	confidence: 'explicit' | 'high';
}) {
	if (!isProjectDecisionCategory(args.category)) {
		return { status: 'blocked' as const, reason: 'Unsupported project decision category.' };
	}
	return addSemanticMemoryDocument({
		...args,
		sourceType: 'project_decision',
		containerTag: projectMemoryContainerTag(args.projectId),
		maxChars: MAX_PROJECT_DECISION_MEMORY_CHARS
	});
}

export async function addThreadInsightMemoryDocument(args: {
	ownerId: Id<'users'>;
	projectId?: Id<'projects'>;
	threadId: Id<'chatThreads'>;
	category: ThreadInsightCategory;
	content: string;
	evidence?: string;
}) {
	if (!isThreadInsightCategory(args.category)) {
		return { status: 'blocked' as const, reason: 'Unsupported thread insight category.' };
	}
	return addSemanticMemoryDocument({
		...args,
		sourceType: 'thread_insight',
		confidence: 'high',
		containerTag: args.projectId
			? projectMemoryContainerTag(args.projectId)
			: userMemoryContainerTag(args.ownerId),
		maxChars: MAX_THREAD_INSIGHT_MEMORY_CHARS
	});
}

function memoryScopeFromContainerTag(
	containerTag: string,
	ownerId: Id<'users'>,
	projectId?: Id<'projects'>
) {
	if (containerTag === userMemoryContainerTag(ownerId)) return 'user' as const;
	if (projectId && containerTag === projectMemoryContainerTag(projectId)) return 'project' as const;
	return undefined;
}

function memorySummaryFromDocument(args: {
	doc: Record<string, unknown>;
	containerTag: string;
	ownerId: Id<'users'>;
	projectId?: Id<'projects'>;
}): ScopedMemorySummary | null {
	const metadata = metadataRecord(args.doc.metadata);
	const sourceType = stringMetadata(metadata, 'sourceType') ?? 'supermemory';
	if (!isReadableMemorySourceType(sourceType)) return null;

	const scope = memoryScopeFromContainerTag(args.containerTag, args.ownerId, args.projectId);
	if (!scope) return null;

	const content =
		typeof args.doc.content === 'string'
			? args.doc.content
			: typeof args.doc.summary === 'string'
				? args.doc.summary
				: '';
	const documentId = String(args.doc.documentId ?? args.doc.id ?? '');
	if (!documentId) return null;

	return {
		documentId,
		scope,
		sourceType,
		category:
			stringMetadata(metadata, 'category') ?? stringMetadata(metadata, 'artifactType') ?? '',
		title:
			stringMetadata(metadata, 'title') ??
			(typeof args.doc.title === 'string' ? args.doc.title : undefined),
		summary: summarizeContent(content || String(args.doc.title ?? sourceType)),
		createdAt: numberOrStringMetadata(metadata, 'createdAt'),
		updatedAt:
			numberOrStringMetadata(metadata, 'updatedAt') ??
			numberOrStringMetadata(args.doc, 'updatedAt'),
		threadId: stringMetadata(metadata, 'threadId'),
		projectId: stringMetadata(metadata, 'projectId'),
		readOnly: sourceType === 'artifact',
		derivedFromArtifact: sourceType === 'artifact'
	};
}

function readableMemoryFilter() {
	return {
		OR: readableMemorySourceTypes.map((sourceType) => ({
			key: 'sourceType',
			value: sourceType,
			filterType: 'metadata' as const
		}))
	};
}

export async function listScopedMemoryDocuments(args: {
	ownerId: Id<'users'>;
	projectId?: Id<'projects'>;
	limit?: number;
}): Promise<
	| { status: 'disabled' }
	| { status: 'listed'; user: ScopedMemorySummary[]; project: ScopedMemorySummary[] }
	| { status: 'failed'; error: string }
> {
	const sm = getSupermemoryClient();
	if (!sm) return { status: 'disabled' };

	const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);
	const userTag = userMemoryContainerTag(args.ownerId);
	const projectTag = args.projectId ? projectMemoryContainerTag(args.projectId) : undefined;

	try {
		const [userDocs, projectDocs] = await Promise.all([
			withTimeout(sm.documents.list({ containerTags: [userTag], limit }), DELETE_TIMEOUT_MS),
			projectTag
				? withTimeout(sm.documents.list({ containerTags: [projectTag], limit }), DELETE_TIMEOUT_MS)
				: Promise.resolve({ documents: [] })
		]);
		const getDocs = (response: unknown) => {
			const record = metadataRecord(response);
			const docs = record.documents ?? record.results ?? record.data ?? [];
			return Array.isArray(docs) ? (docs as Record<string, unknown>[]) : [];
		};
		return {
			status: 'listed',
			user: getDocs(userDocs)
				.map((doc) =>
					memorySummaryFromDocument({
						doc,
						containerTag: userTag,
						ownerId: args.ownerId,
						projectId: args.projectId
					})
				)
				.filter((doc): doc is ScopedMemorySummary => doc !== null),
			project: projectTag
				? getDocs(projectDocs)
						.map((doc) =>
							memorySummaryFromDocument({
								doc,
								containerTag: projectTag,
								ownerId: args.ownerId,
								projectId: args.projectId
							})
						)
						.filter((doc): doc is ScopedMemorySummary => doc !== null)
				: []
		};
	} catch (error) {
		return { status: 'failed', error: errorMessage(error) };
	}
}

export async function inspectScopedMemoryDocument(args: {
	documentId: string;
	ownerId: Id<'users'>;
	projectId?: Id<'projects'>;
}): Promise<
	| { status: 'disabled' }
	| { status: 'inspected'; memory: InspectedMemoryDocument }
	| { status: 'denied'; reason: string }
	| { status: 'failed'; error: string }
> {
	const sm = getSupermemoryClient();
	if (!sm) return { status: 'disabled' };

	try {
		const doc = (await withTimeout(
			sm.documents.get(args.documentId),
			DELETE_TIMEOUT_MS
		)) as unknown as Record<string, unknown>;
		const metadata = metadataRecord(doc.metadata);
		const sourceType = stringMetadata(metadata, 'sourceType') ?? '';
		if (!isReadableMemorySourceType(sourceType))
			return { status: 'denied', reason: 'Unsupported memory type.' };

		const tags = Array.isArray(doc.containerTags) ? doc.containerTags.map(String) : [];
		const containerTag = tags.find((tag) =>
			memoryScopeFromContainerTag(tag, args.ownerId, args.projectId)
		);
		if (!containerTag)
			return { status: 'denied', reason: 'Document is outside this workspace scope.' };

		const summary = memorySummaryFromDocument({
			doc,
			containerTag,
			ownerId: args.ownerId,
			projectId: args.projectId
		});
		if (!summary) return { status: 'denied', reason: 'Document is outside this workspace scope.' };

		return {
			status: 'inspected',
			memory: {
				...summary,
				content: typeof doc.content === 'string' ? doc.content : summary.summary,
				metadata: Object.fromEntries(
					Object.entries(metadata).map(([key, value]) => [key, sanitizeMetadataValue(value)])
				),
				readOnly: sourceType === 'artifact',
				derivedFromArtifact: sourceType === 'artifact'
			}
		};
	} catch (error) {
		return { status: 'failed', error: errorMessage(error) };
	}
}

export async function deleteScopedSemanticMemoryDocument(args: {
	documentId: string;
	ownerId: Id<'users'>;
	projectId?: Id<'projects'>;
	scope: MemoryScope;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
	const sm = getSupermemoryClient();
	if (!sm) return { ok: false, reason: 'Supermemory is not configured.' };

	try {
		const doc = (await withTimeout(
			sm.documents.get(args.documentId),
			DELETE_TIMEOUT_MS
		)) as unknown as Record<string, unknown>;
		const metadata = metadataRecord(doc.metadata);
		const sourceType = stringMetadata(metadata, 'sourceType') ?? '';
		if (!isSemanticSourceType(sourceType)) {
			return { ok: false, reason: 'Only semantic user/project memory can be forgotten here.' };
		}
		const expectedTag =
			args.scope === 'user'
				? userMemoryContainerTag(args.ownerId)
				: args.projectId
					? projectMemoryContainerTag(args.projectId)
					: '';
		if (!expectedTag)
			return { ok: false, reason: 'Project memory is only available in project chats.' };

		const tags = Array.isArray(doc.containerTags) ? doc.containerTags.map(String) : [];
		if (!tags.includes(expectedTag)) {
			return { ok: false, reason: 'Document is outside the requested memory scope.' };
		}

		const ownerFromMeta = stringMetadata(metadata, 'ownerId');
		if (ownerFromMeta && ownerFromMeta !== args.ownerId) {
			return { ok: false, reason: 'Document owner does not match.' };
		}

		const projectFromMeta = stringMetadata(metadata, 'projectId');
		if (args.scope === 'user') {
			if (sourceType === 'project_decision' || projectFromMeta) {
				return { ok: false, reason: 'Use project memory tools for project-scoped memory.' };
			}
		} else if (sourceType === 'user_preference') {
			return {
				ok: false,
				reason: 'Global user preferences cannot be deleted by project memory tools.'
			};
		}

		const del = await deleteSupermemoryDocument(args.documentId);
		return del.ok ? { ok: true } : { ok: false, reason: del.error };
	} catch {
		return { ok: false, reason: 'Document not found or inaccessible.' };
	}
}

export {
	readableMemoryFilter,
	userPreferenceCategories,
	projectDecisionCategories,
	threadInsightCategories
};
