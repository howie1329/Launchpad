# PRD: Diff-Aware Artifact Draft Review

## Summary

Launchpad should review artifact edits as revision-bound drafts with canonical diff metadata, rendered through `@pierre/diffs`.

This is not a presentation-only change. The system should understand:

- what artifact revision a draft was based on
- what changed in title and body
- whether a draft is stale
- how to show that review state clearly before apply/discard

## Problem

The old artifact review flow stored full proposed documents but had no durable diff model or revision guardrail. That created two product gaps:

1. Review polish was limited by an editor-oriented merge surface.
2. Drafts could become semantically stale if the artifact changed after the draft was created.

## Goals

1. Keep AI authoring simple by continuing to submit full revised markdown.
2. Compute and persist canonical diff metadata on the backend.
3. Add explicit artifact revisioning and block stale draft applies.
4. Render pending draft review with `@pierre/diffs`.
5. Preserve the current apply/discard workflow for v1.

## Non-goals

- Per-hunk accept/reject in v1
- Auto-rebase of stale drafts
- New artifact workflow concepts beyond the current draft/apply/discard model

## Product requirements

### Draft model

- Every artifact has an integer `revision`
- Every newly created artifact draft stores:
  - base artifact revision
  - base title
  - base content markdown
  - canonical patch metadata
  - change summary
- Drafts remain `pending`, `applied`, or `discarded`

### Draft apply behavior

- Applying a draft succeeds only when `artifact.revision === draft.baseArtifactRevision`
- Applying a valid draft updates artifact title/body and increments `artifact.revision`
- Direct artifact edits also increment revision when title/body changes
- Stale drafts stay visible but cannot be applied

### Review experience

- Pending drafts still appear above the artifact surface
- Compare mode defaults to unified diff
- Users can switch to split diff
- Title changes render separately from the body diff
- Change summary is visible in both draft list and review header
- Stale drafts show a clear blocked state and disabled apply action

### Legacy compatibility

- Old pending drafts are hydrated lazily on read when the original base can still be inferred safely
- If the original base cannot be trusted, mark the draft stale instead of guessing

## Technical direction

- Compute diff metadata in the backend with `@pierre/diffs`
- Store both proposed full text and canonical patch metadata in v1
- Keep the UI thin: it renders stored diff state and reflects stale/apply availability
- Isolate the `@pierre/diffs` integration inside a dedicated Svelte wrapper

## Success criteria

- New drafts always carry base revision and patch metadata
- Applying stale drafts is blocked
- Review UI is clearer than the previous merge editor
- Existing read/edit/preview flows remain intact
- Legacy pending drafts degrade safely
