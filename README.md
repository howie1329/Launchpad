# Launchpad

Launchpad is a chat-first workspace for solo builders and indie hackers who want to turn rough ideas into scoped, buildable work before they over-invest in code.

The product centers on one loop: think in conversation, preserve decisions as artifacts, organize serious work into projects, and use an AI assistant that can read and write the workspace instead of acting like a disconnected chat box.

## Product

Launchpad is built for people who want the useful parts of product planning without heavyweight process. It helps a builder:

- start with a general chat thread for messy thinking
- save durable markdown artifacts such as ideas, PRDs, research notes, and project briefs
- promote mature work into a project with its own threads and artifacts
- review artifact history and restore older versions when needed
- import external AI context into a project brief
- connect external apps for selected chat tools and project activity capture
- create Launchpad Actions that bring GitHub and Linear activity back into projects
- keep AI usage bounded with daily spend caps
- continue work with memory from artifacts, project context, and optional Supermemory recall

Launchpad is currently an active product build, not a static prototype. The main app surface is the signed-in workspace at `/workspace`.

## Core Experience

| Area                     | What it does                                                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace                | Signed-in shell for chats, projects, artifacts, settings, command palette, tabs, and notifications                                                                                |
| Threads                  | General or project-scoped conversations with persisted AI SDK-style messages                                                                                                      |
| Projects                 | Containers for related threads, artifacts, summaries, imported context, Launchpad Actions, and project activity                                                                   |
| Artifacts                | Markdown documents with version history, CodeMirror editing, Streamdown preview, and diff review                                                                                  |
| External context imports | Review flow for turning pasted AI context into project material                                                                                                                   |
| External app tools       | Composio-backed chat tools for selected connected apps such as GitHub, Linear, Slack, Gmail, Notion, Drive, Docs, Calendar, and Sheets                                            |
| Launchpad Actions        | Project-scoped GitHub and Linear triggers that record external activity back into Launchpad                                                                                       |
| AI assistant             | Streams through the Vercel AI SDK, renders final responses with OpenUI/markdown fallback, and can use workspace tools for artifacts, projects, memory, search, and connected apps |
| Memory                   | Convex artifacts remain canonical; Supermemory can add derived recall when configured                                                                                             |
| Usage controls           | Per-user daily AI cap, token/cost accounting, user AI preferences, external app connections, account controls, and activity history                                               |

## Routes

| Route                                           | Purpose                                                       |
| ----------------------------------------------- | ------------------------------------------------------------- |
| `/`                                             | Public marketing home                                         |
| `/auth`                                         | Sign in and sign up with Convex Auth                          |
| `/workspace`                                    | Main workspace start surface                                  |
| `/workspace/thread/[threadId]`                  | Active chat thread                                            |
| `/workspace/project/[projectId]`                | Project overview                                              |
| `/workspace/artifacts/[artifactId]`             | Full-page artifact reader/editor/history                      |
| `/workspace/imports/external-context/[draftId]` | External context import review                                |
| `/workspace/settings`                           | User settings, AI preferences, daily cap, usage, and activity |
| `/privacy`, `/terms`, `/support`                | Public support and policy pages                               |

Workspace APIs live under `/api/workspace/*`:

| API area             | Routes                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Chat and AI          | `/api/workspace/chat`, `/api/workspace/thread/generate-title`, `/api/workspace/promotion-readiness`                  |
| Artifacts and memory | `/api/workspace/artifacts/[artifactId]`, `/api/workspace/memory/artifact`                                            |
| External app tools   | `/api/workspace/composio/apps`, `/api/workspace/composio/apps/connect`, `/api/workspace/composio/toolkits`           |
| Launchpad Actions    | `/api/workspace/launchpad-actions`, `/api/workspace/launchpad-actions/[actionId]`, `/api/workspace/composio/webhook` |
| Account management   | `/api/workspace/account/reset`, `/api/workspace/account/delete`                                                      |

## Stack

| Layer         | Technology                                                     |
| ------------- | -------------------------------------------------------------- |
| App           | SvelteKit, Svelte 5, TypeScript                                |
| UI            | Tailwind CSS v4, shadcn-svelte/Bits UI primitives, Hugeicons   |
| Backend       | Convex queries, mutations, realtime data, and Convex Auth      |
| Client data   | `convex-svelte`                                                |
| AI            | Vercel AI SDK with Vercel AI Gateway catalog entries           |
| Search        | Tavily for optional web search/page extraction                 |
| External apps | Composio for selected chat app tools and Launchpad Actions     |
| Memory        | Supermemory for optional derived recall                        |
| Artifacts     | CodeMirror, Streamdown, `@pierre/diffs`, OpenUI Svelte runtime |

## Documentation

- [Product summary](docs/product-summary.md) — investor/user-facing product snapshot
- [Docs index](docs/index.md) — current documentation map
- [Architecture](docs/architecture.md) — maintainer snapshot of routes, data, AI, memory, and env vars
- [Design system](DESIGN.md) — UI rules for app shell, navigation, controls, motion, and accessibility
- [Stack guidance](docs/STACK.md) — SvelteKit-specific implementation guidance
- [Code quality](docs/CODE-QUALITY.md) and [handoff guide](docs/CHANGE-EXPLANATION.md) — contributor and agent operating docs

## Developing

Install dependencies:

```sh
npm install
```

Run the frontend:

```sh
npm run dev
```

Run frontend and Convex together:

```sh
npm run dev:all
```

OpenUI response prompt generation runs automatically before `dev`, `dev:all`, and `build`. To refresh it directly:

```sh
npm run generate:openui
```

Useful checks:

```sh
npm run check
npm run lint
npm run test
npm run build
```

Workspace chat policy evals are optional and use Braintrust:

```sh
npm run eval:chat
```

## Environment

Set local values in `.env.local` or the deployment environment.

| Variable                          | Required         | Purpose                                                                                      |
| --------------------------------- | ---------------- | -------------------------------------------------------------------------------------------- |
| `PUBLIC_CONVEX_URL`               | Yes              | Convex deployment URL for browser and server HTTP clients                                    |
| `AI_GATEWAY_API_KEY`              | Yes              | Vercel AI Gateway key for default workspace chat, title generation, and promotion readiness  |
| `TAVILY_API_KEY`                  | Optional         | Enables workspace chat web search and page extraction                                        |
| `SUPERMEMORY_API_KEY`             | Optional         | Enables Supermemory retrieval, profile context, and artifact memory sync                     |
| `COMPOSIO_API_KEY`                | Optional         | Enables selected external app tools and Launchpad Actions through Composio                   |
| `COMPOSIO_WEBHOOK_SECRET`         | Optional         | Verifies Composio webhook deliveries for Launchpad Actions; set in SvelteKit and Convex envs |
| `BRAINTRUST_API_KEY`              | Optional         | Enables workspace chat tracing and `npm run eval:chat`                                       |
| `BRAINTRUST_TRACING_ENABLED`      | Optional         | Set to `true` with `BRAINTRUST_API_KEY` to trace workspace chat requests                     |
| `BRAINTRUST_PROJECT_NAME`         | Optional         | Braintrust project name for tracing; defaults to `Launchpad Workspace Chat`                  |
| `WORKSPACE_CHAT_EVAL_PROVIDER`    | Optional         | `gateway` (default) or `openrouter` catalog group for `npm run eval:chat`                    |
| `WORKSPACE_CHAT_EVAL_MODEL_ID`    | Optional         | Catalog model id for workspace chat evals                                                    |
| `WORKSPACE_CHAT_EVAL_LLM_JUDGE`   | Optional         | Set to `true` to enable LLM judge scorers for selected eval cases                            |
| `WORKSPACE_CHAT_EVAL_JUDGE_MODEL` | Optional         | Catalog model id for eval judge scoring                                                      |
| `CONVEX_SITE_URL`                 | Deployment       | Convex Auth site URL for deployed auth configuration                                         |
| `PUBLIC_CONVEX_SITE_URL`          | Optional         | Public Convex site URL when client-facing site routes need it                                |
| `CONVEX_DEPLOYMENT`               | Local Convex dev | Convex deployment identifier managed by `convex dev`                                         |

Convex deployment configuration follows the Convex environment variable model. Never commit API keys, private `.env` files, or local tokens.

## Status

Launchpad is under active development. The codebase is the source of truth for shipped behavior; the docs in this repository are kept intentionally small so product positioning, setup, and maintainer context stay easy to trust.
