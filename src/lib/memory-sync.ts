import { makeFunctionReference } from 'convex/server';
import type { Id } from '../convex/_generated/dataModel';

export type MemorySyncStatus = 'synced' | 'blocked' | 'failed';

export type ArtifactMemorySync = {
	_id: Id<'memorySyncs'>;
	_creationTime: number;
	ownerId: Id<'users'>;
	sourceType: 'artifact';
	sourceId: string;
	artifactId: Id<'artifacts'>;
	projectId?: Id<'projects'>;
	threadId?: Id<'chatThreads'>;
	customId: string;
	containerTag: string;
	supermemoryDocumentId?: string;
	status: MemorySyncStatus;
	lastError?: string;
	lastSyncedAt?: number;
	createdAt: number;
	updatedAt: number;
};

export type RecordArtifactMemorySyncArgs = {
	artifactId: Id<'artifacts'>;
	customId: string;
	containerTag: string;
	supermemoryDocumentId?: string;
	status: MemorySyncStatus;
	lastError?: string;
	lastSyncedAt?: number;
};

export const getArtifactMemorySyncQuery = makeFunctionReference<
	'query',
	{ artifactId: Id<'artifacts'> },
	ArtifactMemorySync | null
>('memory:getArtifactMemorySync');

export const recordArtifactMemorySyncMutation = makeFunctionReference<
	'mutation',
	RecordArtifactMemorySyncArgs,
	{ ok: true }
>('memory:recordArtifactMemorySync');
