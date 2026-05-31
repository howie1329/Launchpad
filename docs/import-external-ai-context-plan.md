# Import External AI Context Plan

## Overview

LaunchPad will support importing useful project context from external AI tools such as ChatGPT or Claude. Users will copy a LaunchPad-provided prompt into the external tool, paste the returned Markdown summary back into LaunchPad, review an AI-generated project proposal, and then create a new project.

The MVP supports **new project creation only**. It does not merge into or update existing projects.

## Locked MVP Decisions

- New project creation only.
- Entry point lives under **New Project**.
- Flow uses a near-fullscreen modal/overlay wizard.
- External tool output uses Markdown with strict headings.
- LaunchPad does not pre-parse or validate the Markdown before synthesis.
- AI synthesis starts when the user clicks **Review Project**.
- Review Project creates a durable Convex import draft/job.
- User can leave and resume later.
- A full inbox/notification system is included.
- Review output is editable before anything permanent is created.
- Final create makes:
  - a new project
  - a raw source artifact titled **Imported external context**
  - a generated artifact titled **Project Brief**
- MVP does not create tasks, folders, separate decision records, goal records, or separate memory entries.
- No automatic Project Brief prompt injection into every chat.
- Main chat gets targeted artifact tool-use steering for project-scoped conversations.

## User Flow

### 1. Start Import

The user clicks **New Project** and sees options such as:

- **Start from scratch**
- **Import external AI context**

Choosing import opens a near-fullscreen modal/overlay wizard.

### 2. Copy Prompt

LaunchPad shows instructions and a copyable prompt/template.

The user copies the prompt into ChatGPT, Claude, or another AI tool where the existing project context lives.

### 3. Paste External Summary

The external AI returns a structured Markdown project summary.

The user pastes that Markdown into a large textarea in LaunchPad.

No strict client-side parsing is required. The pasted text is sent to the synthesis workflow as-is.

### 4. Review Project

When the user clicks **Review Project**:

- LaunchPad creates a temporary import draft/job in Convex.
- A Convex-backed async workflow/action runs AI synthesis.
- The draft status changes through `pending`, `processing`, `ready`, or `failed`.
- The user can stay in the wizard or navigate elsewhere.

### 5. Inbox Notification

When synthesis completes, LaunchPad creates a notification such as:

> Your imported project is ready to review.

The notification links back to the import review flow for that draft.

### 6. Review and Edit

The review screen shows editable generated output before permanent creation.

Editable:

- Project name
- Project overview/summary, if supported by the project model
- Generated Project Brief Markdown

Preview-only:

- Raw imported external context

The user can go back to change the pasted source if needed.

### 7. Create Project

After confirmation, LaunchPad creates:

1. A new project
2. Source artifact: **Imported external context**
3. Generated artifact: **Project Brief**

Then LaunchPad:

- marks the draft as `created`
- stores the created `projectId`
- completes or dismisses the notification
- redirects the user to the new project landing page

## Information Architecture

### Project

The imported project should contain:

- name
- summary/overview, if supported
- metadata indicating it came from an external context import

### Source Artifact

Title:

> Imported external context

Purpose:

- Preserve the raw imported Markdown.
- Provide traceability for the generated Project Brief.
- Let users compare the original source with LaunchPad's synthesis.

The source artifact is not edited directly in the review step. If the user wants to change it, they return to the paste step.

### Generated Artifact

Title:

> Project Brief

Purpose:

- Serve as the curated project context artifact.
- Include summary, background, goals, decisions, open questions, next steps, constraints, and durable context.
- Give future project chats a clear artifact to discover and read.

### Out of Scope for MVP

The MVP does not create:

- tasks
- folders
- separate goals records
- separate decisions records
- separate project memory entries
- existing-project updates

## Memory and Retrieval Strategy

LaunchPad's durable source of truth should remain project artifacts. Supermemory can enhance recall, but the import feature should be valuable even if memory sync is absent or delayed.

Do not build separate memory candidate review or memory-entry creation in MVP.

The Project Brief artifact is the reliable imported-context object. The main AI chat should be encouraged to discover project artifacts when the user asks project-contextual questions.

### Main Chat Tool-Use Steering

Do not inject the Project Brief into every project chat.

Instead, update the main chat instruction with targeted tool-use guidance:

> In project-scoped chats, when the user asks about project goals, decisions, plans, requirements, next steps, prior context, or asks to continue work, use `listProjectArtifacts` or `searchArtifacts` to look for relevant project artifacts before answering from general knowledge. Prefer artifacts titled “Project Brief”, “Imported external context”, PRDs, plans, or recent artifacts. Do not call tools for simple greetings, purely general questions, or when the relevant artifact is already referenced in the prompt.

## Data Model Implications

### `externalContextImportDrafts`

Add a table for resumable imports.

Suggested fields:

- `ownerId`
- `sourceMarkdown`
- `status`
  - `pending`
  - `processing`
  - `ready`
  - `failed`
  - `created`
  - `abandoned`
- `generatedProjectName`
- `generatedProjectSummary`
- `generatedProjectBriefMarkdown`
- `errorMessage`
- `createdProjectId`
- `sourceKind`, for example `external_ai_context`
- `sourceToolHint`, for example `chatgpt`, `claude`, `other`, or `unknown`
- `modelUsed`
- `createdAt`
- `updatedAt`
- `completedAt`
- `projectCreatedAt`

Suggested indexes:

- by owner and status
- by owner and updated time

### `notifications`

Add a generic notification/inbox table.

Suggested fields:

- `ownerId`
- `type`
  - `external_context_import_ready`
  - `external_context_import_failed`
- `title`
- `body`
- `status`
  - `unread`
  - `read`
  - `dismissed`
- `targetKind`
  - `externalContextImportDraft`
- `targetId`
- `createdAt`
- `readAt`
- `dismissedAt`

The import draft remains the source of truth. The notification is the user-facing pointer back to review.

## AI Synthesis Output

The synthesis workflow should produce a simple structured draft:

```ts
{
  projectName: string;
  projectSummary: string;
  projectBriefMarkdown: string;
}
```

Behavior requirements:

- Do not invent details not supported by the pasted summary.
- Put unclear information under open questions or unknowns.
- Keep output useful for non-technical users.
- Prefer concise, scannable Markdown.
- Do not produce tasks, folders, memory entries, or other entities in MVP.

## External Prompt Template

LaunchPad should provide this copyable prompt:

```markdown
I want to import this project context into LaunchPad, a project-focused AI workspace.

Please summarize the current conversation/project using the exact Markdown structure below.

Important rules:
- Do not invent details.
- If something is unclear or missing, write it under "Things Not Known" or "Open Questions".
- Prefer concise, practical bullets.
- Preserve important decisions, goals, constraints, and next steps.
- Write this so another AI assistant can help me continue the project later.

# Project Name

[Suggest a clear project name.]

## One-Sentence Summary

[Summarize the project in one sentence.]

## Background

[Explain the relevant context, history, problem, audience, and why this project matters.]

## Goals

- [Goal 1]
- [Goal 2]
- [Goal 3]

## Key Decisions

- [Decision 1 and why it was made]
- [Decision 2 and why it was made]

## Constraints and Requirements

- [Important constraint, requirement, platform, stack, timeline, style, or business rule]

## Open Questions

- [Question 1]
- [Question 2]

## Next Steps

- [Concrete next step 1]
- [Concrete next step 2]
- [Concrete next step 3]

## Useful Files, Artifacts, or References

- [Mention any documents, files, links, designs, notes, or artifacts that matter]

## Durable Project Context

[Write facts, preferences, definitions, or project-specific context that would help an AI assistant continue the work accurately.]

## Things Not Known

- [Anything important that is missing, uncertain, or should not be assumed]
```

## Edge Cases and Risks

### Long Pasted Summaries

Risk: the AI request is too large.

Plan:

- Set input length limits.
- Show a user-friendly error if too long.
- Suggest asking the external AI for a shorter summary.

### AI Synthesis Failure

Risk: the async synthesis action fails.

Plan:

- Mark the draft as `failed`.
- Create or update a failure notification.
- Let the user retry from the same source Markdown.

### User Leaves During Processing

Risk: the flow is lost.

Plan:

- Persist the Convex draft.
- Let the inbox notification link back to the review step.

### User Closes Wizard Before Creating

Risk: orphaned drafts.

Plan:

- Keep drafts resumable.
- Let users abandon or dismiss them.
- Add cleanup later for old abandoned drafts if needed.

### Hallucinated Project Details

Risk: the generated brief adds unsupported facts.

Plan:

- Strong synthesis prompt says not to invent.
- Review screen is editable.
- Raw source artifact is preserved for comparison.

### Sensitive Pasted Data

Risk: users paste secrets or private data.

Plan:

- Warn users near the paste box not to paste passwords, API keys, private keys, or sensitive personal data.
- Existing artifact memory safety checks may block suspicious content from memory sync.

### Notification Scope Creep

Risk: inbox becomes larger than needed.

Plan:

- Build a generic but minimal notification system.
- Initially support import-ready and import-failed notifications only.

## Phased Implementation Plan

### Phase 1: Data Model

- Add `externalContextImportDrafts`.
- Add `notifications`.
- Add indexes by owner, status, and timestamps.
- Add Convex mutations/queries for:
  - create draft
  - get draft
  - list active drafts
  - update draft status
  - mark draft created
  - create/list/read/dismiss notifications

### Phase 2: AI Import Synthesis Workflow

- Add Convex action or server-backed async workflow for draft synthesis.
- On Review Project:
  - create draft
  - mark processing
  - run AI synthesis
  - save generated fields
  - mark ready or failed
  - create notification

### Phase 3: Import Wizard UI

- Add **Import external AI context** to the New Project dropdown.
- Build near-fullscreen multi-step wizard:
  - Copy prompt
  - Paste summary
  - Processing
  - Review/edit
  - Create
- Support reopening an existing draft.

### Phase 4: Create Project From Draft

- Add mutation/server flow to:
  - create project
  - create raw source artifact
  - create Project Brief artifact
  - mark draft created
  - complete notification
  - redirect to project

### Phase 5: Inbox / Notifications UI

- Add inbox/notification surface.
- Show import-ready and import-failed notifications.
- Let users jump to review.
- Let users dismiss or abandon.

### Phase 6: Main Chat Tool-Use Steering

- Update main chat system/tool instructions for project-scoped artifact discovery.
- Encourage targeted use of project artifact tools when users ask about project context.

### Phase 7: Validation

Test:

- Happy path import.
- Leaving wizard during processing and resuming from notification.
- Failed synthesis retry.
- Creating project from edited draft.
- Confirming no project/artifacts are created before final confirmation.
- Confirming first project chat can discover Project Brief via tools.
