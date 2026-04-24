# PRD: User-Created Artifacts, Project-Wide Artifact Mentions, and Generalized Workspace AI

## Summary

Launchpad will let users manually create their own markdown artifacts from the workspace sidebar and global command palette. Manual artifact creation will open an editor-style creation flow with title, type, and body fields, saving only when the user submits.

Project chat `@` mentions will expand from thread-linked artifacts only to all artifacts in the same project. When a user mentions a project artifact that is not yet linked to the current thread, sending the message will also link it into that thread as imported context.

The workspace AI prompt will be reworked from a narrow "idea/PRD coach" into a broader builder workspace assistant aligned with `product-overview.md`: help users think in threads, preserve durable memory as artifacts, use project context, and move toward scoped buildable work.

## Problem Statement

Users can currently get artifacts through AI workflows and edit existing artifacts, but they cannot directly create their own durable artifacts from the main workspace navigation. This makes artifacts feel like assistant outputs instead of first-class user-authored workspace memory.

Project-scoped work also has a context gap: artifacts created in one project thread are not easy to reference from another project thread unless they are manually imported first. This weakens project continuity and makes the `@` flow feel narrower than the product model.

The AI chat prompt is too specific to idea shaping and PRDs. Launchpad's current vision is broader: a chat-first workspace where builders think in threads, preserve useful memory as artifacts, organize work into projects, and use AI to move toward scoped, buildable work.

## Solution

Add direct user-created artifacts, make project artifacts referenceable from any thread in the same project, sync all canonical artifact saves to Supermemory, and update the chat prompt to reflect Launchpad's broader builder workspace vision.

## User Stories

1. As a user, I want to create an artifact from the sidebar, so that I can capture durable workspace memory without asking AI.
2. As a user, I want to create an artifact from the command palette, so that artifact creation is available from anywhere.
3. As a user, I want to choose a preset artifact type or custom type, so that my documents stay organized without being constrained.
4. As a user, I want to write artifact markdown before saving, so that empty accidental artifacts are not created.
5. As a user in a project, I want new artifacts to belong to the active project by default, so that project memory stays grouped.
6. As a user in a thread, I want new artifacts to be linked to that thread, so that the chat can reference them later.
7. As a user, I want manually created artifacts to sync into memory, so that AI can recall them when relevant.
8. As a user, I want artifact edits to update memory, so that AI does not rely on stale artifact content.
9. As a user in a project thread, I want to `@` mention artifacts from other threads in the same project, so that project context is reusable.
10. As a user, I want mentioned project artifacts to become part of the thread context, so that future turns remain consistent.
11. As a user in a general thread, I want `@` behavior to remain focused on thread-linked artifacts, so that unrelated workspace memory does not crowd the picker.
12. As a user, I want the assistant to understand Launchpad as a workspace, so that it can help with ideas, planning, artifacts, and project work without overfitting to PRDs.

## Implementation Decisions

- Reuse the existing artifact schema: markdown content, flexible string type, optional project id, optional source thread id.
- Add the smallest UI flow that supports manual creation: a focused editor modal using existing workspace styling.
- Use artifact type presets for Idea, PRD, Research, and Notes, plus a custom type field.
- Keep Supermemory sync outside the critical artifact persistence path: artifact save succeeds even if sync is disabled, blocked, or fails.
- Keep `@` tokens unchanged as `@artifact:<id>` to avoid changing persisted message format.
- In general threads, mention only thread-linked artifacts.
- In project threads, mention thread-linked artifacts plus all artifacts in the same project.
- Link same-project mentioned artifacts into the active thread on send with reason `imported`.
- Do not add thread mentions in this PRD.
- Do not add new first-class artifact tables or strict artifact subtypes.

## Testing Decisions

The user will manually test this feature. Implementation should still run the standard project checks:

- `npm run check`
- `npm run lint`

Manual acceptance scenarios:

- Create an artifact from the sidebar with a preset type and markdown body.
- Create an artifact from the command palette with a custom type.
- Confirm project-launched artifacts appear under that project.
- Confirm thread-launched artifacts appear in that thread context.
- Edit a manually created artifact and confirm save succeeds.
- In one project thread, create or link an artifact.
- In a different thread in the same project, open the `@` picker and select that artifact.
- Send the message and confirm the artifact becomes linked/imported into the active thread.
- Confirm a general thread does not show unrelated project artifacts in the `@` picker.
- Confirm chat still works if Supermemory sync is unavailable.
- Confirm the assistant's responses are broader than PRD coaching while still favoring useful artifacts and scoped project work.

## Out of Scope

- Thread mentions.
- Strict artifact subtypes or a new artifact schema.
- A separate artifact creation route.
- Automatic creation of artifacts without explicit user action.
- New automated tests for this PRD.

## Further Notes

Artifacts remain canonical workspace memory. Supermemory is derived recall infrastructure and should never replace Convex artifact state.
