import { v } from 'convex/values';
import { getOptionalAuthUserId, requireAuthUserId } from './authHelpers';
import { mutation, query } from './_generated/server';

const memorySyncStatus = v.union(v.literal('synced'), v.literal('blocked'), v.literal('failed'));

export const getArtifactMemorySync = query({
	args: {
		artifactId: v.id('artifacts')
	},
	handler: async (ctx, args) => {
		const ownerId = await getOptionalAuthUserId(ctx);
		if (!ownerId) return null;

		const artifact = await ctx.db.get(args.artifactId);
		if (!artifact || artifact.ownerId !== ownerId) return null;

		return await ctx.db
			.query('memorySyncs')
			.withIndex('by_sourceType_and_sourceId', (q) =>
				q.eq('sourceType', 'artifact').eq('sourceId', args.artifactId)
			)
			.unique();
	}
});

export const recordArtifactMemorySync = mutation({
	args: {
		artifactId: v.id('artifacts'),
		customId: v.string(),
		containerTag: v.string(),
		supermemoryDocumentId: v.optional(v.string()),
		status: memorySyncStatus,
		lastError: v.optional(v.string()),
		lastSyncedAt: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const artifact = await ctx.db.get(args.artifactId);
		if (!artifact || artifact.ownerId !== ownerId) {
			throw new Error('Artifact not found');
		}

		const now = Date.now();
		const existing = await ctx.db
			.query('memorySyncs')
			.withIndex('by_sourceType_and_sourceId', (q) =>
				q.eq('sourceType', 'artifact').eq('sourceId', args.artifactId)
			)
			.unique();
		const patch = {
			ownerId,
			sourceType: 'artifact' as const,
			sourceId: args.artifactId,
			artifactId: args.artifactId,
			...(artifact.projectId ? { projectId: artifact.projectId } : {}),
			...(artifact.sourceThreadId ? { threadId: artifact.sourceThreadId } : {}),
			customId: args.customId,
			containerTag: args.containerTag,
			...(args.supermemoryDocumentId ? { supermemoryDocumentId: args.supermemoryDocumentId } : {}),
			status: args.status,
			...(args.lastError ? { lastError: args.lastError.slice(0, 1000) } : { lastError: undefined }),
			...(args.lastSyncedAt ? { lastSyncedAt: args.lastSyncedAt } : {}),
			updatedAt: now
		};

		if (existing) {
			await ctx.db.patch(existing._id, patch);
			return { ok: true as const };
		}

		await ctx.db.insert('memorySyncs', {
			...patch,
			createdAt: now
		});

		return { ok: true as const };
	}
});
