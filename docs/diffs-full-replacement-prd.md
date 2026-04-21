# PRD: Full Replacement of Artifact Diff Renderer with `@pierre/diffs`

## Summary

Replace Launchpad’s current artifact compare renderer (CodeMirror `MergeView`) with a new renderer built on `@pierre/diffs` from diffs.com.

This is a **full replacement** of the visual compare component used in artifact draft review. Backend behavior (Convex tables, draft lifecycle, apply/discard flow) remains unchanged.

---

## Problem

Artifact compare is currently powered by CodeMirror merge UI. It is functional but opinionated toward editor ergonomics rather than polished read-only review.

For Launchpad’s draft-review workflow, we want a cleaner, purpose-built diff presentation with equal or better readability and performance, while preserving existing product behavior.

---

## Goals

1. Replace `ArtifactDiffEditor.svelte` compare rendering with a `@pierre/diffs`-based implementation.
2. Preserve all current artifact review workflow behavior (select draft, compare saved vs proposed, apply/discard).
3. Maintain or improve performance and visual clarity for long markdown documents.
4. Keep the change isolated to the presentation layer.

## Non-goals

- No Convex schema changes.
- No artifact model changes.
- No chat tool changes.
- No changes to apply/discard mutation semantics.
- No new artifact workflow concepts.

---

## Current State (code)

- Compare UI component: `src/lib/components/workspaces/ArtifactDiffEditor.svelte`
- Compare consumer: `src/lib/components/workspaces/WorkspaceArtifactReader.svelte`
- Current compare behavior:
  - side-by-side orientation
  - highlighted changes
  - collapsed unchanged regions
  - read-only display of saved vs proposed markdown

---

## Proposed Solution

### 1) Introduce a new renderer component

Add `src/lib/components/workspaces/ArtifactDiffRendererDiffs.svelte` with the same public props used by the current component:

- `original: string`
- `modified: string`
- `compact?: boolean`

The component wraps `@pierre/diffs` vanilla API and renders a read-only side-by-side diff panel compatible with current workspace styling.

### 2) Replace compare renderer wiring

Update `WorkspaceArtifactReader.svelte` compare branch to render `ArtifactDiffRendererDiffs` instead of `ArtifactDiffEditor`.

### 3) Keep fallback path during rollout

Retain `ArtifactDiffEditor.svelte` in repo for rollback during initial rollout window, but do not use it as default.

### 4) Remove old renderer after validation window

After rollout validation completes, delete `ArtifactDiffEditor.svelte` and related CodeMirror merge dependencies that are no longer needed.

---

## Functional Requirements

1. Compare view must render saved and proposed markdown text for selected draft.
2. Users must still be able to switch drafts and instantly see updated comparison.
3. Compare view must support compact and standard density modes.
4. Diff view must remain read-only.
5. No regression to apply/discard actions or draft selection behavior.

## UX Requirements

1. Label columns consistently as “Saved” and “Proposed.”
2. Preserve current border/radius/surface treatment in workspace artifact reader.
3. Ensure dark/light theme parity with existing workspace tokens.
4. Support long documents without UI lockups.

## Performance Requirements

1. Initial compare render should feel equivalent or faster than current experience for typical PRD-sized markdown.
2. Re-render on draft switch should not introduce visible jank.
3. Memory usage should remain bounded for long-doc compare sessions.

## Accessibility Requirements

1. Diff output remains readable with keyboard navigation.
2. Color contrast for additions/deletions meets current app baseline.
3. No loss of screen-reader context for top-level compare section.

---

## Technical Plan

### Phase 1 — Build replacement component

- Add new Diffs-based renderer component.
- Apply current container styles from existing compare surface.
- Normalize markdown/code-block styling to existing app typography.

### Phase 2 — Wire replacement

- Swap component usage in `WorkspaceArtifactReader.svelte` compare path.
- Keep prop contract stable.

### Phase 3 — Validate and harden

- Verify behavior across short, medium, and long markdown drafts.
- Fix any theme/a11y regressions.

### Phase 4 — Cleanup

- Remove unused CodeMirror merge component/code.
- Remove dependencies only if no longer used elsewhere.

---

## Risks and Mitigations

1. **Svelte integration risk** (library docs focus on vanilla/React)
   - Mitigation: isolate all library interaction in one wrapper component.
2. **Visual regressions in dark mode**
   - Mitigation: snapshot checks in both themes before rollout.
3. **Long-document performance variance**
   - Mitigation: benchmark with representative PRD artifacts before deleting old renderer.
4. **Rollback need after deploy**
   - Mitigation: keep old component available through rollout window.

---

## Rollout Plan

1. Ship replacement as default compare renderer.
2. Monitor internal and user feedback for one release window.
3. If stable, remove old renderer and dead dependencies.
4. If regressions appear, temporarily restore old renderer and patch wrapper.

---

## Success Metrics

1. No increase in compare-related UI errors.
2. No increase in user drop-off between viewing a draft and applying/discarding it.
3. Positive qualitative feedback on readability and visual quality.
4. Comparable or better perceived performance on draft switch.

---

## QA Checklist

1. Compare renders for at least 10 historical artifacts with pending drafts.
2. Validate compact and full-density modes.
3. Validate light and dark themes.
4. Validate keyboard-only navigation in artifact reader compare mode.
5. Validate apply/discard flow unchanged before and after renderer swap.

---

## Out of Scope

- Reworking artifact editor mode.
- Reworking markdown preview mode.
- Introducing semantic/AI-assisted diff summarization.
- Cross-artifact multi-file compare workflows.
