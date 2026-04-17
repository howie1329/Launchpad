# PRD: Chat-First Launchpad For Turning Pain Points Into Projects

## Problem Statement

Launchpad currently behaves like separate tools: Ideas for chat-based exploration and Scope/MVP Creator for generating PRDs. That split does not match the desired workflow.

The first user wants one place to start with a rough thought, explore whether it represents a real pain point, shape it into an idea, draft research plans, create an MVP/PRD, define tests, and promote the work into a durable project. The product should feel like a focused ChatGPT-style workspace, but with structured memory: projects, loose ideas, PRDs, MVP scope, research plans, and test lists.

The current artifact-first navigation makes the user choose the tool before the work is clear. The new direction should let the conversation lead, while the app quietly creates and organizes structured outputs.

## Solution

Reposition Launchpad as a chat-first workspace for builders turning pain points into scoped, buildable software projects.

The main interface becomes a persistent chat surface. The sidebar becomes workspace memory, organized around `New Chat`, `Inbox`, `Projects`, `Loose Ideas`, `Recent`, and `Settings`. Projects become the top-level container for mature work. Ideas may exist outside projects until promoted.

The right panel shows one active artifact at a time, such as an idea outline, PRD, MVP scope section, research plan, or test list. AI can draft updates, but saved artifact changes require explicit user confirmation through an "Apply" action.

The first shippable version should support:

- Context-specific chats attached to inbox, loose ideas, projects, or PRDs.
- Loose ideas that can be explored before becoming projects.
- Projects as top-level containers for mature work.
- Human-editable PRDs as canonical documents.
- MVP scope and test list as editable PRD sections.
- AI-generated research plans, competitor scan plans, pain-point search plans, and customer interview plans, without live web automation in v1.
- "Create project from this" flow that links the source idea, attaches or creates the PRD, and makes future chats use the project as context.
- Workflow SDK documented as a future extension for long-running research workflows, not included in v1.

## User Stories

1. As the first user, I want to start a new chat from the dashboard, so that I can capture a rough product thought immediately.
2. As the first user, I want loose ideas to exist outside projects, so that early thoughts do not require project structure too soon.
3. As the first user, I want to promote a loose idea into a project, so that promising ideas become durable workspaces.
4. As the first user, I want projects to contain related ideas, PRDs, research plans, MVP scope, tests, and chats, so that all context stays together.
5. As the first user, I want each chat to have a clear context, so that future AI responses use the right project, idea, or PRD.
6. As the first user, I want the sidebar to show Projects, Loose Ideas, Recent, Inbox, and Settings, so that I can quickly resume work.
7. As the first user, I want to ask "turn this into an MVP," so that the current idea becomes a structured PRD/MVP draft.
8. As the first user, I want AI-generated changes to appear as drafts before being applied, so that saved work is not mutated unexpectedly.
9. As the first user, I want to approve artifact updates, so that I stay in control of my project memory.
10. As the first user, I want PRDs to be human-editable, so that I can refine the document directly after AI generates a starting point.
11. As the first user, I want MVP scope to live inside the PRD, so that scope and requirements do not fragment into separate documents too early.
12. As the first user, I want test scenarios to live inside the PRD, so that the PRD describes both what to build and how I will know it works.
13. As the first user, I want AI to draft research plans, competitor scan plans, pain-point search plans, and customer interview plans, so that I can validate ideas before building.
14. As the first user, I want live web research to be deferred, so that the first version stays focused and shippable.
15. As the first user, I want a project created from an idea to retain links back to the source idea and PRD, so that the project history remains understandable.
16. As the first user, I want future chats inside a project to use prior artifacts as context, so that I do not need to repeat the same background.
17. As the first user, I want the dashboard home to help me continue recent work, so that Launchpad feels like an active workspace rather than a menu.
18. As the first user, I want the app to stay builder-focused, so that it remains opinionated around turning pain points into software projects.

## Implementation Decisions

- Use **Projects** as the top-level mature container. Projects can own or link ideas, PRDs, research plans, chat sessions, and future task/build artifacts.
- Keep **Loose Ideas** outside projects until promoted. A loose idea may later receive a project association.
- Use **context-specific chat sessions**. Each chat has a context such as inbox/general, idea, project, or PRD.
- Replace the current tool-first mental model with a **chat-first workspace**. The chat is the primary interaction surface; artifacts are created, previewed, edited, and applied alongside it.
- The sidebar should organize memory as `New Chat`, `Inbox`, `Projects`, `Loose Ideas`, `Recent`, and `Settings`.
- The right panel shows one active artifact at a time. Artifact switching is explicit, not multiple side panels at once.
- AI changes to saved artifacts use a **draft then apply** flow. The AI can propose updates, but user confirmation writes to saved records.
- PRDs are canonical editable documents. Version history stores immutable snapshots.
- MVP scope and test list are sections inside the PRD, not separate v1 artifact types.
- Research in v1 is generated as structured plans, not automated live web research.
- Workflow SDK is not part of v1 implementation. It is noted as a future engine for durable, resumable research workflows.
- "Create project from this" creates a project, links the source idea, attaches or creates the PRD, and routes future chat context to the project.
- Product positioning is builder-focused: Launchpad helps the first user turn pain points into scoped software projects.

## Important Interfaces And Types

- Add a `projects` domain model with title, description/summary, status, owner, timestamps, and links to associated artifacts.
- Add or evolve chat sessions so each session records its context type and context id.
- Allow ideas to optionally reference a project once promoted.
- Allow PRDs to optionally reference a source idea and/or project.
- PRD content should include editable sections for problem, target user, MVP scope, requirements, out of scope, research plan, test scenarios, and build plan.
- Add artifact draft/application behavior: AI-generated updates are represented as pending changes until the user applies them.
- Add project creation behavior that links existing source artifacts rather than copying them.

## Testing Decisions

- Test external behavior, not implementation details.
- Test project creation from an idea: source idea remains accessible, project is created, PRD is linked or created, and future chat context points at the project.
- Test loose ideas: ideas can exist without a project and later be promoted.
- Test PRD editing: manual edits persist as the canonical draft.
- Test PRD versioning: snapshots are immutable and do not overwrite the editable draft.
- Test AI draft application: suggested updates do not mutate saved records until explicitly applied.
- Test chat context: project chats include project-linked artifacts; idea chats include idea context; inbox chats do not accidentally attach to the wrong object.
- Test dashboard/sidebar behavior: recent projects, loose ideas, and active contexts appear in the expected places.
- Test research plan generation as structured artifact content, without depending on live web access in v1.

## Out Of Scope

- Live web search, automated competitor scanning, automated pain-point scraping, and long-running research jobs.
- Workflow SDK integration.
- Full task management or project execution tracking.
- Multi-user collaboration.
- Public sharing.
- Complex artifact branching or merge flows.
- Generic creative-project support beyond builder/software project workflows.

## Further Notes

The core product move is not "add more tools." It is to make chat the primary interface and make Projects, Ideas, PRDs, research plans, and test lists structured memory that the chat can create, update, and reuse.

V1 should stay intentionally small: chat-first dashboard, projects, loose ideas, editable PRDs, MVP/test sections, project promotion, and AI draft/apply behavior.
