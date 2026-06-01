<!-- agentkit:start stack -->

# Launchpad Stack Guidance

Launchpad is a SvelteKit, Svelte 5, TypeScript, and Convex app. The signed-in workspace is the main product surface, with chat threads, projects, markdown artifacts, external context imports, AI usage controls, and optional memory/search integrations.

## App Structure

- Public and workspace routes live in `src/routes`.
- Workspace pages use the authenticated shell in `src/routes/workspace/+layout.svelte`.
- SvelteKit API endpoints live under `src/routes/api/workspace`.
- Reusable client utilities live in `src/lib`.
- Convex backend modules, schema, auth config, and generated types live in `src/convex`.
- Shared UI primitives live in `src/lib/components/ui`; domain components live under `src/lib/components/workspaces`, `src/lib/components/idea-chat`, and `src/lib/components/ai-elements`.

## SvelteKit And Svelte 5

- Follow the existing route, load, action, and server module patterns before adding new files.
- Keep browser-only code out of server load functions and server modules.
- Use SvelteKit form actions and load functions where they fit the workflow.
- Validate external input at action, endpoint, and server boundary entrypoints.
- Reuse existing stores, components, and styling conventions before creating new ones.
- Run the project's SvelteKit check or build before handoff when touching routes, rendering, or data loading.

Prefer Svelte 5 runes and existing `.svelte.ts` state helpers when touching interactive client state. Keep server-only work in `+server.ts`, server load functions, or `src/lib/server`.

## Convex

- Schema lives in `src/convex/schema.ts`; treat schema and persisted data shape changes as approval-boundary work.
- Keep owner-scoped data protected with `ownerId` checks in Convex functions.
- Reuse existing query, mutation, and helper patterns before introducing new backend modules.
- Do not edit `src/convex/_generated` files by hand.
- Use Convex Auth patterns from `src/convex/auth.ts`, `src/convex/auth.config.ts`, and `src/lib/auth.svelte.ts`.

## AI, Search, And Memory

- Workspace chat streams through `src/routes/api/workspace/chat/+server.ts`.
- Model catalog and provider resolution live in `src/lib/idea-ai-models.ts` and `src/lib/server/resolve-workspace-language-model.ts`.
- Convex artifacts are canonical workspace memory. Supermemory is optional derived recall and sync infrastructure.
- Tavily search/page extraction and external AI providers should remain optional when their keys are absent unless the feature explicitly requires them.
- Composio powers two separate surfaces: selected external app tools in workspace chat and project-scoped Launchpad Actions for GitHub/Linear activity capture.
- Launchpad Actions depend on verified Composio webhook delivery and should record activity against projects rather than replacing Convex project state.
- Track token/cost behavior through the existing usage helpers and Convex usage tables.

## UI And Styling

- Follow `DESIGN.md` for app shell, navigation, components, layout, density, motion, and accessibility.
- Use Tailwind CSS v4 utilities and tokens from `src/routes/layout.css`.
- Prefer existing shadcn-svelte/Bits UI primitives before creating custom interaction primitives.
- Keep product surfaces dense, quiet, and workspace-focused. Avoid decorative gradients, stacked cards, and broad theme changes.
- Preserve existing icon and control patterns in workspace chrome.

## Project Commands

| Command               | Purpose                                         |
| --------------------- | ----------------------------------------------- |
| `npm run dev`         | Start the SvelteKit frontend development server |
| `npm run dev:backend` | Start Convex dev                                |
| `npm run dev:all`     | Start SvelteKit and Convex together             |
| `npm run check`       | Run SvelteKit sync and `svelte-check`           |
| `npm run lint`        | Run Prettier check and ESLint                   |
| `npm run build`       | Build the SvelteKit app                         |

Run the narrowest useful command for the change. For docs-only edits, placeholder search and diff review are enough.

## Environment

Set values in `.env.local` for local development and in the deployment environment for hosted builds. Never commit real API keys or tokens.

| Variable                  | Required         | Purpose                                                                                      |
| ------------------------- | ---------------- | -------------------------------------------------------------------------------------------- |
| `PUBLIC_CONVEX_URL`       | Yes              | Convex deployment URL for browser clients and SvelteKit server routes                        |
| `AI_GATEWAY_API_KEY`      | Yes              | Vercel AI Gateway key for default AI workflows                                               |
| `OPENROUTER_API_KEY`      | Optional         | Enables OpenRouter models                                                                    |
| `GROQ_API_KEY`            | Optional         | Enables Groq models                                                                          |
| `NIM_API_KEY`             | Optional         | Enables NVIDIA NIM models                                                                    |
| `TAVILY_API_KEY`          | Optional         | Enables web search and page extraction                                                       |
| `SUPERMEMORY_API_KEY`     | Optional         | Enables Supermemory recall, profile context, and artifact memory sync                        |
| `COMPOSIO_API_KEY`        | Optional         | Enables selected external app tools and Launchpad Actions through Composio                   |
| `COMPOSIO_WEBHOOK_SECRET` | Optional         | Verifies Composio webhook deliveries for Launchpad Actions; set in SvelteKit and Convex envs |
| `CONVEX_SITE_URL`         | Deployment       | Convex Auth site URL for deployed auth configuration                                         |
| `PUBLIC_CONVEX_SITE_URL`  | Optional         | Public Convex site URL when client-facing site routes need it                                |
| `CONVEX_DEPLOYMENT`       | Local Convex dev | Convex deployment identifier managed by `convex dev`                                         |

## Quality Bar

- Keep changes small, explicit, and compatible with existing routes and data contracts.
- Validate untrusted request data at SvelteKit and Convex boundaries.
- Add or update tests/checks when behavior changes.
- Run `npm run check` for Svelte or route changes, `npm run lint` for style-sensitive changes, and `npm run build` when the change affects app wiring or deployment behavior.
<!-- agentkit:end stack -->
