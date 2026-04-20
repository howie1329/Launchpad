# Launchpad

Launchpad helps solo developers and indie hackers turn rough ideas into scoped work **before** over-building. It is a **chat-first workspace**: you think in **threads**, persist decisions as **artifacts** (markdown ideas, PRDs, and more), organize under **projects** when work matures, and use an **AI assistant** that reads and writes workspace data through tools—not a disconnected chat window.

**Full product breakdown (what it is now, features, routes, data model):** [docs/product-overview.md](docs/product-overview.md)

**Maintainer snapshot (architecture, schema, env):** [docs/current-state.md](docs/current-state.md)

**Product direction (north star):** [docs/chat-first-launchpad-prd.md](docs/chat-first-launchpad-prd.md)

---

## Routes

- **`/`** — Marketing home (chat-first workspace positioning; links into the app).
- **`/auth`** — Sign in and sign up (Convex Auth).
- **`/workspace`** — Signed-in shell: sidebar (projects, chats, artifacts), new-chat landing or active thread, optional **context** panel for thread-linked artifacts. Query params include `project`, `thread`, `context`, and `start` (auto-send after creating a thread).
- **`/workspace/settings`** — Timezone, daily AI spend cap, usage vs cap, and workspace activity history.
- **`/workspace/artifacts/[artifactId]`** — Full-page artifact reader (edit, preview, draft compare).

The workspace is the primary app surface; there is no separate dashboard or ideas-only area outside this shell.

---

## Stack

- **App:** SvelteKit, Svelte 5, TypeScript
- **UI:** Tailwind CSS v4, [shadcn-svelte](https://www.shadcn-svelte.com/) (Bits UI primitives)
- **Backend:** [Convex](https://convex.dev) — data, realtime queries, and Convex Auth (`@convex-dev/auth`)
- **Client:** `convex-svelte`
- **AI:** Vercel AI SDK (`ai`, `@ai-sdk/svelte`), models via [Vercel AI Gateway](https://vercel.com/docs/ai-gateway); workspace streaming in `src/routes/api/workspace/chat/+server.ts`
- **Artifacts:** CodeMirror (markdown / diff), Streamdown (preview)

---

## Documentation

| Doc | Purpose |
| --- | --- |
| [docs/product-overview.md](docs/product-overview.md) | **Product breakdown:** audience, concepts, features, routes, AI, settings, stack, data model |
| [docs/current-state.md](docs/current-state.md) | Maintainer snapshot: architecture, data model, env vars, PRD gaps |
| [docs/chat-first-launchpad-prd.md](docs/chat-first-launchpad-prd.md) | Product vision and MVP scope |
| [docs/design-system.md](docs/design-system.md) | Visual and interaction principles (tokens live in `src/routes/layout.css`) |
| [docs/shadcn-svelte.md](docs/shadcn-svelte.md) | Index of shadcn-svelte docs |
| [docs/artifact-schema-plan.md](docs/artifact-schema-plan.md) | Rationale for artifact fields and markdown-first storage |
| [docs/tech-debt-followup.md](docs/tech-debt-followup.md) | Optional cleanup notes |

---

## Developing

Install dependencies:

```sh
npm install
```

Run the Vite dev server (frontend only):

```sh
npm run dev
```

Open the app (optional):

```sh
npm run dev -- --open
```

When you need Convex (auth, data, workspace):

```sh
npm run dev:all
```

That runs Vite and `convex dev` together. You can also run `npx convex dev` in a second terminal alongside `npm run dev`.

---

## Environment

Set variables in `.env.local` or your host environment (names must match what SvelteKit and Convex expect):

- **`PUBLIC_CONVEX_URL`** — Convex deployment URL (required for auth and client queries; see `src/lib/auth.svelte.ts`).
- **`AI_GATEWAY_API_KEY`** — Private key for Vercel AI Gateway (required for workspace chat streaming; see `src/routes/api/workspace/chat/+server.ts`).

Configure the Convex project with `npx convex dev` and follow [Convex environment variables](https://docs.convex.dev/production/environment-variables) for deployment. For AI Gateway, see [Vercel AI Gateway](https://vercel.com/docs/ai-gateway).

---

## Building

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```

Use a SvelteKit adapter suited to your host (for example the [Vercel adapter](https://svelte.dev/docs/kit/adapters) on Vercel).

---

## Project tooling

Bootstrapped with [`sv`](https://github.com/sveltejs/cli). Quality checks:

```sh
npm run check    # svelte-check + sync
npm run lint     # prettier + eslint
npm run format   # prettier --write
```
