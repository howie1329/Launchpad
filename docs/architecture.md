# Launchpad Architecture

This is the concise maintainer snapshot for the current app. For public positioning, see [README.md](../README.md) and [product-summary.md](product-summary.md).

## App Shape

Launchpad is a SvelteKit app backed by Convex. The signed-in workspace is the product center: users create chat threads, organize mature work into projects, save markdown artifacts, import external AI context, and use an AI assistant that can work with the workspace.

Key routes:

| Route                                                     | Purpose                                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/routes/+page.svelte`                                 | Public marketing home                                                                 |
| `src/routes/auth/+page.svelte`                            | Convex Auth sign in/sign up                                                           |
| `src/routes/workspace/+layout.svelte`                     | Authenticated workspace shell, sidebar, tabs, notifications, shared data              |
| `src/routes/workspace/+page.svelte`                       | Workspace start/new chat surface                                                      |
| `src/routes/workspace/thread/[threadId]`                  | Thread page                                                                           |
| `src/routes/workspace/project/[projectId]`                | Project overview, Launchpad Actions, and project activity                             |
| `src/routes/workspace/artifacts/[artifactId]`             | Artifact reader/editor/history                                                        |
| `src/routes/workspace/imports/external-context/[draftId]` | External context import review                                                        |
| `src/routes/workspace/settings/+page.svelte`              | Settings, AI preferences, external app connections, usage, activity, account controls |
| `src/routes/api/workspace/*`                              | Chat, artifacts, memory, external app tools, Launchpad Actions, and account APIs      |

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
- `launchpadActions` for project-scoped GitHub and Linear Composio triggers
- `projectActivityEvents` for external activity recorded by Launchpad Actions
- `notifications` for workspace progress and activity feedback
- `aiUsageEvents` and `aiDailyUsage` for token and cost tracking
- `activityEvents` for user-visible workspace history
- `memorySyncs` for Supermemory document sync bookkeeping

Ownership is consistently represented with `ownerId`. Server-side Convex functions should enforce user ownership before reading or mutating owner-scoped records.

## AI And Memory

Workspace chat streams through `src/routes/api/workspace/chat/+server.ts` with the Vercel AI SDK. Model selection is catalog-driven in `src/lib/idea-ai-models.ts` and resolved in `src/lib/server/resolve-workspace-language-model.ts`.

Assistant final responses use OpenUI Lang. A Launchpad-owned Svelte component library defines the
allowed generated interface, while the OpenUI CLI produces a deterministic system prompt before
development and builds. AI SDK tool parts remain explicit execution status; final text parts are
joined and progressively rendered as one OpenUI document. Existing markdown messages and invalid
OpenUI output fall back to the existing markdown renderer. Generated UI may only manage local form
state and send a follow-up chat message. It has no direct tool, URL, Convex, or external-app access.

Supported provider paths:

- Vercel AI Gateway via `AI_GATEWAY_API_KEY`
- OpenRouter via `OPENROUTER_API_KEY`

Optional AI context and integrations:

- Tavily search/page extraction via `TAVILY_API_KEY`
- Supermemory retrieval, profile context, user memory tools, artifact sync, and deletion via `SUPERMEMORY_API_KEY`
- Composio external app tools via `COMPOSIO_API_KEY`, scoped per thread and activated per message with selected app/toolkit badges
- Launchpad Actions via Composio triggers and `COMPOSIO_WEBHOOK_SECRET`, scoped per project and stored as project activity

External app connections are managed from workspace settings. Chat-time app tools are selected per thread/request, while Launchpad Actions are configured from a project and currently target GitHub and Linear sources. Composio webhook deliveries are verified before recording project activity or marking an action as needing attention.

Convex artifacts remain canonical workspace memory. Supermemory is derived recall infrastructure and must not replace Convex state. Composio may act on external services, but Launchpad workspace state should still be saved through Convex artifacts and thread tools.

Workspace chat system instructions are assembled in `src/lib/server/workspace-chat-instructions.ts`. Policy evals live under `evals/workspace-chat/` (`npm run eval:chat`; requires `BRAINTRUST_API_KEY` and either `AI_GATEWAY_API_KEY` with `WORKSPACE_CHAT_EVAL_PROVIDER=gateway` or `OPENROUTER_API_KEY` with `WORKSPACE_CHAT_EVAL_PROVIDER=openrouter`). Provider wiring is in `evals/workspace-chat/eval-provider.ts`.

Optional Braintrust tracing for workspace chat (engineering only, not product usage metrics): set `BRAINTRUST_API_KEY` and `BRAINTRUST_TRACING_ENABLED=true` in the SvelteKit server environment. Wiring lives in `src/lib/server/braintrust.ts` and applies only to `src/routes/api/workspace/chat/+server.ts`. Each traced request gets a parent `workspace-chat` span with filterable metadata (`threadId`, `modelId`, `scopeType`, optional `projectId`, web search and Composio flags) and child spans from the AI SDK wrapper. Leave tracing disabled in production unless you have a data-handling policy; traces may include user messages, artifacts, and tool I/O.

## Artifact Rules

Artifacts are markdown-first documents with flexible string `type` values. User saves and explicit AI writes create immutable `artifactVersions`. Artifact history and restore behavior should preserve the latest version as the source of truth while keeping old versions inspectable.

Thread-artifact links record why an artifact is present in a thread: `created`, `referenced`, or `imported`.

## Workspace Settings And Account Controls

`/workspace/settings` is the owner-facing control surface for timezone, daily AI cap, user AI context and response preferences, external app connections, usage status, activity history, account reset, and account deletion. Account reset/delete flows should clean up local owner-scoped workspace data and remote Supermemory-derived data when configured.

## Launchpad Actions

Launchpad Actions are project-scoped external activity listeners backed by Composio triggers. The project overview lists actions, creates new GitHub or Linear actions, and supports pause/resume/delete states. Incoming Composio webhooks are verified, deduplicated, recorded as `projectActivityEvents`, or used to mark actions as `needs_attention` when connected accounts expire or triggers are disabled.

## Environment

| Variable                  | Purpose                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `PUBLIC_CONVEX_URL`       | Convex deployment URL for browser and server HTTP clients                                |
| `AI_GATEWAY_API_KEY`      | Vercel AI Gateway key for default AI workflows                                           |
| `OPENROUTER_API_KEY`      | Optional OpenRouter provider key                                                         |
| `TAVILY_API_KEY`          | Optional web search/page extraction key                                                  |
| `SUPERMEMORY_API_KEY`     | Optional Supermemory key                                                                 |
| `COMPOSIO_API_KEY`        | Optional Composio key for selected external app tools and Launchpad Actions              |
| `COMPOSIO_WEBHOOK_SECRET` | Optional Composio webhook secret for Launchpad Actions; set in SvelteKit and Convex envs |
| `CONVEX_SITE_URL`         | Convex Auth deployment site URL                                                          |
| `PUBLIC_CONVEX_SITE_URL`  | Public Convex site URL when client-facing site routes need it                            |
| `CONVEX_DEPLOYMENT`       | Local Convex deployment identifier managed by `convex dev`                               |

## Maintainer Checks

Use the narrowest useful check for the change:

```sh
npm run check
npm run lint
npm run build
```

Docs-only changes should at minimum pass a local Markdown link check and placeholder search.
