# Launchpad Architecture

This is the concise maintainer snapshot for the current app. For public positioning, see [README.md](../README.md) and [product-summary.md](product-summary.md).

## App Shape

Launchpad is a SvelteKit app backed by Convex. The signed-in workspace is the product center: users create chat threads, organize mature work into projects, save markdown artifacts, import external AI context, and use an AI assistant that can work with the workspace.

Key routes:

| Route | Purpose |
| --- | --- |
| `src/routes/+page.svelte` | Public marketing home |
| `src/routes/auth/+page.svelte` | Convex Auth sign in/sign up |
| `src/routes/workspace/+layout.svelte` | Authenticated workspace shell, sidebar, tabs, notifications, shared data |
| `src/routes/workspace/+page.svelte` | Workspace start/new chat surface |
| `src/routes/workspace/thread/[threadId]` | Thread page |
| `src/routes/workspace/project/[projectId]` | Project overview |
| `src/routes/workspace/artifacts/[artifactId]` | Artifact reader/editor/history |
| `src/routes/workspace/imports/external-context/[draftId]` | External context import review |
| `src/routes/workspace/settings/+page.svelte` | Settings, AI preferences, usage, activity |
| `src/routes/api/workspace/*` | Chat, promotion readiness, generated titles, artifact memory, artifact deletion |

## Data Model

Convex schema lives in `src/convex/schema.ts`.

Core tables:

- Auth tables from `@convex-dev/auth`
- `userSettings` for timezone, daily AI cap, and user AI preference markdown
- `workspaceTabStrip` for saved workspace tab state
- `projects` for owner-scoped work containers
- `chatThreads` and `chatMessages` for general and project-scoped conversations
- `artifacts`, `artifactVersions`, and `threadArtifactLinks` for durable markdown memory
- `externalContextImportDrafts` for pasted external AI context review
- `notifications` for workspace progress and activity feedback
- `aiUsageEvents` and `aiDailyUsage` for token and cost tracking
- `activityEvents` for user-visible workspace history
- `memorySyncs` for Supermemory document sync bookkeeping

Ownership is consistently represented with `ownerId`. Server-side Convex functions should enforce user ownership before reading or mutating owner-scoped records.

## AI And Memory

Workspace chat streams through `src/routes/api/workspace/chat/+server.ts` with the Vercel AI SDK. Model selection is catalog-driven in `src/lib/idea-ai-models.ts` and resolved in `src/lib/server/resolve-workspace-language-model.ts`.

Supported provider paths:

- Vercel AI Gateway via `AI_GATEWAY_API_KEY`
- OpenRouter via `OPENROUTER_API_KEY`
- Groq via `GROQ_API_KEY`
- NVIDIA NIM via `NIM_API_KEY`

Optional AI context:

- Tavily search/page extraction via `TAVILY_API_KEY`
- Supermemory retrieval, profile context, user memory tools, artifact sync, and deletion via `SUPERMEMORY_API_KEY`

Convex artifacts remain canonical workspace memory. Supermemory is derived recall infrastructure and must not replace Convex state.

## Artifact Rules

Artifacts are markdown-first documents with flexible string `type` values. User saves and explicit AI writes create immutable `artifactVersions`. Artifact history and restore behavior should preserve the latest version as the source of truth while keeping old versions inspectable.

Thread-artifact links record why an artifact is present in a thread: `created`, `referenced`, or `imported`.

## Environment

| Variable | Purpose |
| --- | --- |
| `PUBLIC_CONVEX_URL` | Convex deployment URL for browser and server HTTP clients |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key for default AI workflows |
| `OPENROUTER_API_KEY` | Optional OpenRouter provider key |
| `GROQ_API_KEY` | Optional Groq provider key |
| `NIM_API_KEY` | Optional NVIDIA NIM provider key |
| `TAVILY_API_KEY` | Optional web search/page extraction key |
| `SUPERMEMORY_API_KEY` | Optional Supermemory key |
| `CONVEX_SITE_URL` | Convex Auth deployment site URL |

## Maintainer Checks

Use the narrowest useful check for the change:

```sh
npm run check
npm run lint
npm run build
```

Docs-only changes should at minimum pass a local Markdown link check and placeholder search.
