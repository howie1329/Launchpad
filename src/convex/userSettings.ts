import { v } from 'convex/values'
import { getOptionalAuthUserId, requireAuthUserId } from './authHelpers'
import { mutation, query } from './_generated/server'
import { safeTimeZone } from './dateKey'

const DEFAULT_DAILY_AI_CAP_USD = 0.5

export const getMine = query({
	args: {},
	handler: async (ctx) => {
		const ownerId = await getOptionalAuthUserId(ctx)
		if (!ownerId) return null

		return await ctx.db
			.query('userSettings')
			.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
			.unique()
	}
})

export const upsertMine = mutation({
	args: {
		timeZone: v.string(),
		dailyAiCapUsd: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx)
		const timeZone = safeTimeZone(args.timeZone.trim())
		const dailyAiCapUsd =
			args.dailyAiCapUsd === undefined ? undefined : Math.max(0, args.dailyAiCapUsd)

		const now = Date.now()
		const existing = await ctx.db
			.query('userSettings')
			.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
			.unique()

		if (existing) {
			await ctx.db.patch(existing._id, {
				timeZone,
				...(dailyAiCapUsd !== undefined ? { dailyAiCapUsd } : {}),
				updatedAt: now
			})

			return { ok: true as const }
		}

		await ctx.db.insert('userSettings', {
			ownerId,
			timeZone,
			dailyAiCapUsd: dailyAiCapUsd ?? DEFAULT_DAILY_AI_CAP_USD,
			createdAt: now,
			updatedAt: now
		})

		return { ok: true as const }
	}
})
