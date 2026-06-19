# Plan 002: Make Daily AI Caps Enforceable Under Concurrent Requests

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat df53974..HEAD -- src/convex/usage.ts src/convex/schema.ts src/routes/api/workspace/chat/+server.ts src/routes/api/workspace/thread/generate-title/+server.ts src/lib/usage.ts package.json package-lock.json`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, stop and report.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/001-establish-test-baseline.md`
- **Category**: bug
- **Planned at**: commit `df53974`, 2026-06-17

## Why this matters

Launchpad presents daily AI caps as cost controls, but the current flow only checks whether the user is already over the cap before starting an AI request. Multiple concurrent chat or title-generation requests can all pass the pre-check, spend money, and only update totals after the model finishes. This plan introduces a conservative reservation before AI execution and settles it after usage is known, so the cap blocks bursts before spend happens.

## Current state

- Chat checks the budget before streaming:

```ts
// src/routes/api/workspace/chat/+server.ts:100
const budget = await convex.query(getAiBudgetStatusQuery, {});
if (budget.isOverLimit) {
  return json({ error: 'Daily AI limit reached', ... }, { status: 429 });
}
```

- Chat records actual usage only at the final AI step:

```ts
// src/routes/api/workspace/chat/+server.ts:255
if (!didRecordUsage && hasUsage) {
  didRecordUsage = true;
  await convex.mutation(recordAiRunMutation, {
    threadId: thread._id,
    modelId: body.modelId,
    occurredAt: Date.now(),
    usage: accumulatedUsage
  });
}
```

- Title generation follows the same shape:

```ts
// src/routes/api/workspace/thread/generate-title/+server.ts:41
const budget = await convex.query(getAiBudgetStatusQuery, {});
if (budget.isOverLimit) { ... }

// src/routes/api/workspace/thread/generate-title/+server.ts:123
await convex.mutation(recordAiRunMutation, {
  threadId: threadId as Id<'chatThreads'>,
  modelId: TITLE_MODEL_ID,
  occurredAt,
  usage: { ... }
});
```

- Daily usage is updated after the run:

```ts
// src/convex/usage.ts:239
const existing = await ctx.db
  .query('aiDailyUsage')
  .withIndex('by_ownerId_and_dateKey', (q) =>
    q.eq('ownerId', params.ownerId).eq('dateKey', dateKey)
  )
  .unique();
```

Repo conventions:

- Convex mutations enforce ownership with `requireAuthUserId`.
- Persisted data shape changes are approval-boundary work; keep schema changes minimal and backward compatible.
- Usage source kinds currently include `chatThread` and `externalContextImportDraft`.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Tests | `npm test -- --run src/convex src/routes/api/workspace` | exit 0 |
| Typecheck | `npm run check` | exit 0 |
| Lint | `npm run lint` | exit 0 |
| Build | `npm run build` | exit 0 |

## Scope

**In scope**:

- `src/convex/usage.ts`
- `src/convex/schema.ts` only if a small reservation table/fields are needed
- `src/lib/usage.ts`
- `src/routes/api/workspace/chat/+server.ts`
- `src/routes/api/workspace/thread/generate-title/+server.ts`
- New/updated tests for budget reservation behavior

**Out of scope**:

- Changing model pricing.
- Changing user-facing settings UI.
- Replacing the AI SDK streaming implementation.
- Reworking evals or Braintrust tracing.
- Broad schema redesign beyond the reservation mechanism.

## Git workflow

- Branch: `codex/002-ai-budget-reservations`.
- Commit message style: `fix: reserve ai budget before model calls`.
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add A Minimal Reservation Contract

In `src/convex/usage.ts`, add a mutation that checks current daily usage and reserves a conservative fixed cost before a model call starts. A simple acceptable approach:

- Estimate a per-request reservation from model id, such as the cost of a configured token ceiling, with a lower bound.
- Check `spentUsd + reservedUsd >= capUsd` inside the same Convex mutation.
- If allowed, insert an `aiUsageEvents` row or a new small reservation row marked as pending, and increment `aiDailyUsage.costUsd` by the reservation amount.
- Return a reservation id and budget status.

If using a new table, add the smallest schema table needed, for example `aiUsageReservations` with `ownerId`, `dateKey`, `sourceKind`, `sourceId`, `modelId`, `reservedCostUsd`, `status`, `createdAt`, `updatedAt`.

**Verify**: `npm run check` -> exits 0 after schema/types update.

### Step 2: Add Settlement For Actual Usage

Update usage recording so actual usage settles the reservation:

- If actual cost is greater than reserved cost, add the difference to `aiDailyUsage`.
- If actual cost is less, subtract the unused reserved amount.
- Mark the reservation as settled.
- Preserve existing `aiUsageEvents` records for actual usage reporting.

Make settlement idempotent: repeated settlement for the same reservation should not double-charge.

**Verify**: Add unit tests for reservation allowed, reservation denied at cap, settlement higher than reserved, settlement lower than reserved, and duplicate settlement. Run `npm test -- --run src/convex` -> exits 0.

### Step 3: Wire Chat To Reserve Before Streaming

In `src/routes/api/workspace/chat/+server.ts`:

- Replace the pre-flight `getAiBudgetStatusQuery` gate with the new reserve mutation after thread ownership is confirmed and before model execution.
- Keep the existing 429 response shape as close as possible.
- Pass the reservation id into the final usage record.
- If the stream errors before usage is recorded, release or expire the reservation in a `catch`/failure path where feasible. If stream lifecycle makes this unreliable, document the fallback and add a short reservation-expiry cleanup in Convex.

**Verify**: `npm test -- --run src/routes/api/workspace/chat src/convex` -> exits 0.

### Step 4: Wire Title Generation To Reserve Before `generateText`

In `src/routes/api/workspace/thread/generate-title/+server.ts`:

- Reserve budget before `generateText`.
- Settle the reservation when recording actual usage.
- Release or mark skipped if no title update occurs after the model call.

Do not reserve if the route returns early for already-generated, non-placeholder, no-assistant, invalid auth, or missing thread cases.

**Verify**: `npm test -- --run src/routes/api/workspace/thread src/convex` -> exits 0.

### Step 5: Run Full Checks

**Verify**:

- `npm test` -> exits 0.
- `npm run check` -> exits 0.
- `npm run lint` -> exits 0.
- `npm run build` -> exits 0.

## Test plan

- Add tests around the Convex usage helper/mutation logic. If Convex mutations are hard to unit-test directly, extract pure calculation helpers for reserve/settle math and test those, then add route-level tests with mocked Convex client calls.
- Required cases:
  - Under-cap reservation succeeds.
  - At-cap reservation returns over-limit without creating a model call.
  - Concurrent-style double reservation consumes remaining budget before either settles.
  - Settlement reconciles under/over actual usage.
  - Duplicate settlement does not double-count.

## Done criteria

- [ ] AI chat requests reserve budget before model execution.
- [ ] Title-generation requests reserve budget before model execution.
- [ ] Actual usage reconciles reserved cost without double-counting.
- [ ] Over-cap response remains HTTP 429 with cap/spent/date fields.
- [ ] Tests cover reservation and settlement math.
- [ ] `npm test`, `npm run check`, `npm run lint`, and `npm run build` pass.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- The fix requires a large billing redesign or real payment-provider semantics.
- Convex cannot safely represent reservations without a broader schema migration.
- Streaming lifecycle makes reservation release impossible without introducing user-visible failures; report the trade-off.
- Pricing data is missing for the selected model and no conservative fallback is acceptable.

## Maintenance notes

Reviewers should focus on idempotency and failure paths. Any future AI path, including external context import synthesis, should either use the same reservation contract or explicitly document why it is exempt.
