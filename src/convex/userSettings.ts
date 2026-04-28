import { v } from 'convex/values';
import { getOptionalAuthUserId, requireAuthUserId } from './authHelpers';
import { mutation, query } from './_generated/server';
import { safeTimeZone } from './dateKey';

const DEFAULT_DAILY_AI_CAP_USD = 0.5;
const MAX_AI_PREFERENCE_CHARS = 2000;

export const getMine = query({
	args: {},
	handler: async (ctx) => {
		const ownerId = await getOptionalAuthUserId(ctx);
		if (!ownerId) return null;

		return await ctx.db
			.query('userSettings')
			.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
			.unique();
	}
});

function normalizedAiPreference(value: string) {
	const trimmed = value.trim();
	if (trimmed.length > MAX_AI_PREFERENCE_CHARS) {
		throw new Error(`Text must be at most ${MAX_AI_PREFERENCE_CHARS} characters.`);
	}
	return trimmed;
}

export const upsertMine = mutation({
	args: {
		timeZone: v.string(),
		dailyAiCapUsd: v.optional(v.number()),
		aiContextMarkdown: v.optional(v.string()),
		aiBehaviorMarkdown: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const timeZone = safeTimeZone(args.timeZone.trim());
		const dailyAiCapUsd =
			args.dailyAiCapUsd === undefined ? undefined : Math.max(0, args.dailyAiCapUsd);

		const aiContextMarkdown =
			args.aiContextMarkdown === undefined
				? undefined
				: normalizedAiPreference(args.aiContextMarkdown);
		const aiBehaviorMarkdown =
			args.aiBehaviorMarkdown === undefined
				? undefined
				: normalizedAiPreference(args.aiBehaviorMarkdown);

		const now = Date.now();
		const existing = await ctx.db
			.query('userSettings')
			.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, {
				timeZone,
				...(dailyAiCapUsd !== undefined ? { dailyAiCapUsd } : {}),
				...(aiContextMarkdown !== undefined ? { aiContextMarkdown } : {}),
				...(aiBehaviorMarkdown !== undefined ? { aiBehaviorMarkdown } : {}),
				updatedAt: now
			});

			return { ok: true as const };
		}

		await ctx.db.insert('userSettings', {
			ownerId,
			timeZone,
			dailyAiCapUsd: dailyAiCapUsd ?? DEFAULT_DAILY_AI_CAP_USD,
			...(aiContextMarkdown !== undefined ? { aiContextMarkdown } : {}),
			...(aiBehaviorMarkdown !== undefined ? { aiBehaviorMarkdown } : {}),
			createdAt: now,
			updatedAt: now
		});

		return { ok: true as const };
	}
});
