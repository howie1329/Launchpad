import type { SavedArtifact } from '$lib/artifacts'
import type { Id } from '../../../convex/_generated/dataModel'
import { getSupermemoryClient } from './client'
import { memoryLog } from './log'
import { validateArtifactForMemory, validateUserMemoryText } from './safety'
import {
	artifactMemoryContainerTag,
	artifactMemoryCustomId,
	legacyProjectMemoryContainerTag,
	legacyUserMemoryContainerTag,
	projectMemoryContainerTag,
	safeTagPart,
	userMemoryContainerTag
} from './tags'
import { errorMessage, withTimeout } from './fallback'

const DELETE_TIMEOUT_MS = 5_000
const ADD_TIMEOUT_MS = 30_000

type MemoryMetadata = Record<string, string | number | boolean | Array<string>>

export type ArtifactSyncResult =
	| {
			status: 'synced'
			customId: string
			containerTag: string
			documentId: string
	  }
	| {
			status: 'blocked'
			customId: string
			containerTag: string
			reason: string
	  }
	| {
			status: 'disabled'
			customId: string
			containerTag: string
	  }
	| {
			status: 'failed'
			customId: string
			containerTag: string
			error: string
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
	].join('\n')
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
	}
}

export async function deleteSupermemoryDocument(documentId: string): Promise<{ ok: true } | { ok: false; error: string }> {
	const sm = getSupermemoryClient()
	if (!sm) return { ok: false, error: 'Supermemory is not configured.' }

	try {
		await withTimeout(sm.documents.delete(documentId), DELETE_TIMEOUT_MS)
		memoryLog('supermemory.document_deleted', { documentId: documentId.slice(0, 12) })
		return { ok: true }
	} catch (error) {
		const msg = errorMessage(error)
		memoryLog('supermemory.document_delete_failed', { documentId: documentId.slice(0, 12), error: msg }, 'warn')
		return { ok: false, error: msg }
	}
}

export async function syncArtifactToSupermemory(
	artifact: SavedArtifact,
	existingDocumentId: string | undefined,
	options?: { previousSyncedContainerTag?: string }
): Promise<ArtifactSyncResult> {
	const customId = artifactMemoryCustomId(artifact._id)
	const containerTag = artifactMemoryContainerTag(artifact)
	const safety = validateArtifactForMemory(artifact)

	if (!safety.ok) {
		return {
			status: 'blocked',
			customId,
			containerTag,
			reason: safety.reason
		}
	}

	const sm = getSupermemoryClient()
	if (!sm) {
		return { status: 'disabled', customId, containerTag }
	}

	const prevTag = options?.previousSyncedContainerTag
	let docIdToUpdate = existingDocumentId
	if (prevTag && prevTag !== containerTag && existingDocumentId) {
		const del = await deleteSupermemoryDocument(existingDocumentId)
		if (!del.ok) {
			memoryLog('supermemory.container_change_delete_failed', {
				artifactId: String(artifact._id).slice(0, 8),
				error: del.error
			}, 'warn')
		}
		docIdToUpdate = undefined
	}

	const body = {
		content: formatArtifactMemoryContent(artifact),
		containerTags: [containerTag],
		customId,
		metadata: artifactMemoryMetadata(artifact)
	}

	try {
		const response = docIdToUpdate
			? await withTimeout(sm.documents.update(docIdToUpdate, body), ADD_TIMEOUT_MS)
			: await withTimeout(sm.add(body), ADD_TIMEOUT_MS)

		return {
			status: 'synced',
			customId,
			containerTag,
			documentId: response.id
		}
	} catch (error) {
		if (!docIdToUpdate) {
			try {
				const response = await withTimeout(sm.documents.update(customId, body), ADD_TIMEOUT_MS)
				return {
					status: 'synced',
					customId,
					containerTag,
					documentId: response.id
				}
			} catch {
				// fall through
			}
		}

		return {
			status: 'failed',
			customId,
			containerTag,
			error: errorMessage(error)
		}
	}
}

export type AddUserMemoryResult =
	| { status: 'synced'; documentId: string; containerTag: string }
	| { status: 'blocked'; reason: string }
	| { status: 'disabled' }
	| { status: 'failed'; error: string }

export async function addUserMemoryDocument(args: {
	ownerId: Id<'users'>
	projectId?: Id<'projects'>
	threadId: Id<'chatThreads'>
	text: string
}): Promise<AddUserMemoryResult> {
	const safety = validateUserMemoryText(args.text)
	if (!safety.ok) {
		return { status: 'blocked', reason: safety.reason }
	}

	const sm = getSupermemoryClient()
	if (!sm) return { status: 'disabled' }

	const containerTag = args.projectId
		? projectMemoryContainerTag(args.projectId)
		: userMemoryContainerTag(args.ownerId)

	const customId = `user-note:${safeTagPart(String(args.threadId))}:${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
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
	}

	try {
		const response = await withTimeout(sm.add(body), ADD_TIMEOUT_MS)
		memoryLog('supermemory.user_memory_added', {
			containerTag,
			threadId: String(args.threadId).slice(0, 8)
		})
		return { status: 'synced', documentId: response.id, containerTag }
	} catch (error) {
		return { status: 'failed', error: errorMessage(error) }
	}
}

export async function assertDocumentForgettable(args: {
	documentId: string
	ownerId: Id<'users'>
	projectId?: Id<'projects'>
}): Promise<{ ok: true } | { ok: false; reason: string }> {
	const sm = getSupermemoryClient()
	if (!sm) return { ok: false, reason: 'Supermemory is not configured.' }

	try {
		const doc = await withTimeout(sm.documents.get(args.documentId), DELETE_TIMEOUT_MS)
		const allowedTags = new Set([
			userMemoryContainerTag(args.ownerId),
			legacyUserMemoryContainerTag(args.ownerId),
			...(args.projectId
				? [projectMemoryContainerTag(args.projectId), legacyProjectMemoryContainerTag(args.projectId)]
				: [])
		])
		const tags = doc.containerTags ?? []
		const tagOk = tags.some((t) => allowedTags.has(t))
		if (!tagOk) {
			return { ok: false, reason: 'Document is outside this workspace scope.' }
		}

		const meta = doc.metadata
		const ownerFromMeta =
			meta && typeof meta === 'object' && !Array.isArray(meta) && 'ownerId' in meta
				? String((meta as { ownerId?: unknown }).ownerId ?? '')
				: ''
		if (ownerFromMeta && ownerFromMeta !== args.ownerId) {
			return { ok: false, reason: 'Document owner does not match.' }
		}

		return { ok: true }
	} catch {
		return { ok: false, reason: 'Document not found or inaccessible.' }
	}
}
