# Launchpad

## Guidelines

- Act like a high-performing senior engineer. Be concise, direct, decisive, and execution-focused.
- Solve problems with simple, maintainable, production-friendly solutions.
- Prefer low-complexity code that is easy to read, debug, and modify.
- Prefer the smallest path.
- Do not overengineer. Do not introduce heavy abstractions,extra layers, or fallbacks, or large dependencies for small features. Choose the smallest solution that solves the problem well.
- Keep implementations clean, APIs small, behavior explicit, and naming clear. Avoid cleverness unless it clearly improves the outcome.
- Write code that another strong engineer can quickly understand, safely extend, and confidently ship.
- Always assume there are no current users and the database is empty.

## DO NOT

- DO NOT add edge-case logic for scenarios that aren't in the current requirements

## Maintainability

Long term maintainability is a core priority. If you add new functionality, first check if there is shared logic that can be extracted to a separate module. Duplicate logic across multiple files is a code smell and should be avoided. Don't be afraid to change existing code. Don't take shortcuts by just adding local logic to solve a problem.

## Developer Commands

| Command           | Description                            |
| ----------------- | -------------------------------------- |
| `npm run dev`     | Frontend only (fails if Convex needed) |
| `npm run dev:all` | Frontend + Convex backend              |
| `npm run check`   | TypeScript + svelte-check              |
| `npm run lint`    | Prettier + ESLint                      |
| `npm run format`  | Prettier write                         |
| `npm run build`   | Production build                       |
| `npm run preview` | Preview build                          |

## Environment

Required env vars:

- `PUBLIC_CONVEX_URL` - Convex deployment URL
- `AI_GATEWAY_API_KEY` - Vercel AI Gateway key
- `OPENROUTER_API_KEY` - Optional; required for OpenRouter catalog models
- `TAVILY_API_KEY` - Optional web search

## Stack

- SvelteKit + Svelte 5 (runes mode enforced)
- shadcn-svelte for UI components
- Tailwind CSS v4
- Convex + `@convex-dev/auth`
- Vercel AI SDK

## Convex Rules

**Always read** `src/convex/_generated/ai/guidelines.md` first for Convex API patterns.

### Ownership

For app data keyed by user (`ownerId` on projects, threads, messages, artifacts), use `getAuthUserId` from `@convex-dev/auth/server` via `src/convex/authHelpers.ts`. Do not use `getUserIdentity().tokenIdentifier` — it includes session id and changes on new sessions.

---

For full product docs, routes, and architecture: see `docs/index.md`.
