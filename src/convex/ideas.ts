import { query } from './_generated/server';
import type { QueryCtx } from './_generated/server';

export const listIdeas = query({
	args: {},
	handler: async (ctx) => {
		const ownerId = await getOwnerId(ctx);
		if (!ownerId) return [];

		return await ctx.db
			.query('ideas')
			.withIndex('by_ownerId_and_updatedAt', (q) => q.eq('ownerId', ownerId))
			.order('desc')
			.take(50);
	}
});

async function getOwnerId(ctx: QueryCtx) {
	const identity = await ctx.auth.getUserIdentity();
	return identity?.tokenIdentifier ?? null;
}
