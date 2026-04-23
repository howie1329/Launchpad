# Launchpad — Product Summary

## What Is It?

**Launchpad** is a chat-first workspace for solo developers and indie hackers. It helps you turn rough ideas into scoped, buildable work — before you over-invest in code.

Think in conversation threads, persist decisions as markdown artifacts, organize work into projects, and collaborate with an AI assistant that can read and write your workspace data.

---

## Core Features

- **Chat-First Workspace** — Think in threads. General threads for early exploration, project-scoped threads when work matures.
- **Artifacts (Markdown Memory)** — Persist ideas, PRDs, research docs as markdown. Types: idea, prd, research, markdown, or custom. Thread-linked with reason tracking (created, referenced, imported).
- **Full-Page Artifact Editor** — CodeMirror markdown editor with Streamdown preview. AI proposes edits as drafts you apply or discard — no silent overwrites.
- **Projects** — Container for grouping related threads and artifacts. Promote threads into projects when an idea matures.
- **AI Assistant with Workspace Tools** — AI can list/read thread-linked artifacts, import project artifacts, create idea and PRD artifacts, propose draft changes, create projects, do web search via Tavily, and retrieve context via Supermemory.
- **Daily AI Spend Cap** — Set a daily USD budget per user to prevent runaway AI costs.
- **Activity Feed** — Timeline of thread/project/artifact/draft events.
- **URL-Driven Navigation** — Shareable, bookmarkable links with query params (project, thread, context, start).

---

## Problems Solved

1. **Prevents Over-Building** — Forces clarity through chat + artifacts before writing code
2. **No Enterprise Overhead** — Lightweight process for solo builders who don't need Jira or Notion
3. **Memory Persistence** — Converts ephemeral conversations into durable markdown (not lost in chat history)
4. **Explicit AI Review** — Draft changes require user approval — no silent AI overwrites
5. **Context Continuity** — Supermemory integration retrieves relevant context across threads
6. **Budget Control** — Daily spend caps prevent runaway AI costs

---

## Target Users

- Solo developers who want structure without enterprise process overhead
- Indie hackers who need a lightweight place to clarify problems, scope an MVP, and keep PRD-style notes next to the conversation that produced them

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | SvelteKit, Svelte 5 (runes), TypeScript |
| UI | Tailwind CSS v4, shadcn-svelte |
| Backend | Convex (data, realtime, auth) |
| Auth | Convex Auth |
| Client | convex-svelte |
| AI | Vercel AI SDK, models via Vercel AI Gateway |
| Artifact Editing | CodeMirror, Streamdown |
| Search | Tavily SDK (optional) |
| Memory | Supermemory integration |

---

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Marketing home |
| `/auth` | Sign in/up |
| `/workspace` | Main workspace (sidebar, chat, artifacts) |
| `/workspace/settings` | Timezone, AI cap, usage, activity |
| `/workspace/artifacts/[artifactId]` | Full-page artifact reader/editor |