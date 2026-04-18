# Launchpad

Launchpad helps solo developers and indie hackers go from “I have an idea” to a clear, prioritized scope **before** writing code — so they validate faster instead of over-building or stalling.

**Full product spec:** [docs/MVP.md](docs/MVP.md)

---

## MVP — must have

1. **Idea intake form** — Single page: idea description (textarea), preferred stack (text), app type (dropdown: web app, SaaS, mobile, CLI, API). Live character count; submit runs a SvelteKit form action.
2. **AI PRD generation** — Server action posts to `+page.server.js`, calls Anthropic, returns a structured PRD (problem, target user, must-haves, out-of-scope, suggested stack, 1-week build plan) with **streaming** to the client.
3. **Formatted PRD output** — Labeled sections fill in as the stream arrives; **copy-to-markdown** at the bottom.

---

## Stretch (nice to have)

- **PRD history** — SQLite via Turso; `/history` lists past PRDs by idea name and date.

**Explicitly out of scope for MVP:** auth, accounts, sharing/collaboration, inline PRD editing, multiple AI models, billing, PDF export.

---

## Stack (MVP)

| Layer        | Choice                          |
| ------------ | ------------------------------- |
| App          | SvelteKit + TypeScript          |
| Styling      | Tailwind CSS                    |
| AI           | Anthropic SDK                   |
| Data (stretch) | Turso / SQLite              |
| Deploy       | Vercel (target)                 |

---

## SvelteKit concepts this project exercises

| Concept            | Role |
| ------------------ | ---- |
| `+page.server.js`  | Form actions + server-side Anthropic call |
| Streaming          | Progressive AI output in the UI |
| Svelte stores      | Loading + result state |
| File-based routing | `/` intake, `/history` when history ships |

---

## Rough timeline

| Day   | Goal |
| ----- | ---- |
| Day 1 | Form + server action + AI + streamed output |
| Day 2 | UI polish, copy button, Vercel deploy; stretch: history |

---

## Developing

Install dependencies, then run the dev server:

```sh
npm install
npm run dev
```

Open the app (or pass `--open`):

```sh
npm run dev -- --open
```

Configure **Anthropic API credentials** in your environment as required by the server implementation (see `docs/MVP.md` and your `+page.server` code).

### Feature flags

Experimental product surfaces are controlled with public environment flags. Flags are off by default.

```sh
PUBLIC_FEATURE_WORKSPACE=true
```

`PUBLIC_FEATURE_WORKSPACE=true` enables the chat-first Workspace route at `/workspace`. Any other value redirects `/workspace` back to `/dashboard`. The legacy dashboard remains available either way.

---

## Building

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```

Deployment uses a SvelteKit adapter appropriate for your host (e.g. [Vercel adapter](https://svelte.dev/docs/kit/adapters) for Vercel).

---

## Project tooling

This repo was bootstrapped with [`sv`](https://github.com/sveltejs/cli). Quality checks:

```sh
npm run check    # svelte-check + sync
npm run lint     # prettier + eslint
npm run format   # prettier --write
```
