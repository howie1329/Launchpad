# Plan 001: Establish A Test Baseline For Critical Workspace Flows

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat df53974..HEAD -- package.json package-lock.json vite.config.ts src/routes/api/workspace/chat/+server.ts src/routes/api/workspace/thread/generate-title/+server.ts src/routes/api/workspace/composio/webhook/+server.ts src/routes/api/workspace/launchpad-actions/+server.ts 'src/routes/api/workspace/launchpad-actions/[actionId]/+server.ts' src/convex/usage.ts src/convex/launchpadActions.ts src/convex/accountManagement.ts`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, stop and report.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `df53974`, 2026-06-17

## Why this matters

Launchpad has important AI, Convex, Composio webhook, memory, and account-deletion flows, but no first-party automated test command. Plans 002 and 003 change cost-control and external-trigger state behavior; they should land behind characterization tests instead of relying only on manual review. This plan adds the smallest useful unit-test baseline around pure helpers and route-control logic, without attempting a broad E2E suite.

## Current state

- `package.json` defines `check`, `lint`, and `build`, but no `test` script:

```json
// package.json:6
"scripts": {
  "dev": "vite dev",
  "dev:all": "concurrently \"vite dev\" \"convex dev\"",
  "build": "vite build",
  "preview": "vite preview",
  "prepare": "svelte-kit sync || echo ''",
  "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
  "lint": "prettier --check . && eslint .",
  "format": "prettier --write .",
  "dev:frontend": "vite dev",
  "dev:backend": "convex dev",
  "eval:chat": "braintrust eval evals/workspace-chat/workspace-chat.eval.ts"
}
```

- A repo scan found no first-party `*.test.*`, `*.spec.*`, `vitest.config.*`, or `playwright.config.*` files outside `node_modules` and `.pi`.
- Critical untested surfaces:
  - `src/routes/api/workspace/chat/+server.ts` streams AI chat and records usage after final AI steps.
  - `src/routes/api/workspace/thread/generate-title/+server.ts` performs a smaller AI call and records usage.
  - `src/routes/api/workspace/composio/webhook/+server.ts` verifies Composio webhooks and normalizes external activity.
  - `src/routes/api/workspace/launchpad-actions/+server.ts` creates external Composio triggers, then stores local Convex rows.
  - `src/routes/api/workspace/launchpad-actions/[actionId]/+server.ts` updates/deletes Composio triggers, then updates Convex rows.
  - `src/convex/accountManagement.ts` cascades account, thread, project, artifact, usage, and memory cleanup.

Repo conventions to preserve:

- TypeScript ESM, SvelteKit, Svelte 5, Convex.
- Keep changes small and explicit.
- Do not edit generated files under `src/convex/_generated`.
- Validation/check commands from repo docs: `npm run check`, `npm run lint`, `npm run build`.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Install new test dependency if missing | `npm install -D vitest` | exit 0; `package.json` and `package-lock.json` updated |
| Test | `npm test` | exit 0; tests pass |
| Targeted tests | `npm test -- --run src/**/*.test.ts` | exit 0; tests pass |
| Typecheck | `npm run check` | exit 0, no Svelte/type errors |
| Lint | `npm run lint` | exit 0 |

## Scope

**In scope**:

- `package.json`
- `package-lock.json`
- `vite.config.ts` or `vitest.config.ts`
- New test files under `src/**/*.test.ts`
- Minimal pure-helper exports needed to test existing behavior from the critical route modules

**Out of scope**:

- Full browser E2E setup.
- Changing production behavior except tiny testability refactors.
- Rewriting API route handlers around a new abstraction.
- Schema or migration changes.
- Generated Convex files in `src/convex/_generated`.

## Git workflow

- Branch: `codex/001-test-baseline`.
- Commit message style: match existing conventional-ish history, for example `test: add workspace flow baseline tests`.
- Do not push or open a PR unless the operator explicitly asks.

## Steps

### Step 1: Add Vitest With A Minimal Test Script

Add `vitest` as a dev dependency if it is not already installed. Add a `test` script to `package.json`:

```json
"test": "vitest run"
```

Prefer using the existing Vite config when possible. If Vitest needs a config for path aliases, add a minimal `vitest.config.ts` or extend `vite.config.ts` without changing app build behavior.

**Verify**: `npm test -- --run` -> exits 0. At this point Vitest may report no tests found only if no tests have been added yet; continue to Step 2 immediately.

### Step 2: Add Pure Helper Tests For Low-Risk Existing Helpers

Create small tests for existing pure helpers that do not require Convex or network mocks. Good first targets:

- `src/lib/artifact-mention-tokens.ts` for parsing valid, duplicate, and absent artifact mentions.
- `src/lib/thread-title.ts` for normalizing generated titles and rejecting empty/noisy output.
- `src/lib/safeRedirect.ts` for allowing local redirects and rejecting unsafe external redirects.

Use colocated files such as `src/lib/thread-title.test.ts`. Keep assertions direct and table-driven.

**Verify**: `npm test -- --run src/lib` -> exits 0 and runs the new tests.

### Step 3: Extract And Test Launchpad Action Request Helpers

In `src/routes/api/workspace/launchpad-actions/+server.ts`, the existing `buildPresetSource` helper is pure but not exported. Either export it with a test-only name or move it to a tiny colocated helper module such as `src/lib/launchpad-action-request.ts`.

Cover:

- GitHub repository source accepts exactly `owner/repo`.
- GitHub repository source rejects empty, missing repo, and extra path segments.
- Linear team/project source preserves ids and names.
- Required config helpers (`triggerRequiresConfigKey`, `missingRequiredConfigKeys`) detect missing keys without broadening accepted input.

Do not change the API response shape.

**Verify**: `npm test -- --run src/lib src/routes/api/workspace/launchpad-actions` -> exits 0.

### Step 4: Add Webhook Normalization Characterization Tests

In `src/routes/api/workspace/composio/webhook/+server.ts`, extract pure helpers into a small module or export them if that keeps the diff smaller:

- `triggerIdFromPayload`
- `normalizeActivity`
- `isAcceptedEventType`

Add tests covering:

- Trigger id is found from normalized metadata id/uuid and raw `metadata.trigger_id`.
- Expired/disabled events without trigger id are ignored by caller policy.
- Activity title, actor, externalUrl, and summary are derived from GitHub-like payloads.
- Summary truncates to 500 chars.

Do not test Composio signature verification here; that belongs in an integration test with SDK mocks.

**Verify**: `npm test -- --run src/routes/api/workspace/composio/webhook` -> exits 0.

### Step 5: Run Project Checks

Run the narrowest useful checks plus test suite.

**Verify**:

- `npm test` -> exits 0.
- `npm run check` -> exits 0.
- `npm run lint` -> exits 0.

## Test plan

- New unit tests under `src/lib/*.test.ts` and, if helper extraction is used, under the relevant route/helper modules.
- Cover pure helpers before any behavior-changing plans.
- Do not mock Convex or network clients in this plan unless a tiny pure wrapper absolutely requires it.

## Done criteria

- [ ] `npm test` exists and exits 0.
- [ ] At least three first-party test files exist.
- [ ] Tests cover artifact mention parsing, thread-title or redirect normalization, Launchpad Action source/config parsing, and webhook normalization.
- [ ] `npm run check` exits 0.
- [ ] `npm run lint` exits 0.
- [ ] No generated Convex files are modified.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- Adding `vitest` requires a major framework migration or conflicts with Vite/SvelteKit.
- The testability refactor requires moving full route handlers or changing API behavior.
- Any helper behavior differs from the excerpts enough that the requested tests no longer characterize current production behavior.
- A verification command fails twice after a reasonable fix attempt.

## Maintenance notes

Keep this suite intentionally small. Future plans should add tests next to the behavior they change rather than expanding this into a slow catch-all suite. Reviewers should scrutinize helper extraction to ensure it does not accidentally alter route behavior.
