<!-- agentkit:start agents -->
# Launchpad Agent Guide

## Purpose

Launchpad is a chat-first workspace for solo builders and indie hackers. Agents should optimize for safe, focused, production-ready changes that preserve the app's simple workspace model: chats, projects, artifacts, AI tools, memory, and usage controls.

## Source Of Truth

Follow this file first for repository-wide rules.

Read companion docs only when they are relevant to the task. Do not load or restate every guide by default.

## Reference Map

| Task type | Read first |
| --- | --- |
| Any implementation | `AGENTS.md` |
| Stack-specific work | `docs/STACK.md` |
| Code quality, refactors, review, dependencies | `docs/CODE-QUALITY.md` |
| Planning, branching, implementation, review, release | `docs/WORKFLOWS.md` |
| Final handoff or PR explanation | `docs/CHANGE-EXPLANATION.md` |
| UI, styling, layout, navigation, components | `docs/DESIGN-SYSTEM.md` |
| Product, architecture, routes, data, AI, memory | `docs/architecture.md` |

## Local Guidance

This root `AGENTS.md` applies to the whole repository.

If a subdirectory contains its own `AGENTS.md` or equivalent local guidance, follow the most specific local guidance for files in that subtree. When instructions conflict, prefer the more specific local guidance unless it violates repository-wide safety, security, or quality rules.

## Operating Rules

- Inspect existing code and patterns before changing files.
- Prefer the smallest complete solution that satisfies the task.
- Keep diffs focused and reviewable.
- Preserve user changes. Do not overwrite or revert work you did not make.
- Avoid speculative abstractions, broad rewrites, and dependency bloat.
- Validate external input at system boundaries.
- Keep public APIs and persisted data shapes stable unless the task requires a change.
- Ask before destructive commands, broad refactors, schema changes, dependency additions, auth/security/privacy changes, or theme-level design changes.
- Run the narrowest useful checks before handoff.
- Explain completed work clearly using `docs/CHANGE-EXPLANATION.md` when relevant.

## Before Coding

Before meaningful code changes:

1. Confirm the task, scope, and acceptance criteria.
2. Check whether the task is linked to an issue in Linear.
3. For non-trivial work without an issue, ask whether one should be created before implementation.
4. Create or switch to an appropriate branch when the workflow expects branches.
5. Inspect nearby code, tests, and existing patterns.
6. Read relevant companion guidance from the Reference Map.
7. Identify the smallest complete approach.
8. Ask for clarification if requirements, risk, or approval boundaries are unclear.

Tiny fixes can skip branch-and-brief ceremony when the change is obvious and low risk.

## During Coding

- Modify existing patterns before creating new ones.
- Keep behavior explicit and easy to test.
- Avoid unrelated formatting churn.
- Prefer existing utilities, components, and conventions.
- Add or update tests when behavior changes.
- For UI work, follow `docs/DESIGN-SYSTEM.md` and preserve existing interaction patterns.
- For SvelteKit work, read `docs/STACK.md`.
- Document meaningful decisions in the implementation brief, PR, or final handoff.

## Approval Boundaries

Ask before:

- Adding a new runtime dependency.
- Changing schemas, migrations, permissions, auth, billing, data retention, or memory-sync behavior.
- Running destructive commands or deleting files unless explicitly requested.
- Changing global design tokens, theme primitives, or foundational layout rules.
- Performing broad refactors or large formatting-only rewrites.
- Editing generated, vendored, or external-source files unless the task explicitly requires it.

## Project Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite/SvelteKit frontend |
| `npm run dev:all` | Start Vite and `convex dev` together |
| `npm run dev:frontend` | Start only the frontend |
| `npm run dev:backend` | Start only Convex dev |
| `npm run check` | Run SvelteKit sync and `svelte-check` |
| `npm run lint` | Run Prettier check and ESLint |
| `npm run build` | Build the SvelteKit app |
| `npm run format` | Format the repository with Prettier |

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

Never commit API keys, tokens, private keys, or local `.env` values.

## Stack

- App: SvelteKit, Svelte 5, TypeScript
- Backend/data/auth: Convex and Convex Auth
- Styling: Tailwind CSS v4 with shadcn-svelte/Bits UI primitives
- AI: Vercel AI SDK with Gateway, OpenRouter, Groq, NIM, Tavily, and optional Supermemory
- Checks: `svelte-check`, ESLint, Prettier, SvelteKit build

Agents must read `docs/STACK.md` before changing SvelteKit routes, load functions, server routes, rendering, or data loading.
<!-- agentkit:end agents -->
