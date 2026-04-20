import { getArtifactMemorySyncQuery, recordArtifactMemorySyncMutation } from '$lib/memory-sync';
import { getArtifactQuery } from '$lib/artifacts';
import { syncArtifactToSupermemory } from '$lib/server/supermemory';
import type { ConvexHttpClient } from 'convex/browser';
import type { Id } from '../../convex/_generated/dataModel';

export async function syncArtifactMemory(convex: ConvexHttpClient, artifactId: Id<'artifacts'>) {
	const artifact = await convex.query(getArtifactQuery, { artifactId });
	if (!artifact) return;

	const existing = await convex.query(getArtifactMemorySyncQuery, { artifactId });
	const result = await syncArtifactToSupermemory(artifact, existing?.supermemoryDocumentId);

	if (result.status === 'disabled') return;

	if (result.status === 'synced') {
		await convex.mutation(recordArtifactMemorySyncMutation, {
			artifactId,
			customId: result.customId,
			containerTag: result.containerTag,
			supermemoryDocumentId: result.documentId,
			status: 'synced',
			lastSyncedAt: Date.now()
		});
		return;
	}

	await convex.mutation(recordArtifactMemorySyncMutation, {
		artifactId,
		customId: result.customId,
		containerTag: result.containerTag,
		status: result.status,
		lastError: result.status === 'blocked' ? result.reason : result.error
	});
}
