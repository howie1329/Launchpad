import { v } from 'convex/values'
import { getOptionalAuthUserId, requireAuthUserId } from './authHelpers'
import { logActivityEvent } from './activityHelpers'
import { mutation, query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

const metadataValue = v.record(v.string(), v.any())
const linkReasonValue = v.union(v.literal('referenced'), v.literal('imported'))

export const createArtifact = mutation({
	args: {
		type: v.string(),
		title: v.string(),
		contentMarkdown: v.string(),
		metadata: v.optional(metadataValue),
		projectId: v.optional(v.id('projects')),
		sourceThreadId: v.optional(v.id('chatThreads'))
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx)
		const type = args.type.trim()
		const title = args.title.trim()
		const contentMarkdown = args.contentMarkdown

		if (!type) {
			throw new Error('Artifact type is required')
		}
		if (!title) {
			throw new Error('Artifact title is required')
		}
		if (!contentMarkdown.trim()) {
			throw new Error('Artifact content is required')
		}

		const sourceThread = args.sourceThreadId
			? await getOwnedThread(ctx, args.sourceThreadId, ownerId)
			: null
		const projectId = await resolveProjectId(ctx, ownerId, args.projectId, sourceThread)
		const now = Date.now()
		const artifactId = await ctx.db.insert('artifacts', {
			ownerId,
			type,
			title,
			contentMarkdown,
			contentFormat: 'markdown',
			...(args.metadata ? { metadata: args.metadata } : {}),
			...(projectId ? { projectId } : {}),
			...(args.sourceThreadId ? { sourceThreadId: args.sourceThreadId } : {}),
			createdAt: now,
			updatedAt: now
		})

		if (args.sourceThreadId) {
			await upsertThreadArtifactLink(ctx, ownerId, args.sourceThreadId, artifactId, 'created', now)
		}

		await logActivityEvent(ctx, {
			ownerId,
			eventType: 'artifact_created',
			metadata: {
				artifactId,
				artifactType: type,
				...(projectId ? { projectId } : {}),
				...(args.sourceThreadId ? { threadId: args.sourceThreadId } : {})
			},
			occurredAtMs: now
		})

		return { artifactId }
	}
})

export const listArtifacts = query({
	args: {},
	handler: async (ctx) => {
		const ownerId = await getOptionalAuthUserId(ctx)
		if (!ownerId) return []

		return await ctx.db
			.query('artifacts')
			.withIndex('by_ownerId_and_updatedAt', (q) => q.eq('ownerId', ownerId))
			.order('desc')
			.take(200)
	}
})

export const listProjectArtifacts = query({
	args: {
		projectId: v.id('projects')
	},
	handler: async (ctx, args) => {
		const ownerId = await getOptionalAuthUserId(ctx)
		if (!ownerId) return []

		await getOwnedProject(ctx, args.projectId, ownerId)

		return await ctx.db
			.query('artifacts')
			.withIndex('by_projectId_and_updatedAt', (q) => q.eq('projectId', args.projectId))
			.order('desc')
			.take(100)
	}
})

export const listThreadArtifacts = query({
	args: {
		threadId: v.id('chatThreads')
	},
	handler: async (ctx, args) => {
		const ownerId = await getOptionalAuthUserId(ctx)
		if (!ownerId) return []

		await getOwnedThread(ctx, args.threadId, ownerId)

		const links = await ctx.db
			.query('threadArtifactLinks')
			.withIndex('by_threadId_and_updatedAt', (q) => q.eq('threadId', args.threadId))
			.order('desc')
			.take(100)
		const rows = []

		for (const link of links) {
			const artifact = await ctx.db.get(link.artifactId)
			if (artifact && artifact.ownerId === ownerId) {
				rows.push({ link, artifact })
			}
		}

		return rows
	}
})

export const getArtifact = query({
	args: {
		artifactId: v.id('artifacts')
	},
	handler: async (ctx, args) => {
		const ownerId = await getOptionalAuthUserId(ctx)
		if (!ownerId) return null

		const artifact = await ctx.db.get(args.artifactId)
		if (!artifact || artifact.ownerId !== ownerId) return null

		return artifact
	}
})

export const updateArtifact = mutation({
	args: {
		artifactId: v.id('artifacts'),
		title: v.optional(v.string()),
		contentMarkdown: v.optional(v.string()),
		metadata: v.optional(v.union(metadataValue, v.null())),
		projectId: v.optional(v.union(v.id('projects'), v.null()))
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx)
		const artifact = await getOwnedArtifact(ctx, args.artifactId, ownerId)
		const now = Date.now()
		const patch: Partial<Doc<'artifacts'>> = { updatedAt: now }

		if (args.title !== undefined) {
			const title = args.title.trim()
			if (!title) {
				throw new Error('Artifact title is required')
			}
			patch.title = title
		}
		if (args.contentMarkdown !== undefined) {
			if (!args.contentMarkdown.trim()) {
				throw new Error('Artifact content is required')
			}
			patch.contentMarkdown = args.contentMarkdown
		}
		if (args.metadata !== undefined) {
			patch.metadata = args.metadata ?? undefined
		}
		if (args.projectId !== undefined) {
			if (args.projectId) {
				await getOwnedProject(ctx, args.projectId, ownerId)
			}
			patch.projectId = args.projectId ?? undefined
		}

		await ctx.db.patch(artifact._id, patch)

		return { ok: true as const }
	}
})

export const deleteArtifact = mutation({
	args: {
		artifactId: v.id('artifacts')
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx)
		await getOwnedArtifact(ctx, args.artifactId, ownerId)

		const links = await ctx.db
			.query('threadArtifactLinks')
			.withIndex('by_artifactId_and_updatedAt', (q) => q.eq('artifactId', args.artifactId))
			.collect()
		for (const link of links) {
			await ctx.db.delete(link._id)
		}

		const drafts = await ctx.db
			.query('artifactDraftChanges')
			.withIndex('by_artifactId_and_updatedAt', (q) => q.eq('artifactId', args.artifactId))
			.collect()
		for (const draft of drafts) {
			await ctx.db.delete(draft._id)
		}

		const memoryRow = await ctx.db
			.query('memorySyncs')
			.withIndex('by_sourceType_and_sourceId', (q) =>
				q.eq('sourceType', 'artifact').eq('sourceId', args.artifactId)
			)
			.unique()
		if (memoryRow) {
			await ctx.db.delete(memoryRow._id)
		}

		await ctx.db.delete(args.artifactId)

		const now = Date.now()
		await logActivityEvent(ctx, {
			ownerId,
			eventType: 'artifact_deleted',
			metadata: {
				artifactId: args.artifactId
			},
			occurredAtMs: now
		})

		return { ok: true as const }
	}
})

export const linkArtifactToThread = mutation({
	args: {
		threadId: v.id('chatThreads'),
		artifactId: v.id('artifacts'),
		reason: linkReasonValue
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx)

		await getOwnedThread(ctx, args.threadId, ownerId)
		await getOwnedArtifact(ctx, args.artifactId, ownerId)
		await upsertThreadArtifactLink(
			ctx,
			ownerId,
			args.threadId,
			args.artifactId,
			args.reason,
			Date.now()
		)

		return { ok: true as const }
	}
})

export const createArtifactDraftChange = mutation({
	args: {
		artifactId: v.id('artifacts'),
		threadId: v.optional(v.id('chatThreads')),
		proposedTitle: v.string(),
		proposedContentMarkdown: v.string(),
		summary: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx)
		const proposedTitle = args.proposedTitle.trim()
		const proposedContentMarkdown = args.proposedContentMarkdown
		const summary = args.summary?.trim()

		await getOwnedArtifact(ctx, args.artifactId, ownerId)
		if (args.threadId) {
			await getOwnedThread(ctx, args.threadId, ownerId)
		}
		if (!proposedTitle) {
			throw new Error('Proposed title is required')
		}
		if (!proposedContentMarkdown.trim()) {
			throw new Error('Proposed content is required')
		}

		const now = Date.now()
		const draftChangeId = await ctx.db.insert('artifactDraftChanges', {
			ownerId,
			artifactId: args.artifactId,
			...(args.threadId ? { threadId: args.threadId } : {}),
			proposedTitle,
			proposedContentMarkdown,
			...(summary ? { summary } : {}),
			status: 'pending',
			createdAt: now,
			updatedAt: now
		})

		await logActivityEvent(ctx, {
			ownerId,
			eventType: 'draft_proposed',
			metadata: {
				draftChangeId,
				artifactId: args.artifactId,
				...(args.threadId ? { threadId: args.threadId } : {})
			},
			occurredAtMs: now
		})

		return { draftChangeId }
	}
})

export const listArtifactDraftChanges = query({
	args: {
		artifactId: v.id('artifacts')
	},
	handler: async (ctx, args) => {
		const ownerId = await getOptionalAuthUserId(ctx)
		if (!ownerId) return []

		await getOwnedArtifact(ctx, args.artifactId, ownerId)

		return await ctx.db
			.query('artifactDraftChanges')
			.withIndex('by_artifactId_and_updatedAt', (q) => q.eq('artifactId', args.artifactId))
			.order('desc')
			.take(50)
	}
})

export const listThreadDraftChanges = query({
	args: {
		threadId: v.id('chatThreads')
	},
	handler: async (ctx, args) => {
		const ownerId = await getOptionalAuthUserId(ctx)
		if (!ownerId) return []

		await getOwnedThread(ctx, args.threadId, ownerId)

		const links = await ctx.db
			.query('threadArtifactLinks')
			.withIndex('by_threadId_and_updatedAt', (q) => q.eq('threadId', args.threadId))
			.order('desc')
			.take(100)
		const threadArtifactIds = new Set(links.map((link) => link.artifactId))
		const draftChanges = await ctx.db
			.query('artifactDraftChanges')
			.withIndex('by_ownerId_and_updatedAt', (q) => q.eq('ownerId', ownerId))
			.order('desc')
			.take(100)
		const rows = []

		for (const draftChange of draftChanges) {
			if (draftChange.status !== 'pending') continue
			if (draftChange.threadId !== args.threadId) continue
			if (!threadArtifactIds.has(draftChange.artifactId)) continue

			const artifact = await ctx.db.get(draftChange.artifactId)
			if (artifact && artifact.ownerId === ownerId) {
				rows.push({ draftChange, artifact })
			}
		}

		return rows
	}
})

export const applyArtifactDraftChange = mutation({
	args: {
		draftChangeId: v.id('artifactDraftChanges')
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx)
		const draftChange = await getOwnedDraftChange(ctx, args.draftChangeId, ownerId)

		if (draftChange.status !== 'pending') {
			throw new Error('Draft change is not pending')
		}

		const artifact = await getOwnedArtifact(ctx, draftChange.artifactId, ownerId)
		const now = Date.now()

		await ctx.db.patch(artifact._id, {
			title: draftChange.proposedTitle,
			contentMarkdown: draftChange.proposedContentMarkdown,
			updatedAt: now
		})
		await ctx.db.patch(draftChange._id, {
			status: 'applied',
			appliedAt: now,
			updatedAt: now
		})

		await logActivityEvent(ctx, {
			ownerId,
			eventType: 'draft_applied',
			metadata: {
				draftChangeId: draftChange._id,
				artifactId: draftChange.artifactId,
				...(draftChange.threadId ? { threadId: draftChange.threadId } : {})
			},
			occurredAtMs: now
		})

		return { ok: true as const }
	}
})

export const discardArtifactDraftChange = mutation({
	args: {
		draftChangeId: v.id('artifactDraftChanges')
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx)
		const draftChange = await getOwnedDraftChange(ctx, args.draftChangeId, ownerId)

		if (draftChange.status !== 'pending') {
			throw new Error('Draft change is not pending')
		}

		const now = Date.now()

		await ctx.db.patch(draftChange._id, {
			status: 'discarded',
			discardedAt: now,
			updatedAt: now
		})

		await logActivityEvent(ctx, {
			ownerId,
			eventType: 'draft_discarded',
			metadata: {
				draftChangeId: draftChange._id,
				artifactId: draftChange.artifactId,
				...(draftChange.threadId ? { threadId: draftChange.threadId } : {})
			},
			occurredAtMs: now
		})

		return { ok: true as const }
	}
})

async function resolveProjectId(
	ctx: QueryCtx | MutationCtx,
	ownerId: Id<'users'>,
	projectId: Id<'projects'> | undefined,
	sourceThread: Doc<'chatThreads'> | null
) {
	if (projectId) {
		await getOwnedProject(ctx, projectId, ownerId)
	}

	if (sourceThread?.projectId && projectId && sourceThread.projectId !== projectId) {
		throw new Error('Artifact project must match source thread project')
	}

	return projectId ?? sourceThread?.projectId
}

async function upsertThreadArtifactLink(
	ctx: MutationCtx,
	ownerId: Id<'users'>,
	threadId: Id<'chatThreads'>,
	artifactId: Id<'artifacts'>,
	reason: 'created' | 'referenced' | 'imported',
	now: number
) {
	const existing = await ctx.db
		.query('threadArtifactLinks')
		.withIndex('by_threadId_and_artifactId', (q) =>
			q.eq('threadId', threadId).eq('artifactId', artifactId)
		)
		.unique()

	if (existing) {
		await ctx.db.patch(existing._id, {
			reason,
			updatedAt: now
		})
		return existing._id
	}

	return await ctx.db.insert('threadArtifactLinks', {
		ownerId,
		threadId,
		artifactId,
		reason,
		createdAt: now,
		updatedAt: now
	})
}

async function getOwnedProject(
	ctx: QueryCtx | MutationCtx,
	projectId: Id<'projects'>,
	ownerId: Id<'users'>
) {
	const project = await ctx.db.get(projectId)
	if (!project || project.ownerId !== ownerId) {
		throw new Error('Project not found')
	}

	return project
}

async function getOwnedThread(
	ctx: QueryCtx | MutationCtx,
	threadId: Id<'chatThreads'>,
	ownerId: Id<'users'>
) {
	const thread = await ctx.db.get(threadId)
	if (!thread || thread.ownerId !== ownerId) {
		throw new Error('Thread not found')
	}

	return thread
}

async function getOwnedArtifact(
	ctx: QueryCtx | MutationCtx,
	artifactId: Id<'artifacts'>,
	ownerId: Id<'users'>
) {
	const artifact = await ctx.db.get(artifactId)
	if (!artifact || artifact.ownerId !== ownerId) {
		throw new Error('Artifact not found')
	}

	return artifact
}

async function getOwnedDraftChange(
	ctx: QueryCtx | MutationCtx,
	draftChangeId: Id<'artifactDraftChanges'>,
	ownerId: Id<'users'>
) {
	const draftChange = await ctx.db.get(draftChangeId)
	if (!draftChange || draftChange.ownerId !== ownerId) {
		throw new Error('Draft change not found')
	}

	return draftChange
}
