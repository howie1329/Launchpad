import { v } from 'convex/values';
import { getOptionalAuthUserId, requireAuthUserId } from './authHelpers';
import { mutation, query } from './_generated/server';

export const createProject = mutation({
	args: {
		name: v.string(),
		summary: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const name = args.name.trim();
		const summary = args.summary?.trim();

		if (!name) {
			throw new Error('Project name is required');
		}

		const now = Date.now();
		const projectId = await ctx.db.insert('projects', {
			ownerId,
			name,
			...(summary ? { summary } : {}),
			createdAt: now,
			updatedAt: now
		});

		return { projectId };
	}
});

export const listProjects = query({
	args: {},
	handler: async (ctx) => {
		const ownerId = await getOptionalAuthUserId(ctx);
		if (!ownerId) return [];

		return await ctx.db
			.query('projects')
			.withIndex('by_ownerId_and_updatedAt', (q) => q.eq('ownerId', ownerId))
			.order('desc')
			.take(50);
	}
});

export const getProject = query({
	args: {
		projectId: v.id('projects')
	},
	handler: async (ctx, args) => {
		const ownerId = await getOptionalAuthUserId(ctx);
		if (!ownerId) return null;

		const project = await ctx.db.get(args.projectId);
		if (!project || project.ownerId !== ownerId) return null;

		return project;
	}
});
