# Plan 004: Triage And Reduce High-Risk Dependency Advisories

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat df53974..HEAD -- package.json package-lock.json`
> If either file changed since this plan was written, inspect the current dependency graph and rerun `npm audit --audit-level=high` before proceeding.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/001-establish-test-baseline.md`
- **Category**: security
- **Planned at**: commit `df53974`, 2026-06-17

## Why this matters

`npm audit --audit-level=high` currently reports high and critical advisories in the dependency tree. Some are dev-server/tooling issues and some are transitive through core runtime packages such as Convex, SvelteKit/Svelte, Braintrust, and Composio-related dependencies. The goal is to reduce what can be safely updated, document what remains, and avoid blind forced upgrades that break the app.

## Current state

- Core package versions:

```json
// package.json:28
"@sveltejs/kit": "^2.57.0",
"@sveltejs/vite-plugin-svelte": "^7.0.0",
...
"svelte": "^5.55.2",
"vite": "^8.0.7",
```

```json
// package.json:75
"braintrust": "^3.16.0",
"convex": "^1.35.1",
"convex-svelte": "^0.0.12",
"supermemory": "^4.21.1",
"svelte-streamdown": "^3.0.1"
```

- `npm audit --audit-level=high` at commit `df53974` reported:
  - Critical/high advisories in `axios`, `devalue`, `esbuild`, `form-data`, `shell-quote`, `svelte`, `vite`, and `ws`.
  - Moderate advisories in `@sveltejs/kit`, `cookie`, `dompurify`, `mermaid`, `postcss`, and others.
  - `shell-quote` comes through dev-only `concurrently` at `package.json:38`.
  - `esbuild` and `ws` include "No fix available" paths through `braintrust`, `convex`, `@convex-dev/auth`, and `convex-svelte` in the audit output.

Repo conventions:

- Ask before broad dependency additions or major migrations.
- Prefer small, production-friendly updates.
- Validate with `npm run check`, `npm run lint`, and `npm run build`.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Baseline audit | `npm audit --audit-level=high` | shows current advisories; save summary in final response |
| Safe updates | `npm update` or targeted `npm install <pkg>@<version>` | exit 0; lockfile updated |
| Tests | `npm test` | exit 0 |
| Typecheck | `npm run check` | exit 0 |
| Lint | `npm run lint` | exit 0 |
| Build | `npm run build` | exit 0 |
| Final audit | `npm audit --audit-level=high` | fewer high/critical advisories, or documented remaining advisories |

## Scope

**In scope**:

- `package.json`
- `package-lock.json`
- Optional `docs/briefs` or `plans/README.md` note only if documenting unresolved dependency risk is requested by the operator

**Out of scope**:

- Forced major migrations without approval.
- Replacing Convex, SvelteKit, Svelte, or Braintrust.
- Changing application code to work around package internals unless a safe package update requires a small compile fix.
- Suppressing audit output without evidence.

## Git workflow

- Branch: `codex/004-dependency-audit-triage`.
- Commit message style: `chore: triage vulnerable dependencies`.
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Capture A Fresh Audit Baseline

Run:

```sh
npm audit --audit-level=high
```

Categorize each high/critical advisory as:

- Direct production dependency.
- Transitive production dependency.
- Dev-only tooling dependency.
- No fixed version currently available.

Do not paste exploit details or long advisory text into committed files. It is fine to mention package names and advisory ids in the final response.

**Verify**: Command exits nonzero if advisories remain; that is expected at baseline. Continue with the categorized list.

### Step 2: Apply Safe Non-Forced Updates

Run the safest update path first:

```sh
npm audit fix
```

If `npm audit fix` proposes only non-breaking updates, accept them. If it proposes `--force` or major breaking changes, do not use force without explicit operator approval.

If audit fix does not update key packages, use targeted installs for patch/minor versions already allowed by `package.json` ranges, for example:

```sh
npm install @sveltejs/kit@latest svelte@latest vite@latest
```

Only do targeted latest installs if they remain within a reasonable same-major compatibility path or are clearly compatible with the current SvelteKit/Vite generation.

**Verify**: `npm run check` -> exits 0 after updates.

### Step 3: Handle Dev-Only Criticals Separately

For `concurrently`/`shell-quote`:

- Prefer updating `concurrently` within the same major if a fixed version exists.
- If only a major update fixes it, evaluate whether `concurrently` usage is limited to `npm run dev:all`.
- If the major update is low-risk, ask the operator for approval before taking it; otherwise document the residual dev-only risk.

Do not remove `dev:all` unless the operator approves the workflow change.

**Verify**: `npm run dev:all -- --help` is not a useful check because it starts servers. Instead run `npm run check` and inspect `package-lock.json` to confirm `shell-quote` status after changes.

### Step 4: Document Or Defer No-Fix Transitives

For advisories with no fixed version through Convex/Braintrust/esbuild/ws:

- Check whether newer versions of `convex`, `@convex-dev/auth`, `convex-svelte`, or `braintrust` are available and safe.
- If no fixed path exists, leave code unchanged and document the package, severity, reachability, and why it remains.
- Avoid package overrides unless you verify the upstream package works with the overridden transitive version; overrides can silently break SDKs.

**Verify**: `npm audit --audit-level=high` -> remaining advisories are understood and listed in final response.

### Step 5: Run Full Validation

Run:

```sh
npm test
npm run check
npm run lint
npm run build
npm audit --audit-level=high
```

The final audit may still fail if upstream has no fix. That is acceptable only if remaining high/critical advisories are documented with package path and reachability.

## Test plan

- Use Plan 001's tests as regression safety for helper behavior.
- Dependency updates should pass:
  - `npm test`
  - `npm run check`
  - `npm run lint`
  - `npm run build`
- No new app behavior tests are required unless a dependency update forces source changes.

## Done criteria

- [ ] `package-lock.json` reflects safe dependency updates.
- [ ] No forced major upgrade was applied without operator approval.
- [ ] `npm test`, `npm run check`, `npm run lint`, and `npm run build` pass.
- [ ] Final `npm audit --audit-level=high` was run.
- [ ] Any remaining high/critical advisories are documented by package/path, severity, reachability, and reason deferred.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- `npm audit fix` wants `--force`.
- A required fix implies a major framework/runtime migration.
- An update breaks SvelteKit, Convex, or AI SDK typechecking in a way that requires broad source changes.
- A package override appears necessary.
- A verification command fails twice after a reasonable fix attempt.

## Maintenance notes

Dependency triage ages quickly. Reviewers should compare the final audit output against the baseline and check that residual risks are intentionally accepted, not accidentally ignored.
