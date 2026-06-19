import { makeFunctionReference } from 'convex/server';
import type { Id } from '../convex/_generated/dataModel';

export type AiBudgetStatus = {
	dateKey: string;
	capUsd: number;
	spentUsd: number;
	remainingUsd: number;
	isOverLimit: boolean;
};

export const getAiBudgetStatusQuery = makeFunctionReference<
	'query',
	{ atMs?: number },
	AiBudgetStatus
>('usage:getAiBudgetStatus');

export type RecordAiRunArgs = {
	threadId: Id<'chatThreads'>;
	modelId: string;
	occurredAt: number;
	usage: {
		inputTokens?: number;
		outputTokens?: number;
		reasoningTokens?: number;
		cachedInputTokens?: number;
	};
	reservationId?: Id<'aiUsageReservations'>;
};

export const recordAiRunMutation = makeFunctionReference<
	'mutation',
	RecordAiRunArgs,
	{ ok: true; costUsd: number }
>('usage:recordAiRun');

export type ReserveAiBudgetResult =
	| {
			ok: true;
			reservationId: Id<'aiUsageReservations'>;
			reservedCostUsd: number;
			budget: AiBudgetStatus;
	  }
	| {
			ok: false;
			budget: AiBudgetStatus;
	  };

export const reserveAiBudgetMutation = makeFunctionReference<
	'mutation',
	{
		sourceKind: 'chatThread' | 'externalContextImportDraft';
		sourceId: string;
		modelId: string;
		atMs?: number;
	},
	ReserveAiBudgetResult
>('usage:reserveAiBudget');

export const releaseAiBudgetReservationMutation = makeFunctionReference<
	'mutation',
	{ reservationId: Id<'aiUsageReservations'> },
	{ ok: true; released: boolean }
>('usage:releaseAiBudgetReservation');
