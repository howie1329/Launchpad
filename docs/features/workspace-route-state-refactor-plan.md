# Workspace Route-State Refactor Plan

## Summary

Refactor workspace navigation so primary product state uses path routes instead of query params. Keep one persistent workspace shell layout, but split route responsibilities into explicit route pages for home, project, thread, artifact, and settings.

## Canonical Routes

- `/workspace` — home / start chat
- `/workspace/project/:projectId` — project context landing
- `/workspace/thread/:threadId` — thread view
- `/workspace/artifacts/:artifactId` — artifact view
- `/workspace/settings` — settings

Allowed query params after refactor:

- `context=1` on thread route
- `version=<n>` on artifact route

Non-goals for this pass:

- Backward compatibility redirects from old query-based identity routes
- Behavior changes to workspace tab strip UX

## Implementation Plan

1. Replace query-based workspace URL helpers with path-based helpers and make them canonical across sidebar, command palette, and tab picker.
2. Update workspace target parsing/generation so tab identity maps to new routes and thread targets are keyed by `threadId` only.
3. Split route states:
   - keep `/workspace/+page.svelte` as home only
   - add `/workspace/project/[projectId]/+page.svelte`
   - add `/workspace/thread/[threadId]/+page.svelte`
4. Remove `start=1` URL state; use local ephemeral state to kick off initial assistant response.
5. Keep `context` and artifact `version` as query params.
6. Update workspace shell/layout logic to derive active project/thread from path params instead of `project`/`thread` search params.
7. Add lightweight route loaders to validate route params and produce consistent not-found behavior for malformed IDs.
8. Run typecheck and Svelte checks.

## Test Cases

1. Navigation links emit path-based routes only.
2. Creating chat from workspace home navigates to `/workspace/thread/:threadId` and triggers one initial assistant response.
3. Creating chat from project landing navigates to `/workspace/thread/:threadId`.
4. Thread context panel toggles via `?context=1` on thread route.
5. Artifact version selection still works via `?version=`.
6. Workspace tab strip continues to open/select/close tabs with canonical route targets.
7. Old query-based identity links are no longer generated anywhere in UI.
