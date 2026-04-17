import { v } from 'convex/values';
import { getOptionalAuthUserId, requireAuthUserId } from './authHelpers';
import { mutation, query } from './_generated/server';

const schemaVersion = 1;

const prdOutput = v.object({
	problemStatement: v.string(),
	targetUser: v.string(),
	mustHaveFeatures: v.array(v.string()),
	outOfScope: v.array(v.string()),
	suggestedStack: v.string(),
	fullMVPPlan: v.string(),
	projectType: v.string()
});

const saveArgs = {
	idea: v.string(),
	appType: v.string(),
	projectType: v.string(),
	preferredStack: v.string(),
	output: prdOutput
};

export const listPrds = query({
	args: {},
	handler: async (ctx) => {
		const ownerId = await getOptionalAuthUserId(ctx);
		if (!ownerId) return [];

		return await ctx.db
			.query('prds')
			.withIndex('by_ownerId_and_updatedAt', (q) => q.eq('ownerId', ownerId))
			.order('desc')
			.take(50);
	}
});

export const getPrd = query({
	args: {
		prdId: v.id('prds')
	},
	handler: async (ctx, args) => {
		const ownerId = await getOptionalAuthUserId(ctx);
		if (!ownerId) return null;

		const prd = await ctx.db.get(args.prdId);
		if (!prd || prd.ownerId !== ownerId) return null;

		const latestGeneration = await ctx.db
			.query('prdGenerations')
			.withIndex('by_prdId_and_version', (q) =>
				q.eq('prdId', args.prdId).eq('version', prd.latestVersion)
			)
			.unique();

		return {
			prd,
			latestGeneration
		};
	}
});

export const listPrdGenerations = query({
	args: {
		prdId: v.id('prds')
	},
	handler: async (ctx, args) => {
		const ownerId = await getOptionalAuthUserId(ctx);
		if (!ownerId) return [];

		const prd = await ctx.db.get(args.prdId);
		if (!prd || prd.ownerId !== ownerId) return [];

		return await ctx.db
			.query('prdGenerations')
			.withIndex('by_prdId_and_version', (q) => q.eq('prdId', args.prdId))
			.order('desc')
			.take(50);
	}
});

export const getPrdGeneration = query({
	args: {
		generationId: v.id('prdGenerations')
	},
	handler: async (ctx, args) => {
		const ownerId = await getOptionalAuthUserId(ctx);
		if (!ownerId) return null;

		const generation = await ctx.db.get(args.generationId);
		if (!generation || generation.ownerId !== ownerId) return null;

		return generation;
	}
});

export const saveNewPrd = mutation({
	args: saveArgs,
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const now = Date.now();
		const version = 1;
		const title = createTitle(args.idea);

		const prdId = await ctx.db.insert('prds', {
			ownerId,
			title,
			latestVersion: version,
			latestIdea: args.idea,
			latestAppType: args.appType,
			latestProjectType: args.projectType,
			latestPreferredStack: args.preferredStack,
			createdAt: now,
			updatedAt: now
		});

		const generationId = await ctx.db.insert('prdGenerations', {
			prdId,
			ownerId,
			version,
			schemaVersion,
			idea: args.idea,
			appType: args.appType,
			projectType: args.projectType,
			preferredStack: args.preferredStack,
			output: args.output,
			createdAt: now
		});

		return {
			prdId,
			generationId,
			version
		};
	}
});

export const savePrdGeneration = mutation({
	args: {
		prdId: v.id('prds'),
		...saveArgs
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const prd = await ctx.db.get(args.prdId);

		if (!prd || prd.ownerId !== ownerId) {
			throw new Error('PRD not found');
		}

		const now = Date.now();
		const version = prd.latestVersion + 1;

		await ctx.db.patch(args.prdId, {
			title: createTitle(args.idea),
			latestVersion: version,
			latestIdea: args.idea,
			latestAppType: args.appType,
			latestProjectType: args.projectType,
			latestPreferredStack: args.preferredStack,
			updatedAt: now
		});

		const generationId = await ctx.db.insert('prdGenerations', {
			prdId: args.prdId,
			ownerId,
			version,
			schemaVersion,
			idea: args.idea,
			appType: args.appType,
			projectType: args.projectType,
			preferredStack: args.preferredStack,
			output: args.output,
			createdAt: now
		});

		return {
			prdId: args.prdId,
			generationId,
			version
		};
	}
});

function createTitle(idea: string) {
	const firstLine = idea.trim().split('\n')[0]?.trim() ?? '';
	if (!firstLine) return 'Untitled PRD';
	return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
}
