import { v } from 'convex/values';
import { ideaAiModels } from '../lib/idea-ai-models';
import { getOptionalAuthUserId, requireAuthUserId } from './authHelpers';
import { dateKeyForMs } from './dateKey';
import { getUserTimeZone } from './activityHelpers';
import { internalMutation, internalQuery, mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

const DEFAULT_DAILY_AI_CAP_USD = 0.5;
const DEFAULT_AI_RESERVATION_USD = 0.02;
const MIN_AI_RESERVATION_USD = 0.005;
const RESERVATION_INPUT_TOKEN_CEILING = 40_000;
const RESERVATION_OUTPUT_TOKEN_CEILING = 8_000;
const PENDING_RESERVATION_TTL_MS = 30 * 60 * 1000;
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

export function estimateAiUsageCostUsd(params: {
	modelId: string;
	inputTokens?: number;
	outputTokens?: number;
	reasoningTokens?: number;
	cachedInputTokens?: number;
}) {
	const cost = modelCostsPerMillionTokens[params.modelId];
	if (!cost) return 0;

	// AI SDK totals already include cached input and reasoning output tokens.
	const input = params.inputTokens ?? 0;
	const output = params.outputTokens ?? 0;

	return (input / 1_000_000) * cost.input + (output / 1_000_000) * cost.output;
}

export function estimateReservationCostUsd(modelId: string) {
	const estimated = estimateAiUsageCostUsd({
		modelId,
		inputTokens: RESERVATION_INPUT_TOKEN_CEILING,
		outputTokens: RESERVATION_OUTPUT_TOKEN_CEILING
	});

	if (estimated <= 0) return DEFAULT_AI_RESERVATION_USD;
	return Math.max(MIN_AI_RESERVATION_USD, estimated);
}

export function applyAiReservationToBudget(params: {
	spentUsd: number;
	capUsd: number;
	reservedCostUsd: number;
}) {
	const projectedSpentUsd = params.spentUsd + params.reservedCostUsd;
	const remainingUsd = Math.max(0, params.capUsd - params.spentUsd);
	return {
		allowed: projectedSpentUsd < params.capUsd,
		projectedSpentUsd,
		remainingUsd
	};
}

export function settleReservedCostDelta(params: {
	reservedCostUsd: number;
	actualCostUsd: number;
	wasSettled: boolean;
}) {
	if (params.wasSettled) return 0;
	return params.actualCostUsd - params.reservedCostUsd;
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
		usage: aiUsageValue,
		reservationId: v.optional(v.id('aiUsageReservations'))
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
			usage: args.usage,
			reservationId: args.reservationId
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
		usage: aiUsageValue,
		reservationId: v.optional(v.id('aiUsageReservations'))
	},
	handler: async (ctx, args) => {
		const result = await recordAiRunForOwnerImpl(ctx, {
			ownerId: args.ownerId,
			modelId: args.modelId,
			occurredAt: args.occurredAt,
			sourceKind: args.sourceKind,
			sourceId: args.sourceId,
			usage: args.usage,
			reservationId: args.reservationId
		});

		return { ok: true as const, costUsd: result.costUsd };
	}
});

export const reserveAiBudget = mutation({
	args: {
		sourceKind: aiUsageSourceKindValue,
		sourceId: v.string(),
		modelId: v.string(),
		atMs: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		return await reserveAiBudgetForOwnerImpl(ctx, ownerId, args);
	}
});

export const reserveAiBudgetForOwner = internalMutation({
	args: {
		ownerId: v.id('users'),
		sourceKind: aiUsageSourceKindValue,
		sourceId: v.string(),
		modelId: v.string(),
		atMs: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		return await reserveAiBudgetForOwnerImpl(ctx, args.ownerId, args);
	}
});

async function reserveAiBudgetForOwnerImpl(
	ctx: MutationCtx,
	ownerId: Id<'users'>,
	args: {
		sourceKind: AiUsageSourceKind;
		sourceId: string;
		modelId: string;
		atMs?: number;
	}
) {
	const now = args.atMs ?? Date.now();
	let budget = await getAiBudgetStatusForOwnerImpl(ctx, ownerId, now);
	const releasedExpired = await releaseExpiredAiBudgetReservations(ctx, {
		ownerId,
		dateKey: budget.dateKey,
		now
	});
	if (releasedExpired > 0) {
		budget = await getAiBudgetStatusForOwnerImpl(ctx, ownerId, now);
	}
	const reservedCostUsd = estimateReservationCostUsd(args.modelId);
	const reservation = applyAiReservationToBudget({
		spentUsd: budget.spentUsd,
		capUsd: budget.capUsd,
		reservedCostUsd
	});

	if (!reservation.allowed) {
		return {
			ok: false as const,
			budget: {
				...budget,
				remainingUsd: reservation.remainingUsd,
				isOverLimit: true
			}
		};
	}

	const reservationId = await ctx.db.insert('aiUsageReservations', {
		ownerId,
		dateKey: budget.dateKey,
		sourceKind: args.sourceKind,
		sourceId: args.sourceId,
		modelId: args.modelId,
		reservedCostUsd,
		status: 'pending',
		createdAt: now,
		updatedAt: now
	});

	await addDailyUsageCost(ctx, {
		ownerId,
		dateKey: budget.dateKey,
		costUsdDelta: reservedCostUsd,
		now
	});

	const spentUsd = reservation.projectedSpentUsd;
	const updatedBudget = {
		...budget,
		spentUsd,
		remainingUsd: Math.max(0, budget.capUsd - spentUsd),
		isOverLimit: spentUsd >= budget.capUsd
	};

	return {
		ok: true as const,
		reservationId,
		reservedCostUsd,
		budget: updatedBudget
	};
}

export const releaseAiBudgetReservation = mutation({
	args: {
		reservationId: v.id('aiUsageReservations')
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		return await releaseAiBudgetReservationForOwnerImpl(ctx, ownerId, args.reservationId);
	}
});

export const releaseAiBudgetReservationForOwner = internalMutation({
	args: {
		ownerId: v.id('users'),
		reservationId: v.id('aiUsageReservations')
	},
	handler: async (ctx, args) => {
		return await releaseAiBudgetReservationForOwnerImpl(ctx, args.ownerId, args.reservationId);
	}
});

async function releaseAiBudgetReservationForOwnerImpl(
	ctx: MutationCtx,
	ownerId: Id<'users'>,
	reservationId: Id<'aiUsageReservations'>
) {
	const reservation = await ctx.db.get(reservationId);
	if (!reservation || reservation.ownerId !== ownerId) {
		throw new Error('Reservation not found');
	}
	if (reservation.status !== 'pending') {
		return { ok: true as const, released: false };
	}

	const now = Date.now();
	await addDailyUsageCost(ctx, {
		ownerId,
		dateKey: reservation.dateKey,
		costUsdDelta: -reservation.reservedCostUsd,
		now
	});
	await ctx.db.patch(reservation._id, {
		status: 'released',
		updatedAt: now
	});

	return { ok: true as const, released: true };
}

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

async function addDailyUsageCost(
	ctx: MutationCtx,
	params: {
		ownerId: Id<'users'>;
		dateKey: string;
		costUsdDelta: number;
		now: number;
		inputTokensDelta?: number;
		outputTokensDelta?: number;
		reasoningTokensDelta?: number;
		cachedInputTokensDelta?: number;
	}
) {
	const existing = await ctx.db
		.query('aiDailyUsage')
		.withIndex('by_ownerId_and_dateKey', (q) =>
			q.eq('ownerId', params.ownerId).eq('dateKey', params.dateKey)
		)
		.unique();

	const inputTokens = params.inputTokensDelta ?? 0;
	const outputTokens = params.outputTokensDelta ?? 0;
	const reasoningTokens = params.reasoningTokensDelta ?? 0;
	const cachedInputTokens = params.cachedInputTokensDelta ?? 0;

	if (existing) {
		await ctx.db.patch(existing._id, {
			inputTokens: existing.inputTokens + inputTokens,
			outputTokens: existing.outputTokens + outputTokens,
			reasoningTokens: existing.reasoningTokens + reasoningTokens,
			cachedInputTokens: existing.cachedInputTokens + cachedInputTokens,
			costUsd: Math.max(0, existing.costUsd + params.costUsdDelta),
			updatedAt: params.now
		});
		return;
	}

	await ctx.db.insert('aiDailyUsage', {
		ownerId: params.ownerId,
		dateKey: params.dateKey,
		inputTokens,
		outputTokens,
		reasoningTokens,
		cachedInputTokens,
		costUsd: Math.max(0, params.costUsdDelta),
		createdAt: params.now,
		updatedAt: params.now
	});
}

async function releaseExpiredAiBudgetReservations(
	ctx: MutationCtx,
	params: {
		ownerId: Id<'users'>;
		dateKey: string;
		now: number;
	}
) {
	const expiresBefore = params.now - PENDING_RESERVATION_TTL_MS;
	const pending = await ctx.db
		.query('aiUsageReservations')
		.withIndex('by_ownerId_and_dateKey_and_status', (q) =>
			q.eq('ownerId', params.ownerId).eq('dateKey', params.dateKey).eq('status', 'pending')
		)
		.collect();
	const expired = pending.filter((reservation) => reservation.createdAt <= expiresBefore);
	if (expired.length === 0) return 0;

	const releasedCostUsd = expired.reduce(
		(total, reservation) => total + reservation.reservedCostUsd,
		0
	);
	await addDailyUsageCost(ctx, {
		ownerId: params.ownerId,
		dateKey: params.dateKey,
		costUsdDelta: -releasedCostUsd,
		now: params.now
	});

	for (const reservation of expired) {
		await ctx.db.patch(reservation._id, {
			status: 'released',
			updatedAt: params.now
		});
	}

	return expired.length;
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
		reservationId?: Id<'aiUsageReservations'>;
	}
) {
	const timeZone = await getUserTimeZone(ctx, params.ownerId);
	const dateKey = dateKeyForMs(params.occurredAt, timeZone);
	const costUsd = estimateAiUsageCostUsd({
		modelId: params.modelId,
		inputTokens: params.usage.inputTokens,
		outputTokens: params.usage.outputTokens,
		reasoningTokens: params.usage.reasoningTokens,
		cachedInputTokens: params.usage.cachedInputTokens
	});
	let settledReservation = false;
	let reservedCostUsd = 0;

	if (params.reservationId) {
		const reservation = await ctx.db.get(params.reservationId);
		if (!reservation || reservation.ownerId !== params.ownerId) {
			throw new Error('Reservation not found');
		}
		if (reservation.status !== 'pending') {
			return { costUsd };
		}
		if (reservation.status === 'pending') {
			reservedCostUsd = reservation.reservedCostUsd;
			settledReservation = true;
		}
	}

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

	const now = Date.now();
	await addDailyUsageCost(ctx, {
		ownerId: params.ownerId,
		dateKey,
		inputTokensDelta: inputTokens,
		outputTokensDelta: outputTokens,
		reasoningTokensDelta: reasoningTokens,
		cachedInputTokensDelta: cachedInputTokens,
		costUsdDelta: settleReservedCostDelta({
			reservedCostUsd,
			actualCostUsd: costUsd,
			wasSettled: false
		}),
		now
	});

	if (params.reservationId && settledReservation) {
		await ctx.db.patch(params.reservationId, {
			status: 'settled',
			updatedAt: now
		});
	}

	return { costUsd };
}
