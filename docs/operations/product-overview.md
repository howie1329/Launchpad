# Launchpad — product overview

This document is a **full breakdown of what the product is today**: who it serves, what you can do in the app, and how the main pieces fit together. For a concise maintainer-oriented inventory (schema, env vars, gaps vs the PRD), see [current-state.md](current-state.md). For original vision and roadmap framing, see [chat-first-launchpad-prd.md](chat-first-launchpad-prd.md).

---

## What Launchpad is

**Launchpad is a chat-first workspace for solo developers and indie hackers.** The goal is to help you turn rough thoughts into **scoped, buildable work** before you over-invest in code.

You work primarily inside a single signed-in shell: **`/workspace`**. There you:

- **Think in chat threads** — general brainstorming or project-scoped conversations.
- **Persist memory as artifacts** — durable markdown documents (ideas, PRDs, and other labeled types).
- **Graduate to projects** when an idea deserves a named container for chats and artifacts.
- **Use an AI assistant** that can read and write workspace data through tools (create artifacts, propose edits as drafts, import project context, and more).

The marketing home at **`/`** explains the value proposition to visitors; the **live product** is the workspace, not a one-off form or separate “ideas database” screen.

---

## Who it is for

- **Solo builders** who want structure without enterprise process overhead.
- **Indie hackers** who need a lightweight place to clarify problems, scope an MVP, and keep PRD-style notes next to the conversation that produced them.

---

## Core concepts

### Workspace

The **workspace** is the main application surface after sign-in: a **sidebar** (projects, chats, artifacts), a **header** that reflects the current thread, artifact, or project, and a **main area** for chat or landing content. Navigation is **URL-driven** using query parameters (`project`, `thread`, `context`, `start`) so links are shareable and bookmarkable.

### Threads (chats)

A **thread** is a persisted conversation. Threads can be:

- **General** — not tied to a project (good for early exploration).
- **Project-scoped** — created under a **project** so chats and artifacts stay grouped.

Messages are stored in Convex as **AI SDK–compatible messages** (roles and parts), with model selection tracked for workspace chat.

### Artifacts

An **artifact** is a **markdown document** with a **title**, a flexible string **type** (conventions include `idea`, `prd`, plus `research`, `markdown`, or custom labels), and optional links to a **project** and **source thread**. The UI groups artifacts by type for browsing.

Artifacts can be:

- **Linked to a thread** with a reason: created in-thread, referenced, or imported from project memory.
- **Opened in a full-page reader** for reading, editing (CodeMirror), preview (Streamdown), and **comparing** assistant-proposed drafts to the current body.

**Important behavior:** the assistant does not silently overwrite artifacts. Changes go through **draft changes** that you apply or discard.

### Draft changes

When the AI (or workflow) proposes edits to an artifact, Launchpad stores a **draft change** record: proposed title and markdown, optional summary, and status **pending**, **applied**, or **discarded**. The artifact reader is where you review diffs and commit or drop them.

### Projects

A **project** is an owner-scoped container with a name and optional summary. It owns **threads** and can own **artifacts**. You can **create a project from an active chat** (promotion) so the thread and its linked artifacts move under that project—implemented as Convex mutations coordinated with the assistant’s tools.

---

## AI assistant (workspace chat)

Workspace chat calls a **SvelteKit API route** that streams responses using the **Vercel AI SDK** and **Vercel AI Gateway** for model access. The server runs a **tool loop agent** with workspace-specific tools, for example:

- List and read artifacts linked to the current thread.
- List and import artifacts from the current project (when in a project chat).
- Create **idea** and **PRD** artifacts (markdown) after user-aligned actions.
- **Propose edits** to existing thread-linked artifacts (draft changes).
- **Create a project from the current thread** when the user wants to promote work.
- Search the web and read source pages when Tavily is configured and current external context matters.

The chat UI shows tool activity in expandable steps with human-readable summaries and optional technical JSON for debugging.

**Usage and limits:** runs are metered (tokens and estimated cost). Users have a **daily AI spend cap** in USD (per user, per calendar day in their timezone). The shell and settings show **budget status**; exceeding the cap blocks new chat requests until the next day or a higher cap.

**Roadmap (engineering):** Planned additions to the tool surface and patterns for durable background work are documented in [ai-chat-tools-and-vercel-workflows.md](ai-chat-tools-and-vercel-workflows.md) and [durable-workflows-and-orchestration.md](durable-workflows-and-orchestration.md).

---

## Settings and activity

**`/workspace/settings`** includes:

- **Timezone** — used for daily usage boundaries and date keys.
- **Daily AI cap (USD)** — stored per user; combined with model pricing to enforce spend.
- **AI usage summary** — spend vs cap for the current period.
- **Activity feed** — workspace events such as thread creation, project creation, artifact creation, and draft apply/discard (backed by `activityEvents` in Convex).

---

## Routes (product map)

| Route                               | Purpose                                                                                             |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| `/`                                 | Marketing home; sign-in entry points                                                                |
| `/auth`                             | Sign in and sign up (Convex Auth)                                                                   |
| `/workspace`                        | Main shell: sidebar, chat landing or active thread (query: `project`, `thread`, `context`, `start`) |
| `/workspace/settings`               | Timezone, daily AI cap, usage, activity                                                             |
| `/workspace/artifacts/[artifactId]` | Full-page artifact reader/editor                                                                    |

**API (not a page):** `POST /api/workspace/chat` — authenticated streaming chat for workspace threads.

---

## Technical stack (summary)

| Layer            | Choice                                                |
| ---------------- | ----------------------------------------------------- |
| Frontend         | SvelteKit, Svelte 5 (runes), TypeScript               |
| UI               | Tailwind CSS v4, shadcn-svelte (Bits UI)              |
| Backend / data   | Convex — queries, mutations, realtime subscriptions   |
| Auth             | Convex Auth (`@convex-dev/auth`)                      |
| Client data      | `convex-svelte`                                       |
| AI               | `ai`, `@ai-sdk/svelte`; models via Vercel AI Gateway  |
| Artifact editing | CodeMirror (markdown + merge), Streamdown for preview |

---

## Data model (Convex)

High-level tables (see `src/convex/schema.ts` for the source of truth):

| Area          | Tables                                                     |
| ------------- | ---------------------------------------------------------- |
| Auth          | Convex Auth tables                                         |
| User prefs    | `userSettings` — timezone, daily AI cap                    |
| Usage         | `aiUsageEvents`, `aiDailyUsage` — token and cost rollups   |
| Workspace     | `projects`, `chatThreads`, `chatMessages`                  |
| Content       | `artifacts`, `threadArtifactLinks`, `artifactDraftChanges` |
| Observability | `activityEvents` — user-visible history                    |

Ownership is consistently **`ownerId`** (Convex Auth user id); server code uses helpers in `src/convex/authHelpers.ts`.

---

## Environment variables

| Variable             | Role                                                                   |
| -------------------- | ---------------------------------------------------------------------- |
| `PUBLIC_CONVEX_URL`  | Convex deployment URL (browser client and server HTTP client)          |
| `AI_GATEWAY_API_KEY` | Private key for Vercel AI Gateway (workspace chat streaming)           |
| `TAVILY_API_KEY`     | Private key for optional workspace chat web search and page extraction |

Convex deployment configuration follows [Convex environment variables](https://docs.convex.dev/production/environment-variables).

---

## Development

From the repository root:

```sh
npm install
npm run dev
```

For full-stack local development (frontend + Convex):

```sh
npm run dev:all
```

Quality checks: `npm run check`, `npm run lint`, `npm run format`.

---

## Related documentation

| Document                                                                         | Contents                                                     |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [README.md](../README.md)                                                        | Quick start, stack, env, tooling                             |
| [current-state.md](current-state.md)                                             | Maintainer snapshot vs PRD, architecture notes               |
| [chat-first-launchpad-prd.md](chat-first-launchpad-prd.md)                       | Original product vision and MVP scope                        |
| [ai-chat-tools-and-vercel-workflows.md](ai-chat-tools-and-vercel-workflows.md)   | Workspace AI tools: implemented set, planned tools, UI notes |
| [durable-workflows-and-orchestration.md](durable-workflows-and-orchestration.md) | Background workflows, runtime comparison, product catalog    |
| [design-system.md](design-system.md)                                             | Visual and interaction principles                            |
| [artifact-schema-plan.md](artifact-schema-plan.md)                               | Markdown-first artifact rationale                            |

---

## Product status

Launchpad is under active development. Treat the **chat-first PRD** as direction; **this file** and **current-state.md** describe what is implemented in the repo. When in doubt, verify behavior in the UI and in `src/convex` and `src/routes`.
