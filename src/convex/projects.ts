import { v } from 'convex/values'
import { getOptionalAuthUserId, requireAuthUserId } from './authHelpers'
import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'

export const createProject = mutation({
	args: {
		name: v.string(),
		summary: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx)

		const { projectId } = await createProjectRecord(ctx, ownerId, args.name, args.summary)

		return { projectId }
	}
})

export const createProjectFromThread = mutation({
	args: {
		threadId: v.id('chatThreads'),
		name: v.string(),
		summary: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx)
		const thread = await ctx.db.get(args.threadId)

		if (!thread || thread.ownerId !== ownerId) {
			throw new Error('Thread not found')
		}
		if (thread.projectId) {
			throw new Error('Thread already belongs to a project')
		}

		const { projectId, now } = await createProjectRecord(ctx, ownerId, args.name, args.summary)

		await ctx.db.patch(thread._id, {
			scopeType: 'project',
			projectId,
			updatedAt: now
		})

		const links = ctx.db
			.query('threadArtifactLinks')
			.withIndex('by_threadId_and_updatedAt', (q) => q.eq('threadId', thread._id))
			.order('desc')
		let linkedArtifactCount = 0

		for await (const link of links) {
			const artifact = await ctx.db.get(link.artifactId)
			if (!artifact || artifact.ownerId !== ownerId) continue

			await ctx.db.patch(artifact._id, {
				projectId,
				updatedAt: now
			})
			linkedArtifactCount += 1
		}

		return { projectId, linkedArtifactCount }
	}
})

export const listProjects = query({
	args: {},
	handler: async (ctx) => {
		const ownerId = await getOptionalAuthUserId(ctx)
		if (!ownerId) return []

		return await ctx.db
			.query('projects')
			.withIndex('by_ownerId_and_updatedAt', (q) => q.eq('ownerId', ownerId))
			.order('desc')
			.take(50)
	}
})

export const getProject = query({
	args: {
		projectId: v.id('projects')
	},
	handler: async (ctx, args) => {
		const ownerId = await getOptionalAuthUserId(ctx)
		if (!ownerId) return null

		const project = await ctx.db.get(args.projectId)
		if (!project || project.ownerId !== ownerId) return null

		return project
	}
})

async function createProjectRecord(
	ctx: MutationCtx,
	ownerId: Id<'users'>,
	nameInput: string,
	summaryInput?: string
) {
	const name = nameInput.trim()
	const summary = summaryInput?.trim()

	if (!name) {
		throw new Error('Project name is required')
	}

	const now = Date.now()
	const projectId = await ctx.db.insert('projects', {
		ownerId,
		name,
		...(summary ? { summary } : {}),
		createdAt: now,
		updatedAt: now
	})

	return { projectId, now }
}
