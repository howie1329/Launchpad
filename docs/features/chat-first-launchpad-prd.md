# Product Positioning
Launchpad is a chat-first workspace for builders who turn raw pain points into scoped software projects. Chat is the primary interface; structured artifacts are persistent workspace memory created and refined from the conversation.

# Problem Statement
Today’s workflow still feels tool-first: users pick “ideas” or “PRD tools” before they know what they’re building. That creates friction, fragmented context, and duplicate work.

Why the old model fails:
- It forces early structure before the idea is mature.
- It treats artifacts as destinations instead of outputs of reasoning.
- It mixes thread context and project memory in ways that make AI responses noisy.
- It encourages a file-manager mental model instead of a builder workflow.

The target user needs one continuous loop: think in chat, capture decisions as artifacts, promote when ready, and continue with stronger context.

# Solution
Launchpad will center the product on persistent chat sessions with linked, editable artifacts.

Core model:
- Users can start in a **general chat** with no project attached.
- From chat, users can create a **Loose Idea** artifact.
- From a loose idea or chat, users can generate a **PRD** (including MVP scope and test scenarios).
- When work is mature, users can **promote to Project**.
- Inside a project, chats are **project-scoped** and load project context by default.

Artifacts are not passive files:
- Artifacts are directly editable.
- AI can create new artifacts from chat.
- AI can suggest updates to existing artifacts, but saved content changes only through draft-then-apply.

Thread UI stays focused:
- A thread shows artifacts created or referenced in that thread.
- It does not automatically dump every artifact from the project.
- Project memory remains available through a project artifact sidebar.
- Users explicitly bring project artifacts into thread context via actions like “Attach to chat” or “Import to context.”

# Core UX Principles
1. **Chat is primary**: every meaningful action starts from or returns to chat.
2. **Memory is structured**: artifacts are durable workspace memory, not transient assistant output.
3. **Context is explicit**: project-level memory exists globally, thread-level context is scoped intentionally.
4. **User controls writes**: AI suggestions are drafts until explicitly applied.
5. **MVP is narrow**: optimize for one strong loop over broad feature coverage.

# MVP Scope
In scope for v1:
- Persistent chat threads in two modes:
  - General (no project)
  - Project-scoped
- Artifact types:
  - Loose Idea
  - PRD (single doc type with required sections)
  - Optional lightweight Research Plan section inside PRD (planning only, no execution)
- PRD sections (editable):
  - Problem
  - Target user
  - Goals
  - MVP scope
  - Out of scope
  - Test scenarios
  - Research plan (structured plan, not automated research)
- Create PRD from chat/idea.
- Promote loose idea (or PRD-backed work) into a project.
- Project workspace with:
  - Project chats
  - Artifact sidebar (project memory)
- Thread artifact rail/list showing only artifacts created/referenced in that thread.
- Explicit context actions:
  - Attach to chat
  - Import to context
- AI draft-then-apply updates for existing artifacts.
- Direct manual editing of artifacts.

Not included in MVP scope definition:
- Additional first-class artifact types beyond Loose Idea and PRD.
- Any automation framework, web research, or workflow execution engine.

# Primary User Flows
1. **Start from a new chat**
   - User opens New Chat (general).
   - User describes a pain point.
   - AI helps clarify user, pain severity, and potential solution direction.

2. **Turn conversation into a loose idea**
   - User clicks “Save as Idea” (or accepts AI suggestion).
   - System creates Loose Idea linked to the thread.
   - Thread now shows this idea in its artifact list.

3. **Generate a PRD**
   - User asks for PRD from current conversation/idea.
   - System creates a PRD with required sections prefilled.
   - PRD opens in editor; user can edit immediately.

4. **Promote work into a project**
   - User chooses “Create Project from this.”
   - System creates project and links source idea/PRD.
   - Existing artifacts remain intact; promotion links them, not copies them.

5. **Continue inside a project chat**
   - User opens project and starts/continues project chat.
   - AI loads project context baseline (project metadata + linked core artifacts).
   - Thread remains focused on artifacts referenced in that thread.

6. **Open, edit, and import artifacts**
   - From project sidebar, user opens any project artifact.
   - User edits directly in artifact editor.
   - User can explicitly attach/import artifact into active thread context.
   - AI suggestions to existing artifacts appear as draft changes; user applies or discards.

# User Stories
1. As a builder, I can start with an unstructured pain point in chat so I can think before organizing.
2. As a builder, I can save promising threads as loose ideas without creating a project too early.
3. As a builder, I can generate an editable PRD from chat so I can move from exploration to execution quickly.
4. As a builder, I can promote mature work into a project so ongoing work has stable context.
5. As a builder, I can control which artifacts are in thread context so AI responses stay relevant.
6. As a builder, I can accept or reject AI-proposed edits so my saved docs do not change unexpectedly.

# Data / Domain Model
- **ChatThread**
  - `id`, `title`, `scopeType` (`general` | `project`), optional `projectId`, timestamps
- **Message**
  - `threadId`, `role`, `content`, timestamps
- **Artifact**
  - `id`, `type` (`idea` | `prd`), `title`, `content`, optional `projectId`, optional `sourceThreadId`, timestamps
- **Project**
  - `id`, `name`, `summary`, timestamps
- **ThreadArtifactLink**
  - Links artifacts that are created in, referenced in, or explicitly attached to a thread
- **ArtifactDraftChange**
  - `artifactId`, proposed patch/content, status (`pending` | `applied` | `discarded`), timestamps

Relationship rules:
- A loose idea is an artifact with no `projectId`.
- Promoting creates a Project and links existing artifacts via `projectId` (no forced duplication).
- Project chats have `scopeType=project` and a `projectId`.
- Thread context is derived from ThreadArtifactLink + explicit imports.

# Key Interaction Rules
1. **Thread artifact visibility rule**
   - Show in a thread only artifacts that were:
     - created in that thread,
     - referenced in that thread, or
     - explicitly attached/imported to that thread.

2. **Project memory visibility rule**
   - Project artifact sidebar shows all artifacts linked to the project.
   - This does not automatically place all project artifacts into active thread context.

3. **Context loading rule**
   - General chat: no project context loaded.
   - Project chat: load project baseline context (project summary + linked PRD and linked ideas).
   - Additional artifacts require explicit attach/import.

4. **Artifact edit rule**
   - Artifacts are directly editable by users at any time.
   - Saving manual edits updates canonical artifact content immediately.

5. **AI update rule (draft-then-apply)**
   - For existing artifacts, AI writes proposals to `ArtifactDraftChange`.
   - Canonical artifact content changes only when user selects Apply.
   - Discard leaves canonical content unchanged.

6. **PRD structure rule**
   - PRD is a single editable document type for MVP.
   - MVP scope, test scenarios, and research plan are sections in PRD, not separate artifact types.

7. **Promotion rule**
   - “Create Project from this” creates a project and links source artifacts.
   - Source idea remains accessible as historical input; it is not deleted.

8. **No automation rule (v1)**
   - Research output is planning text only.
   - No live web research, autonomous workflows, or long-running background agents.

# Testing Decisions
Focus tests on product behavior:
- Chat scope behavior:
  - General chat does not load project context.
  - Project chat loads baseline project context.
- Thread vs project memory behavior:
  - Thread shows only thread-linked artifacts.
  - Project sidebar shows all project artifacts.
  - Import/attach adds artifact to thread context.
- Artifact lifecycle behavior:
  - Create idea from chat.
  - Generate PRD from chat/idea.
  - Promote to project without duplicating or losing links.
- Editing and AI updates:
  - Manual edits persist immediately.
  - AI-proposed edits require apply to affect canonical content.
  - Discard keeps canonical content unchanged.
- PRD completeness checks:
  - PRD creation includes all required sections.

# Out of Scope
- Live web browsing, competitor scraping, or automated external research.
- Workflow SDK, background jobs, or long-running agent orchestration.
- Multi-user collaboration, comments, permissions, or workspace admin.
- Artifact branching, merge flows, or version-control-like document workflows.
- Turning every artifact subtype into a first-class object in v1.
- Generic non-software project planning.

# Open Questions
1. Should project baseline context include full PRD text by default, or a compressed summary + on-demand section retrieval?
2. Should one project have a single canonical PRD in v1, or allow multiple PRDs per project from day one?
