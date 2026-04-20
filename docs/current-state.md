# Launchpad — current state (maintainer snapshot)

This document describes **what exists in the repository today**. For a full **product-facing breakdown** (audience, features, routes, AI behavior), see [product-overview.md](product-overview.md). For product intent and roadmap framing, see [chat-first-launchpad-prd.md](chat-first-launchpad-prd.md).

## Product snapshot

Launchpad is a **workspace-first** app for signed-in users. After [Convex Auth](https://docs.convex.dev/auth) at `/auth`, the main surface is **`/workspace`**: a shell with projects, chat threads (general or tied to a project), and **artifacts** stored as markdown (`contentMarkdown`) with a flexible string `type` (conventions include `idea`, `prd`, plus `research`, `markdown`, or other labels grouped in the UI).

The assistant runs in **threads** and can create artifacts, link them to the thread, and **propose edits**; users apply or discard those proposals via **draft change** records—not silent overwrites.

The marketing page at **`/`** still frames a linear “idea → PRD → first week” story for visitors; the live product is the workspace, not a single-shot form.

## Architecture

### SvelteKit routes (relevant)

- `src/routes/+page.svelte` — `/`
- `src/routes/auth/+page.svelte` — `/auth`
- `src/routes/workspace/+layout.svelte`, `+page.svelte` — `/workspace` (query params: `project`, `thread`, `context`, `start`, etc.)
- `src/routes/workspace/settings/+page.svelte` — `/workspace/settings` — timezone, daily AI cap, usage, activity
- `src/routes/workspace/artifacts/[artifactId]/+page.svelte` — full-page artifact reader
- `src/routes/api/workspace/chat/+server.ts` — `POST /api/workspace/chat` — streams AI output; uses Vercel AI SDK + AI Gateway; reads and writes Convex via HTTP for threads, artifacts, and draft changes

### Convex data model

Defined in `src/convex/schema.ts`:

- Auth tables from `@convex-dev/auth`
- **`projects`** — owner-scoped work areas
- **`chatThreads`** — `scopeType`: `general` | `project`; optional `projectId`
- **`chatMessages`** — UIMessage-shaped payloads per thread
- **`artifacts`** — `type` (string), `title`, `contentMarkdown`, optional `projectId` / `sourceThreadId`
- **`threadArtifactLinks`** — which artifacts belong to which thread (`created` | `referenced` | `imported`)
- **`artifactDraftChanges`** — proposed title/body; `pending` | `applied` | `discarded`

Ownership uses `ownerId` string from Convex Auth (`getAuthUserId` in app code—see `src/convex/authHelpers.ts`).

### AI path

- Browser chat UI calls `POST /api/workspace/chat` with `threadId` and model id.
- Server builds context from Convex (thread, messages, linked artifacts, optional project artifacts), runs a `ToolLoopAgent`, and streams the response.
- Tools create/link artifacts and create draft changes for edits; mutations go through Convex.
- **Durable / background workflows** (multi-step polish, promotion pipelines, scheduled jobs) are **not implemented** in the repo yet; see [durable-workflows-and-orchestration.md](durable-workflows-and-orchestration.md). Planned chat tools (search, section reads, backlog helpers) live in [ai-chat-tools-and-vercel-workflows.md](ai-chat-tools-and-vercel-workflows.md).

## Auth

Authentication is **Convex Auth** with JWT storage on the client (`src/lib/auth.svelte.ts`). Users need a valid deployment and `PUBLIC_CONVEX_URL` on the client; the chat route uses `PUBLIC_CONVEX_URL` for server-side Convex HTTP access.

## Implemented vs [chat-first-launchpad-prd.md](chat-first-launchpad-prd.md)

Aligned in spirit:

- Chat-primary UX inside `/workspace`
- Persistent threads (general and project-scoped)
- Artifacts as durable markdown memory, with draft-then-apply for changes
- Projects with chats and artifact sidebars

Expect gaps and iteration (non-exhaustive):

- The PRD describes explicit **promotion** flows and rich **context attach/import** UX; the implementation may simplify some of that into URL state, sidebar, and tool behavior—verify in UI before assuming every bullet is shipped.
- **Artifact types** beyond idea/PRD are supported at the data layer (`type: string`); the UI groups known labels and buckets the rest as “other.”
- **Research** as a dedicated PRD subsection and automation called out as “not in MVP” in the PRD—the app may only store research-flavored markdown artifacts where needed.

Treat the chat-first PRD as **direction**; this file is the **inventory**.

## Related docs

- [ai-chat-tools-and-vercel-workflows.md](ai-chat-tools-and-vercel-workflows.md) — workspace chat tools (implemented + roadmap)
- [durable-workflows-and-orchestration.md](durable-workflows-and-orchestration.md) — background workflows and runtime options
- [design-system.md](design-system.md) — layout, tokens, interaction principles
- [shadcn-svelte.md](shadcn-svelte.md) — component library doc index
- [artifact-schema-plan.md](artifact-schema-plan.md) — why markdown + metadata shape
- [tech-debt-followup.md](tech-debt-followup.md) — optional housekeeping

## Environment (quick reference)

| Variable | Role |
| --- | --- |
| `PUBLIC_CONVEX_URL` | Public Convex URL (client + server HTTP client) |
| `AI_GATEWAY_API_KEY` | Private; Vercel AI Gateway for workspace chat |

See root [README.md](../README.md) for how to run the app and where to set variables.
