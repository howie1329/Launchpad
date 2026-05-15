# Svelte/SvelteKit modernization + mobile responsiveness plan

_Last updated: April 25, 2026._

## Why this plan

We want two outcomes:

1. Keep the codebase aligned with current Svelte 5 + SvelteKit 2 patterns so maintenance stays cheap.
2. Improve workspace usability on phones (navigation, readability, tap targets, and layout stability).

This plan intentionally focuses on the smallest high-impact changes first.

## External guidance reviewed (official/primary sources)

- Svelte runes docs (`$state`, `$derived`, `$effect`) and Svelte 5 migration guide.
- SvelteKit docs for `load`, form actions, and `$app/state`.
- Svelte docs for `{@attach ...}` guidance.
- web.dev/MDN responsive/mobile guidance (viewport setup, responsive layouts, tap target sizing, dynamic viewport behavior).

## Project-specific findings

### 1) There are still `$app/stores` imports in route/components

Files still importing from `$app/stores`:

- `src/routes/workspace/+layout.svelte`
- `src/routes/workspace/+page.svelte`
- `src/routes/workspace/artifacts/[artifactId]/+page.svelte`
- `src/lib/components/workspaces/WorkspaceThread.svelte`

SvelteKit documentation recommends `$app/state` for runes-era apps (with `$app/stores` deprecated in newer SvelteKit docs).

### 2) Workspace header density is high on narrow screens

The workspace header currently packs: sidebar trigger, search, tab strip + picker, optional artifact controls, optional “Create project” CTA, and context toggle into a single row. On smaller viewports this can compress controls and increase accidental taps.

### 3) Small text and compact controls are heavily used in core workspace UI

There is broad use of `text-[10px]` / `text-[11px]` and many `size-8` icon buttons throughout core workspace and chat surfaces. This is consistent with a dense desktop-first workspace but risks readability/tap precision on mobile.

### 4) Layout foundations are strong but we should validate edge cases

The project already uses modern viewport units (`svh`) and mobile-first utility classes in many places. That is good. Next step is tightening interaction ergonomics and reducing horizontal pressure in the workspace chrome.

## Proposed implementation plan

## Phase 0 — Safety + baseline (0.5 day)

- Add a short “mobile UX acceptance checklist” to docs and use it as the definition of done for UI tasks.
- Capture current mobile behavior for key screens (`/`, `/workspace`, `/workspace?thread=...`, `/workspace/artifacts/[id]`) in iPhone-sized viewport.
- Run a quick Lighthouse mobile pass (best-effort in local/dev env) for overflow and tap target signals.

**Deliverable:** baseline notes + known issues list.

## Phase 1 — Svelte/SvelteKit modernization (0.5–1 day)

### 1.1 Migrate route/component page access from `$app/stores` to `$app/state`

Scope:

- `src/routes/workspace/+layout.svelte`
- `src/routes/workspace/+page.svelte`
- `src/routes/workspace/artifacts/[artifactId]/+page.svelte`
- `src/lib/components/workspaces/WorkspaceThread.svelte`

This is a low-risk refactor and keeps us aligned with current runes-era guidance.

### 1.2 Keep runes discipline explicit

For touched files, enforce:

- `$derived` for computed state
- `$effect` only for side-effects
- no legacy reactive patterns

### 1.3 Validate async/concurrency paths

Audit existing navigation + mutation flows in workspace layout/thread for sequential operations that can be parallelized safely (small pass only; no broad rewrite).

**Deliverable:** deprecation cleanup PR with no behavior change.

## Phase 2 — Mobile UX improvements in workspace shell (1–2 days)

### 2.1 Introduce mobile header modes

Current single-row header should collapse into contextual modes under `md`:

- **Default mobile mode:** Sidebar trigger + primary action + overflow menu.
- Move secondary controls (tab strip/picker, artifact read/history toggle, create-project CTA) into overflow sheet/dialog.

This removes horizontal squeeze while preserving capability.

### 2.2 Increase tap comfort for mobile-only variants

For critical actions on small screens, target ~44px+ interaction area and slightly larger text scale for dense labels where needed.

### 2.3 Reduce micro-text in high-frequency surfaces

Promote selected labels from 10/11px to 12/13px on mobile breakpoints in:

- workspace header + sidebar section labels
- chat composer helper text
- artifact metadata rows shown in mobile contexts

Keep desktop density unchanged.

### 2.4 Guard against horizontal overflow in workspace top chrome

Add explicit overflow strategy (`min-w-0`, truncation, conditional hide/show, overflow menu) for tab strip and artifact controls in narrow widths.

**Deliverable:** mobile-first workspace shell PR, focused on top-level ergonomics.

## Phase 3 — Mobile UX improvements in chat/content surfaces (1–2 days)

### 3.1 Chat composer ergonomics

In `WorkspaceThread` and `WorkspaceChatLanding`:

- ensure model/context controls wrap cleanly or collapse to one “Options” trigger on phone width
- keep submit CTA fixed and easy to hit
- validate keyboard-open behavior and scroll anchoring

### 3.2 Context panel behavior on mobile

For thread context (`context=1`), avoid split-pane mental model on mobile:

- use full-screen sheet/modal-style panel or route-style drill-in
- preserve back navigation clarity

### 3.3 Artifact reader/history on mobile

Prioritize readability:

- metadata stacking
- tighter but legible spacing
- avoid side-by-side assumptions below `md`

**Deliverable:** chat + artifact mobile usability PR.

## Concrete backlog (recommended order)

1. Migrate `$app/stores` -> `$app/state` in 4 files (fast deprecation cleanup).
2. Refactor workspace header for mobile overflow strategy.
3. Mobile tap target/text-size pass for high-frequency controls.
4. Composer options collapse strategy on phone width.
5. Context panel mobile interaction model (sheet/drill-in).
6. Artifact mobile readability pass.

## Guardrails

- Keep changes incremental and reversible; avoid broad architectural rewrites.
- Preserve existing desktop behavior unless mobile issue requires shared adjustment.
- No additional heavyweight UI dependencies required.
- Measure each phase with `npm run check`, `npm run lint`, and manual mobile viewport QA.

## Suggested acceptance criteria

- No horizontal scrolling in workspace shell on 360px-wide viewport.
- Primary header actions remain reachable without accidental taps.
- Composer remains usable with virtual keyboard open on phone.
- Context panel is understandable and navigable on mobile.
- `$app/stores` usage removed from app routes/components.
