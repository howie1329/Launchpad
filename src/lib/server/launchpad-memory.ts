import { getArtifactMemorySyncQuery, recordArtifactMemorySyncMutation } from '$lib/memory-sync'
import { getArtifactQuery } from '$lib/artifacts'
import { memoryLog, syncArtifactToSupermemory } from '$lib/server/memory'
import type { ConvexHttpClient } from 'convex/browser'
import type { Id } from '../../convex/_generated/dataModel'

export async function syncArtifactMemory(convex: ConvexHttpClient, artifactId: Id<'artifacts'>) {
	const artifact = await convex.query(getArtifactQuery, { artifactId })
	if (!artifact) return { status: 'not_found' as const }

	const existing = await convex.query(getArtifactMemorySyncQuery, { artifactId })
	const result = await syncArtifactToSupermemory(artifact, existing?.supermemoryDocumentId, {
		previousSyncedContainerTag: existing?.containerTag
	})

	if (result.status === 'disabled') return result

	if (result.status === 'synced') {
		await convex.mutation(recordArtifactMemorySyncMutation, {
			artifactId,
			customId: result.customId,
			containerTag: result.containerTag,
			supermemoryDocumentId: result.documentId,
			status: 'synced',
			lastSyncedAt: Date.now()
		})
		return result
	}

	if (result.status === 'failed' || result.status === 'blocked') {
		memoryLog('supermemory.artifact_sync_unsuccessful', {
			artifactId: String(artifactId).slice(0, 8),
			status: result.status,
			...(result.status === 'blocked' ? { reason: result.reason } : { error: result.error })
		})
	}

	await convex.mutation(recordArtifactMemorySyncMutation, {
		artifactId,
		customId: result.customId,
		containerTag: result.containerTag,
		status: result.status,
		lastError: result.status === 'blocked' ? result.reason : result.error
	})

	return result
}
