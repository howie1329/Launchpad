# Promotion Readiness Gate PRD

## Linear Issue

THS-98 — PRD: Promotion readiness gate for turning chats into projects

## Problem Statement

Promotion is the key moment where exploratory chat becomes committed project work. The previous flow was too thin: users could create a project from a chat without first reviewing what was strong, what was missing, and which artifacts would move into the new project context.

This made promotion feel abrupt and made it easier to create poorly named or under-scoped projects.

## Solution

Add an explicit readiness gate before project creation. The gate reviews the active thread and linked artifact context, suggests project metadata, shows strengths and gaps, lists included artifacts, and requires user confirmation before calling the existing project creation mutation.

The existing `createProjectFromThread` mutation remains the final durable write boundary. Readiness output is generated on demand and is not persisted.

## User Stories

1. As a Launchpad user, I want to review a chat before turning it into a project, so that promotion feels intentional.
2. As a Launchpad user, I want suggested project name and summary fields, so that I can start from useful metadata instead of a blank form.
3. As a Launchpad user, I want to edit the suggested name and summary, so that the project reflects my intent.
4. As a Launchpad user, I want to see what is strong about the chat, so that I understand why it is ready to promote.
5. As a Launchpad user, I want to see missing information, so that I know what still needs clarification after promotion.
6. As a Launchpad user, I want to see which artifacts are included, so that I can confirm no linked context is unexpectedly lost.
7. As a Launchpad user, I want AI-assisted promotion requests from chat to require the same confirmation, so that the assistant cannot bypass review.
8. As a Launchpad user, I want promotion to still work if AI readiness fails, so that project creation is reliable.

## Requirements

- Promotion must be explicit and reviewable.
- Users must see suggested project name and summary before creation.
- Users must be able to edit project name and summary before creation.
- Users must see readiness strengths and missing information.
- Users must see the current thread and linked artifacts that will move into project context.
- Linked artifacts must be grouped as:
  - Created in this chat
  - Referenced/imported
- The final write must remain `createProjectFromThread`.
- Existing thread/artifact relationships must be preserved without duplication or data loss.
- AI chat tooling must not directly create projects from chats.

## Implementation Decisions

- Use an ephemeral SvelteKit API route for readiness generation.
- Do not add Convex readiness tables or persisted readiness records.
- Use server-side AI SDK calls for readiness analysis.
- Use recent thread messages plus artifact metadata only; do not include full artifact bodies in the readiness prompt.
- Return structured readiness fields:
  - `suggestedName`
  - `suggestedSummary`
  - `strengths[]`
  - `missingInformation[]`
  - `keyArtifacts[]`
  - `includedArtifacts[]`
- Do not use a numeric readiness score.
- If AI readiness fails or budget is exhausted, show deterministic fallback readiness and allow promotion.
- Replace the prior simple promotion dialog with a richer readiness dialog.
- Allow editing only project name and summary in v1.
- Do not allow artifact include/exclude selection in v1.
- Treat missing information as informational only.
- Hard-block only technical invalid states: missing project name, unauthenticated user, already-promoted thread, or mutation failure.
- Replace the chat AI `createProjectFromThread` tool with a non-mutating promotion-preparation tool that returns `requiresUserConfirmation: true` and renders a “Review and create project” CTA.

## UI Requirements

All UI must follow `docs/architecture/design-system.md`.

- Use a centered dialog on `bg-popover`.
- Keep typography quiet and compact.
- Use semantic color tokens only; no hardcoded colors.
- Avoid decorative gradients, heavy shadows, and nested card-like containers.
- Use one primary action: “Create project”.
- Keep secondary/cancel action visually quiet.
- Show loading as inline status text or button state, not a large spinner.

## Acceptance Criteria

- Opening promotion from the workspace header shows the readiness dialog before project creation.
- Opening promotion from the command palette shows the same readiness dialog.
- Asking the assistant to create/promote a project produces a non-mutating proposal and CTA, not a direct project creation.
- Confirmation calls the existing `createProjectFromThread` mutation.
- The promoted thread receives project scope/project id through the existing mutation path.
- Linked artifacts receive the project id through the existing mutation path.
- Artifact documents are not duplicated.
- Existing linked artifact rows are not deleted or recreated as part of promotion.
- AI readiness failure does not prevent explicit user-confirmed promotion.

## Out of Scope

- Persisting readiness history.
- Numeric readiness scoring.
- Artifact include/exclude controls.
- Full artifact-content analysis.
- New project templates or project-scoping workflows.
- Blocking promotion based on product-quality gaps.

## Validation Notes

- `npm run check` should pass.
- Changed files should pass ESLint.
- Convex mutation behavior should be covered by tests when the repo has a test harness available.
