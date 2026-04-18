import { v } from 'convex/values'
import { getOptionalAuthUserId } from './authHelpers'
import { query } from './_generated/server'

export const listMine = query({
	args: {
		limit: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const ownerId = await getOptionalAuthUserId(ctx)
		if (!ownerId) return []

		const limit = Math.max(1, Math.min(200, args.limit ?? 200))

		return await ctx.db
			.query('activityEvents')
			.withIndex('by_ownerId_and_createdAt', (q) => q.eq('ownerId', ownerId))
			.order('desc')
			.take(limit)
	}
})

