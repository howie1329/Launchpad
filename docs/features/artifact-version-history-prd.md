# PRD: Artifact Version History

## Problem Statement

Launchpad's artifact editing model was split in a way that no longer matched the product.

AI changes to artifacts went through a draft-review workflow with pending/apply/discard states and diff rendering, while manual user edits saved directly to the artifact. The existing `revision` field acted as a stale-draft guard, but it was not real user-facing version history. That left the app with approval-heavy AI editing, direct manual editing, and no coherent artifact history model that users could browse, compare, or restore.

For the intended solo-builder workflow, the draft system added friction in the wrong place. Users did not primarily need a blocking review lane for AI edits; they needed fast editing, clear visibility into what changed, and a safe way to inspect and restore prior states.

## Solution

Replace the draft-based artifact diff workflow with a version-first artifact history model.

Under the new model, both user edits and AI edits write directly to the canonical artifact when authorized. Every successful write creates a new artifact version. Diffs remain in the product, but they become a history and comparison tool rather than a blocking approval mechanism.

The user experience should be:

- User manual edits create a new version on explicit Save.
- AI edits are allowed only when the user explicitly asks to update the artifact.
- AI writes update the canonical artifact immediately and create one new version per completed write.
- After an AI write, the product shows a clear saved state with a `View changes` action.
- Version history becomes the place to inspect changes, compare versions, and restore older states safely.
- Restoring a prior version creates a new latest version instead of rewinding history destructively.

This is a hard cutover. The old draft system should be removed, along with related dead code and docs that no longer serve the new model.

## User Stories

1. As a solo builder, I want artifact editing to feel immediate, so that I can keep working without approval-style friction.
2. As a solo builder, I want AI to update an artifact directly when I explicitly ask it to, so that I do not have to manually apply a draft every time.
3. As a solo builder, I want AI to avoid changing artifacts unless I clearly asked for that artifact to be updated, so that the assistant does not mutate saved work unexpectedly.
4. As a solo builder, I want every saved artifact change to create a version, so that I can understand how the document evolved.
5. As a solo builder, I want manual edits to create versions only when I press Save, so that version history stays meaningful.
6. As a solo builder, I want each AI write to create exactly one version, so that history maps cleanly to each AI action.
7. As a solo builder, I want to see whether a version came from me or the AI, so that history is easier to scan.
8. As a solo builder, I want to see where a change came from, such as editor or chat, so that I know the context of the edit.
9. As a solo builder, I want versions to optionally include a short summary, so that I can quickly understand what changed.
10. As a solo builder, I want the artifact to update immediately after an AI edit, so that the saved document stays current.
11. As a solo builder, I want to review what the AI changed right after it saves, so that I retain trust in the direct-write flow.
12. As a solo builder, I want a `View changes` action after AI edits, so that change review is one click away.
13. As a solo builder, I want artifact history to list prior versions in order, so that I can navigate past states easily.
14. As a solo builder, I want the default diff for a selected version to compare against the immediately previous version, so that I see the local change by default.
15. As a solo builder, I want to choose a different earlier version as the diff base, so that I can inspect broader changes over time.
16. As a solo builder, I want title changes and body changes to both be visible in version comparisons, so that document updates are fully understandable.
17. As a solo builder, I want to restore an older version safely, so that I can recover earlier work without destroying history.
18. As a solo builder, I want restoring a version to create a new latest version, so that I never lose the record of what happened afterward.
19. As a solo builder, I want AI to update only artifacts already linked to the active thread, so that chat writes stay within visible context boundaries.
20. As a solo builder, I want the app to remove the old draft workflow entirely after cutover, so that the product has one clear editing model instead of two overlapping systems.
21. As a maintainer, I want dead code from the draft system removed, so that the codebase stays simpler and easier to extend.
22. As a maintainer, I want diff rendering to be reused for version comparisons, so that the current diff investment still serves the product.
23. As a maintainer, I want artifact history and version comparison to use a clear backend model, so that future restore and compare features have a durable foundation.
24. As a maintainer, I want AI edit writes and manual saves to converge on a shared versioning path, so that artifact mutation logic stays consistent.
25. As a user with unsaved manual edits, I want the product to avoid silently destroying my in-progress text if the artifact changes elsewhere, so that I do not lose work.

## Implementation Decisions

- Move from draft-based artifact review to version-based artifact history.
- Keep `artifacts` as the canonical current document model.
- Add a dedicated artifact version model that stores a snapshot per saved change.
- Each version stores actor (`user` or `ai`), source (`editor` or `chat`), optional summary, title snapshot, content snapshot, version number, and timestamp.
- Treat the artifact's current revision/version number as a real versioning concept rather than only a stale-draft guard.
- Manual user edits create a new version only on explicit Save.
- AI edits are direct writes only when the user explicitly asks to update the artifact.
- AI edits update the canonical artifact immediately and create exactly one new version per successful write.
- Keep the existing thread safety boundary: AI may directly update only artifacts already linked to the active thread.
- Replace the current AI edit tool behavior so it performs direct artifact updates instead of draft creation.
- Keep diffs in the product, but use them for version comparison rather than blocking approval.
- Default history comparison should be selected version versus the immediately previous version.
- Allow the user to choose a different earlier version as the comparison base.
- Restoring an older version creates a new latest version instead of deleting or rewinding later history.
- After an AI write, surface a clear saved state with a `View changes` affordance.
- Perform a hard cutover: remove the old draft data flow instead of running drafts and versions in parallel.
- Remove dead code related to draft creation, hydration, review, apply/discard flows, stale-draft logic, related UI surfaces, and docs that no longer describe the shipped model.
- Preserve the memory sync behavior on successful artifact updates so downstream memory reflects the latest canonical artifact.
- Default unresolved editor-concurrency behavior to protecting unsaved local edits and showing that a newer saved version exists, rather than overwriting the local buffer.

## Testing Decisions

- Good tests should verify external behavior and persisted outcomes, not implementation details or internal helper structure.
- Test the shared artifact write/versioning path to confirm each successful save creates the correct new version and updates the canonical artifact.
- Test manual save behavior to confirm versions are created only on explicit Save.
- Test AI direct-write behavior to confirm explicit artifact update requests create exactly one version and update the canonical artifact immediately.
- Test version metadata behavior for actor, source, optional summary, and ordering.
- Test history retrieval and default comparison behavior.
- Test version comparison behavior for title-only, body-only, and combined changes.
- Test restore behavior to confirm restoring an older version creates a new head version instead of mutating history destructively.
- Test thread-scoped AI write authorization so AI cannot update artifacts outside the active thread link boundary.
- Test post-save `View changes` flows at the integration/UI level where appropriate.
- Test editor concurrency behavior around unsaved local edits versus newer saved versions.
- Use existing Convex mutation/query testing patterns and current artifact/editor interaction tests in the repo as prior art where available; new tests should follow the same external-behavior style.

## Out of Scope

- Reintroducing pending/apply/discard review as part of the main artifact editing flow.
- Running draft-based and version-based systems side by side after rollout.
- Per-hunk accept/reject workflows.
- Multi-user collaborative conflict resolution beyond the chosen single-user-safe behavior.
- Auto-batching multiple AI edits into one version.
- Expanding AI write scope beyond artifacts already linked to the active thread.
- Compliance-grade audit logging beyond actor, source, and optional summary.
- Version autosave snapshots on every keystroke.
- Destructive rewind that erases later history.

## Further Notes

- This plan intentionally optimizes for a solo-builder product with low process overhead.
- The existing diff library still has value, but its role shifts from "review before apply" to "understand changes between versions."
- The implementation should include a deliberate cleanup pass over schema, mutations, UI, types, activity labels, and documentation so the product tells one story after the cutover.
- Dirty-editor collision behavior is intentionally simple: preserve the local buffer, show that a newer saved version exists, and offer compare/reload actions.
