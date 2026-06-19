# Plan 003: Prevent Launchpad Action State Drift Across Composio And Convex

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat df53974..HEAD -- src/routes/api/workspace/launchpad-actions/+server.ts 'src/routes/api/workspace/launchpad-actions/[actionId]/+server.ts' src/convex/launchpadActions.ts src/convex/schema.ts src/lib/server/composio.ts src/lib/launchpad-actions.ts package.json package-lock.json`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, stop and report.

## Status

- **Priority**: P1
- **Effort**: S-M
- **Risk**: MED
- **Depends on**: `plans/001-establish-test-baseline.md`
- **Category**: bug
- **Planned at**: commit `df53974`, 2026-06-17

## Why this matters

Launchpad Actions represent external Composio triggers inside Convex. Create already cleans up an external trigger if local persistence fails, but pause/resume/delete perform the external operation first and then update Convex. If the Convex mutation fails, Launchpad can show an action as active while Composio disabled it, or show an action after the external trigger was deleted.

## Current state

- Create path has compensating cleanup:

```ts
// src/routes/api/workspace/launchpad-actions/+server.ts:151
if (createdTriggerId) {
  try {
    const { deleteComposioTrigger } = await import('$lib/server/composio');
    await deleteComposioTrigger(createdTriggerId);
  } catch (cleanupError) {
    console.error('Could not clean up Composio trigger after action create failure', cleanupError);
  }
}
```

- Patch path changes Composio before Convex:

```ts
// src/routes/api/workspace/launchpad-actions/[actionId]/+server.ts:33
if (action.triggerId) {
  await setComposioTriggerEnabled(action.triggerId, enabled);
}

await convex.mutation(setLaunchpadActionStatusMutation, {
  actionId: action._id,
  status: enabled ? 'active' : 'disabled'
});
```

- Delete path deletes Composio before Convex:

```ts
// src/routes/api/workspace/launchpad-actions/[actionId]/+server.ts:67
if (action.triggerId) {
  await deleteComposioTrigger(action.triggerId);
}

await convex.mutation(deleteLaunchpadActionMutation, {
  actionId: action._id
});
```

- Convex statuses are `active`, `disabled`, and `needs_attention`:

```ts
// src/convex/launchpadActions.ts:14
const statusValue = v.union(
  v.literal('active'),
  v.literal('disabled'),
  v.literal('needs_attention')
);
```

Repo conventions:

- API routes authenticate with bearer token, create a `ConvexHttpClient`, and rely on Convex queries/mutations for ownership.
- Launchpad Actions already use `needs_attention` to surface broken external state.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Tests | `npm test -- --run src/routes/api/workspace/launchpad-actions src/convex` | exit 0 |
| Typecheck | `npm run check` | exit 0 |
| Lint | `npm run lint` | exit 0 |
| Build | `npm run build` | exit 0 |

## Scope

**In scope**:

- `src/routes/api/workspace/launchpad-actions/[actionId]/+server.ts`
- `src/routes/api/workspace/launchpad-actions/+server.ts` only if sharing small helpers
- `src/convex/launchpadActions.ts`
- `src/convex/schema.ts` only if a minimal status/reason field change is required
- `src/lib/launchpad-actions.ts`
- Tests for action status/delete failure behavior

**Out of scope**:

- Redesigning Launchpad Actions UI.
- Changing Composio SDK wrappers beyond small helper return/error handling.
- Adding background reconciliation jobs.
- Changing provider presets or trigger config semantics.

## Git workflow

- Branch: `codex/003-launchpad-action-state-drift`.
- Commit message style: `fix: mark launchpad actions needing attention on sync failures`.
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Decide The Smallest State-Divergence Policy

Use existing `needs_attention` rather than adding many transitional states unless tests reveal it is insufficient.

Target behavior:

- If Composio enable/disable succeeds but Convex status update fails, make a best-effort follow-up Convex mutation to mark the action `needs_attention` with a reason such as "External trigger state changed, but Launchpad could not save the new status."
- If Composio delete succeeds but Convex delete fails, make a best-effort Convex mutation to mark the action `needs_attention` with a reason such as "External trigger was deleted, but Launchpad could not remove the local action."
- If Composio operation fails before external state changes, keep local Convex state unchanged and return an error.

**Verify**: No code yet if this is design-only; continue to Step 2.

### Step 2: Add A Narrow Convex Mutation For Needs-Attention Marking

In `src/convex/launchpadActions.ts`, add or reuse an owner-authenticated mutation that marks a specific action as `needs_attention` with a status reason. Do not expose webhook-secret internal mutation for client-originated routes.

Expected shape:

- Requires authenticated user.
- Calls `getOwnedAction`.
- Patches `status`, `statusReason`, `updatedAt`.
- Returns `{ ok: true }`.

Export it from `src/lib/launchpad-actions.ts` following existing mutation alias patterns.

**Verify**: `npm run check` -> exits 0.

### Step 3: Update PATCH Failure Handling

In `src/routes/api/workspace/launchpad-actions/[actionId]/+server.ts`:

- Keep fetching the owned action before external work.
- Call `setComposioTriggerEnabled`.
- Try the Convex status mutation.
- If the Convex status mutation fails after Composio succeeded, catch that specific failure and call the needs-attention mutation. Then return an HTTP 500 with a clear user-safe error.

Avoid swallowing Composio failures. If Composio fails, return the existing error style and leave local state unchanged.

**Verify**: Add tests with mocked `setComposioTriggerEnabled` and Convex mutations where possible. Run `npm test -- --run src/routes/api/workspace/launchpad-actions` -> exits 0.

### Step 4: Update DELETE Failure Handling

In the same route:

- Keep deleting the Composio trigger first only if current behavior depends on that ordering.
- If `deleteComposioTrigger` succeeds and `deleteLaunchpadActionMutation` fails, call the needs-attention mutation before returning error.
- If local marking also fails, log it but do not claim success.

Do not treat a Composio "not found" trigger as success unless the SDK exposes a reliable typed not-found error and the existing app already treats missing external triggers as deleted.

**Verify**: Add tests covering external delete success plus Convex delete failure. Run `npm test -- --run src/routes/api/workspace/launchpad-actions` -> exits 0.

### Step 5: Run Full Checks

**Verify**:

- `npm test` -> exits 0.
- `npm run check` -> exits 0.
- `npm run lint` -> exits 0.
- `npm run build` -> exits 0.

## Test plan

- Use the test baseline from Plan 001.
- Tests should cover:
  - PATCH success: Composio toggled and Convex status updated.
  - PATCH Composio failure: Convex status mutation not called.
  - PATCH Convex failure after Composio success: needs-attention mutation called.
  - DELETE success: Composio trigger deleted and Convex action deleted.
  - DELETE Convex failure after Composio success: needs-attention mutation called.

## Done criteria

- [ ] External-success/local-failure paths leave a visible `needs_attention` state where possible.
- [ ] External-failure paths do not mutate local state.
- [ ] Existing create cleanup behavior remains intact.
- [ ] Tests cover PATCH and DELETE drift cases.
- [ ] `npm test`, `npm run check`, `npm run lint`, and `npm run build` pass.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- The Composio SDK does not expose enough error semantics to know whether external state changed.
- The fix requires adding a background reconciliation system.
- Existing UI cannot display `needs_attention` for the affected actions and adding UI becomes necessary.
- A verification command fails twice after a reasonable fix attempt.

## Maintenance notes

Reviewers should focus on which failures happen before versus after external state changes. The goal is not perfect distributed transactions; it is honest local state when a two-system operation partially succeeds.
