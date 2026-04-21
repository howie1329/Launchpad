# Diffs.com Integration Evaluation for Launchpad

## Decision

Launchpad now treats diffs for artifacts as a **product capability**, not just a compare-widget swap.

We are using `@pierre/diffs` for the artifact draft review surface, but the meaningful product change is broader:

- artifact edits are revision-aware
- draft changes persist canonical diff metadata
- stale drafts are blocked from apply
- legacy pending drafts are hydrated lazily when possible

## What changed

### Before

- Artifact drafts stored only proposed title/body
- Compare view rendered a client-side read-only CodeMirror merge surface
- No explicit artifact revision
- No stale-draft protection beyond current pending/apply flow

### After

- `artifacts` carry an explicit `revision`
- `artifactDraftChanges` capture:
  - `baseArtifactRevision`
  - `baseTitle`
  - `baseContentMarkdown`
  - `patch`
  - `changeSummary`
  - optional `staleReason`
- draft creation still accepts full revised markdown
- server computes canonical diff metadata with `@pierre/diffs`
- apply fails when the artifact revision no longer matches the draft base revision
- review UI renders through a dedicated `@pierre/diffs` wrapper

## Why this is the right scope

Replacing only the visual renderer would have improved polish, but it would not have solved the actual artifact-review problem:

- users could still apply drafts created against outdated artifact state
- the backend would still have no durable diff model
- future selective-apply or change navigation work would still require another model rewrite

This implementation fixes the model first and uses `@pierre/diffs` as the review surface on top of it.

## Renderer choice

`@pierre/diffs` is a good fit because it gives us:

- unified and split review modes
- strong markdown/code rendering for long documents
- a durable diff metadata model we can store and reuse
- a path to future selective apply without changing libraries again

## Known boundaries

- v1 remains all-or-nothing apply/discard
- legacy drafts can only be hydrated safely when the current artifact still matches the pre-revision state we can infer
- unsafe legacy drafts are marked stale instead of guessed into applicability

## Current implementation touchpoints

- `src/convex/artifactDiffs.ts`
- `src/convex/artifacts.ts`
- `src/convex/schema.ts`
- `src/lib/components/workspaces/ArtifactDiffRendererDiffs.svelte`
- `src/lib/components/workspaces/WorkspaceArtifactReader.svelte`
