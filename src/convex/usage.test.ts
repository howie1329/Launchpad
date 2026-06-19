import { describe, expect, it } from 'vitest';
import {
	applyAiReservationToBudget,
	estimateAiUsageCostUsd,
	estimateReservationCostUsd,
	settleReservedCostDelta
} from './usage';

describe('AI usage reservations', () => {
	it('does not add cached and reasoning detail tokens to SDK totals twice', () => {
		const cost = estimateAiUsageCostUsd({
			modelId: 'openai/gpt-5.4-nano',
			inputTokens: 1_000_000,
			outputTokens: 1_000_000,
			cachedInputTokens: 800_000,
			reasoningTokens: 700_000
		});

		expect(cost).toBeCloseTo(1.45);
	});

	it('allows an under-cap reservation', () => {
		const result = applyAiReservationToBudget({
			spentUsd: 0.1,
			capUsd: 0.5,
			reservedCostUsd: 0.05
		});

		expect(result.allowed).toBe(true);
		expect(result.projectedSpentUsd).toBeCloseTo(0.15);
		expect(result.remainingUsd).toBe(0.4);
	});

	it('denies a reservation at the cap', () => {
		const result = applyAiReservationToBudget({
			spentUsd: 0.5,
			capUsd: 0.5,
			reservedCostUsd: 0.005
		});

		expect(result.allowed).toBe(false);
		expect(result.projectedSpentUsd).toBe(0.505);
		expect(result.remainingUsd).toBe(0);
	});

	it('consumes remaining budget across concurrent-style reservations before settlement', () => {
		const first = applyAiReservationToBudget({
			spentUsd: 0.42,
			capUsd: 0.5,
			reservedCostUsd: 0.05
		});
		const second = applyAiReservationToBudget({
			spentUsd: first.projectedSpentUsd,
			capUsd: 0.5,
			reservedCostUsd: 0.05
		});

		expect(first.allowed).toBe(true);
		expect(second.allowed).toBe(false);
		expect(second.projectedSpentUsd).toBeCloseTo(0.52);
	});

	it('adds the difference when actual usage exceeds the reservation', () => {
		expect(
			settleReservedCostDelta({
				reservedCostUsd: 0.02,
				actualCostUsd: 0.035,
				wasSettled: false
			})
		).toBeCloseTo(0.015);
	});

	it('subtracts unused cost when actual usage is lower than the reservation', () => {
		expect(
			settleReservedCostDelta({
				reservedCostUsd: 0.02,
				actualCostUsd: 0.006,
				wasSettled: false
			})
		).toBeCloseTo(-0.014);
	});

	it('does not charge again for duplicate settlement', () => {
		expect(
			settleReservedCostDelta({
				reservedCostUsd: 0.02,
				actualCostUsd: 0.035,
				wasSettled: true
			})
		).toBe(0);
	});

	it('uses a conservative fallback for unknown model pricing', () => {
		expect(estimateReservationCostUsd('missing-model')).toBeGreaterThan(0);
	});
});
