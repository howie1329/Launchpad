# Diffs.com Integration Evaluation for Launchpad

## Correction

This evaluation is for **https://diffs.com** (the `@pierre/diffs` diff-rendering library), not diff.com.

## What Diffs.com is (as of April 21, 2026)

`diffs.com` documents `@pierre/diffs` as an open-source code/diff rendering library built on Shiki, with package exports for:

- `@pierre/diffs` (vanilla JS)
- `@pierre/diffs/react`
- `@pierre/diffs/ssr`
- `@pierre/diffs/worker`

It is a UI rendering library, not a backend diff API service.

## Current Launchpad diff implementation

Launchpad already has a working artifact diff viewer at `src/lib/components/workspaces/ArtifactDiffEditor.svelte` using CodeMirror `MergeView`.

Current behavior includes:

- Side-by-side compare (`orientation: 'a-b'`)
- Change highlighting
- Collapsing unchanged sections
- Read-only rendering for saved vs proposed markdown

This means Diffs.com is a **visual rendering swap/upgrade opportunity**, not net-new product capability.

## Integration options

### Option A (recommended): Keep CodeMirror now, run a focused Diffs spike

Why:

- Smallest-risk path
- Existing component is stable and integrated with current Svelte UI
- Diffs currently emphasizes vanilla JS + React docs; no first-class Svelte package is advertised

Spike scope:

1. Build `ArtifactDiffRendererDiffs.svelte` as a wrapper around `@pierre/diffs` vanilla API.
2. Render one sample draft comparison from existing artifact data.
3. Validate parity on:
   - readability
   - load time
   - large markdown behavior
   - theme consistency (light/dark)
4. Decide go/no-go before replacing `ArtifactDiffEditor.svelte`.

### Option B: Full replacement of CodeMirror MergeView

Only do this if spike wins on UX/perf/maintainability. Otherwise keep current implementation.

### Option C: Hybrid

Keep CodeMirror for editing-heavy/draft review paths; use Diffs for read-only previews where visual polish matters most.

## Recommended implementation plan

### Phase 0 — Dependency + spike (1-2 days)

- Add `@pierre/diffs`
- Create a new internal wrapper component (do not remove current editor)
- Gate rendering with a local feature toggle

### Phase 1 — A/B in artifact draft compare

- Keep current route and data flow unchanged
- Swap only presentation layer for diff block
- Collect internal qualitative feedback

### Phase 2 — Decide default renderer

- If Diffs is clearly better: replace CodeMirror renderer and keep old component for rollback
- If not better: remove spike code and stay on CodeMirror

## What not to change

- No Convex schema changes
- No chat tool changes
- No artifact type changes
- No workflow changes

This is purely a UI rendering-layer decision.

## Concrete code touchpoints

- `src/lib/components/workspaces/ArtifactDiffEditor.svelte` (current renderer)
- Add `src/lib/components/workspaces/ArtifactDiffRendererDiffs.svelte` (spike wrapper)
- Artifact page integration point (where `ArtifactDiffEditor` is mounted)

## Decision criteria (ship only if all true)

- Better readability for long markdown diffs
- Equal or better interaction performance
- No accessibility regressions
- No theme regressions
- Low maintenance burden in Svelte codebase

## External references used

- https://diffs.com/
- https://diffs.com/docs
