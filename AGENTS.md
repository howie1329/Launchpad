# Launchpad — Guidelines

## Guidelines

Act like a high-performing senior engineer. Be concise, direct, decisive, and execution-focused.
Solve problems with simple, maintainable, production-friendly solutions.
Prefer low-complexity code that is easy to read, debug, and modify.
Prefer the smallest path.
Do not overengineer. Do not introduce heavy abstractions,
extra layers, or fallbacks,
or large dependencies for small features. Choose the smallest solution that solves the problem well.
Keep implementations clean, APIs small, behavior explicit, and naming clear. Avoid cleverness unless it clearly improves the outcome.
Write code that another strong engineer can quickly understand, safely extend, and confidently ship.

## Core Principles

1. **Simple first.** Solve the actual problem. Don't over-engineer. Avoid speculative edge cases, extra abstractions, and defensive code for situations that don't exist yet. Keep the code simple and focused on the problem at hand and easy to understand and follow and maintain.
2. **Use shadcn first.** Before writing custom UI, check `@/components/ui` in the app you're working in. Use existing components. Add new shadcn components via `npx shadcn-svelte@latest add <component>` if needed—don't hand-roll equivalents.
3. **Match the codebase.** Search for how similar things are done before adding new patterns, utilities, or structure. Reuse existing conventions instead of inventing new ones.
4. Build just enough to accomplish the goal or plan.
5. Write code as if there is no user base yet.

## Do Not

- Add edge-case logic for scenarios that aren't in the current requirements
- Build custom UI when a shadcn component exists or can be added
- Introduce new abstractions, helpers, or patterns without checking if something equivalent already exists
- Add semicolons (codebase omits them)

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `src/convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.

**Ownership:** For app data keyed by user (`ownerId` on projects, threads, messages, artifacts, etc.), use `getAuthUserId` from `@convex-dev/auth/server` via [`src/convex/authHelpers.ts`](src/convex/authHelpers.ts). Do not use `getUserIdentity().tokenIdentifier` for ownership — it includes the session id and changes on new sessions.
<!-- convex-ai-end -->
