import { v } from 'convex/values';
import { ideaAiModels } from '../lib/idea-ai-models';
import { getOptionalAuthUserId, requireAuthUserId } from './authHelpers';
import { dateKeyForMs } from './dateKey';
import { getUserTimeZone } from './activityHelpers';
import { mutation, query } from './_generated/server';

const DEFAULT_DAILY_AI_CAP_USD = 0.5;

const modelCostsPerMillionTokens = Object.fromEntries(
	ideaAiModels.map((model) => [
		model.id,
		{
			input: model.inputCostPerMillionTokens,
			output: model.outputCostPerMillionTokens
		}
	])
);

function estimateCostUsd(params: {
	modelId: string;
	inputTokens?: number;
	outputTokens?: number;
	reasoningTokens?: number;
	cachedInputTokens?: number;
}) {
	const cost = modelCostsPerMillionTokens[params.modelId];
	if (!cost) return 0;

	const inputTokens = params.inputTokens ?? 0;
	const outputTokens = params.outputTokens ?? 0;
	const reasoningTokens = params.reasoningTokens ?? 0;
	const cachedInputTokens = params.cachedInputTokens ?? 0;

	// Conservative: charge cache reads at input price and reasoning at output price.
	const input = inputTokens + cachedInputTokens;
	const output = outputTokens + reasoningTokens;

	return (input / 1_000_000) * cost.input + (output / 1_000_000) * cost.output;
}

export const getAiBudgetStatus = query({
	args: {
		atMs: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const ownerId = await getOptionalAuthUserId(ctx);
		if (!ownerId) {
			return {
				dateKey: dateKeyForMs(Date.now(), 'UTC'),
				capUsd: DEFAULT_DAILY_AI_CAP_USD,
				spentUsd: 0,
				remainingUsd: DEFAULT_DAILY_AI_CAP_USD,
				isOverLimit: false
			};
		}

		const now = args.atMs ?? Date.now();
		const timeZone = await getUserTimeZone(ctx, ownerId);
		const dateKey = dateKeyForMs(now, timeZone);

		const settings = await ctx.db
			.query('userSettings')
			.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
			.unique();
		const capUsd = settings?.dailyAiCapUsd ?? DEFAULT_DAILY_AI_CAP_USD;
		const daily = await ctx.db
			.query('aiDailyUsage')
			.withIndex('by_ownerId_and_dateKey', (q) => q.eq('ownerId', ownerId).eq('dateKey', dateKey))
			.unique();

		const spentUsd = daily?.costUsd ?? 0;
		const remainingUsd = Math.max(0, capUsd - spentUsd);

		return {
			dateKey,
			capUsd,
			spentUsd,
			remainingUsd,
			isOverLimit: spentUsd >= capUsd
		};
	}
});

export const recordAiRun = mutation({
	args: {
		threadId: v.id('chatThreads'),
		modelId: v.string(),
		occurredAt: v.number(),
		usage: v.object({
			inputTokens: v.optional(v.number()),
			outputTokens: v.optional(v.number()),
			reasoningTokens: v.optional(v.number()),
			cachedInputTokens: v.optional(v.number())
		})
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);

		const thread = await ctx.db.get(args.threadId);
		if (!thread || thread.ownerId !== ownerId) {
			throw new Error('Thread not found');
		}

		const timeZone = await getUserTimeZone(ctx, ownerId);
		const dateKey = dateKeyForMs(args.occurredAt, timeZone);
		const costUsd = estimateCostUsd({
			modelId: args.modelId,
			inputTokens: args.usage.inputTokens,
			outputTokens: args.usage.outputTokens,
			reasoningTokens: args.usage.reasoningTokens,
			cachedInputTokens: args.usage.cachedInputTokens
		});

		await ctx.db.insert('aiUsageEvents', {
			ownerId,
			threadId: args.threadId,
			modelId: args.modelId,
			dateKey,
			...(args.usage.inputTokens !== undefined ? { inputTokens: args.usage.inputTokens } : {}),
			...(args.usage.outputTokens !== undefined ? { outputTokens: args.usage.outputTokens } : {}),
			...(args.usage.reasoningTokens !== undefined
				? { reasoningTokens: args.usage.reasoningTokens }
				: {}),
			...(args.usage.cachedInputTokens !== undefined
				? { cachedInputTokens: args.usage.cachedInputTokens }
				: {}),
			costUsd,
			createdAt: args.occurredAt
		});

		const inputTokens = args.usage.inputTokens ?? 0;
		const outputTokens = args.usage.outputTokens ?? 0;
		const reasoningTokens = args.usage.reasoningTokens ?? 0;
		const cachedInputTokens = args.usage.cachedInputTokens ?? 0;

		const existing = await ctx.db
			.query('aiDailyUsage')
			.withIndex('by_ownerId_and_dateKey', (q) => q.eq('ownerId', ownerId).eq('dateKey', dateKey))
			.unique();

		const now = Date.now();
		if (existing) {
			await ctx.db.patch(existing._id, {
				inputTokens: existing.inputTokens + inputTokens,
				outputTokens: existing.outputTokens + outputTokens,
				reasoningTokens: existing.reasoningTokens + reasoningTokens,
				cachedInputTokens: existing.cachedInputTokens + cachedInputTokens,
				costUsd: existing.costUsd + costUsd,
				updatedAt: now
			});
		} else {
			await ctx.db.insert('aiDailyUsage', {
				ownerId,
				dateKey,
				inputTokens,
				outputTokens,
				reasoningTokens,
				cachedInputTokens,
				costUsd,
				createdAt: now,
				updatedAt: now
			});
		}

		return { ok: true as const, costUsd };
	}
});
