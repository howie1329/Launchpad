import { v } from 'convex/values';
import { ideaAiModels } from '../lib/idea-ai-models';
import { getOptionalAuthUserId, requireAuthUserId } from './authHelpers';
import { dateKeyForMs } from './dateKey';
import { getUserTimeZone } from './activityHelpers';
import { internalMutation, internalQuery, mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

const DEFAULT_DAILY_AI_CAP_USD = 0.5;
const aiUsageSourceKindValue = v.union(
	v.literal('chatThread'),
	v.literal('externalContextImportDraft')
);
const aiUsageValue = v.object({
	inputTokens: v.optional(v.number()),
	outputTokens: v.optional(v.number()),
	reasoningTokens: v.optional(v.number()),
	cachedInputTokens: v.optional(v.number())
});

type AiUsageSourceKind = 'chatThread' | 'externalContextImportDraft';
type AiUsage = {
	inputTokens?: number;
	outputTokens?: number;
	reasoningTokens?: number;
	cachedInputTokens?: number;
};

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

export const getAiBudgetStatusForOwner = internalQuery({
	args: {
		ownerId: v.id('users'),
		atMs: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		return await getAiBudgetStatusForOwnerImpl(ctx, args.ownerId, args.atMs ?? Date.now());
	}
});

export const recordAiRun = mutation({
	args: {
		threadId: v.id('chatThreads'),
		modelId: v.string(),
		occurredAt: v.number(),
		usage: aiUsageValue
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);

		const thread = await ctx.db.get(args.threadId);
		if (!thread || thread.ownerId !== ownerId) {
			throw new Error('Thread not found');
		}

		const result = await recordAiRunForOwnerImpl(ctx, {
			ownerId,
			modelId: args.modelId,
			occurredAt: args.occurredAt,
			sourceKind: 'chatThread',
			sourceId: args.threadId,
			threadId: args.threadId,
			usage: args.usage
		});

		return { ok: true as const, costUsd: result.costUsd };
	}
});

export const recordAiRunForOwner = internalMutation({
	args: {
		ownerId: v.id('users'),
		modelId: v.string(),
		occurredAt: v.number(),
		sourceKind: aiUsageSourceKindValue,
		sourceId: v.string(),
		usage: aiUsageValue
	},
	handler: async (ctx, args) => {
		const result = await recordAiRunForOwnerImpl(ctx, {
			ownerId: args.ownerId,
			modelId: args.modelId,
			occurredAt: args.occurredAt,
			sourceKind: args.sourceKind,
			sourceId: args.sourceId,
			usage: args.usage
		});

		return { ok: true as const, costUsd: result.costUsd };
	}
});

async function getAiBudgetStatusForOwnerImpl(ctx: QueryCtx, ownerId: Id<'users'>, now: number) {
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

async function recordAiRunForOwnerImpl(
	ctx: MutationCtx,
	params: {
		ownerId: Id<'users'>;
		modelId: string;
		occurredAt: number;
		sourceKind: AiUsageSourceKind;
		sourceId: string;
		threadId?: Id<'chatThreads'>;
		usage: AiUsage;
	}
) {
	const timeZone = await getUserTimeZone(ctx, params.ownerId);
	const dateKey = dateKeyForMs(params.occurredAt, timeZone);
	const costUsd = estimateCostUsd({
		modelId: params.modelId,
		inputTokens: params.usage.inputTokens,
		outputTokens: params.usage.outputTokens,
		reasoningTokens: params.usage.reasoningTokens,
		cachedInputTokens: params.usage.cachedInputTokens
	});

	await ctx.db.insert('aiUsageEvents', {
		ownerId: params.ownerId,
		...(params.threadId ? { threadId: params.threadId } : {}),
		sourceKind: params.sourceKind,
		sourceId: params.sourceId,
		modelId: params.modelId,
		dateKey,
		...(params.usage.inputTokens !== undefined ? { inputTokens: params.usage.inputTokens } : {}),
		...(params.usage.outputTokens !== undefined ? { outputTokens: params.usage.outputTokens } : {}),
		...(params.usage.reasoningTokens !== undefined
			? { reasoningTokens: params.usage.reasoningTokens }
			: {}),
		...(params.usage.cachedInputTokens !== undefined
			? { cachedInputTokens: params.usage.cachedInputTokens }
			: {}),
		costUsd,
		createdAt: params.occurredAt
	});

	const inputTokens = params.usage.inputTokens ?? 0;
	const outputTokens = params.usage.outputTokens ?? 0;
	const reasoningTokens = params.usage.reasoningTokens ?? 0;
	const cachedInputTokens = params.usage.cachedInputTokens ?? 0;

	const existing = await ctx.db
		.query('aiDailyUsage')
		.withIndex('by_ownerId_and_dateKey', (q) =>
			q.eq('ownerId', params.ownerId).eq('dateKey', dateKey)
		)
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
			ownerId: params.ownerId,
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

	return { costUsd };
}
