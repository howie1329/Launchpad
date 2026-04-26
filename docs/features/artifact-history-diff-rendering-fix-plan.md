# Artifact History Diff Rendering Fix Plan

## Summary

Fix artifact version comparison rendering without any schema changes.

Artifact versions remain full snapshots; the UI derives focused diff metadata from the selected base and target versions at render time.

## Implementation Changes

1. Update `ArtifactDiffRendererDiffs.svelte` to build `FileDiffMetadata` with `parseDiffFromFile`.
2. Use context-limited parsing (`context: 2` for compact mode, `context: 3` otherwise) so unchanged regions collapse naturally.
3. Render from `fileDiff` metadata instead of relying on raw `oldFile/newFile` rendering.
4. Remove `expandUnchanged: true` so the compare surface no longer fills with large unchanged/blank markdown regions.
5. Keep existing renderer defaults for unified view, word diffing, line wrapping, hidden header, and hidden line numbers.
6. Add a clear body no-change state in `ArtifactHistorySurface.svelte` when title changed but content markdown did not.

## Expected Behavior

- Comparing two versions should jump directly to meaningful changed hunks.
- Top-of-document blank content should no longer dominate the initial viewport.
- Title-only updates should show title comparison + a "No body changes" message.
- First version comparison behavior remains unchanged (no earlier version message).

## Validation Plan

1. Run Svelte autofixer on both modified components.
2. Run `npm run check`.
3. Manual verification in artifact history:
   - Compare adjacent versions with known body changes.
   - Compare versions with title-only changes.
   - Compare the first version (no base available).
