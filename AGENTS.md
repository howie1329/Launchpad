<!-- agentkit:start agents -->

# Launchpad Agent Guide

## Purpose

This is the primary instruction file for AI coding agents working in this repository.

Launchpad is a SvelteKit and Convex workspace for solo builders and indie hackers. It helps users think through ideas in chat, preserve decisions as markdown artifacts, organize mature work into projects, import external AI context, and use an AI assistant that can read and write workspace state.

Agents should optimize for safe, focused, production-ready changes that follow local SvelteKit, Convex, Tailwind, and shadcn-svelte patterns.

## Source Of Truth

Follow this file first. It defines the repository-wide operating rules for agents.

Use companion guides only when a trigger below applies. Do not load or restate every guide by default.

For routine bugfixes and small features, do not open `WORKFLOWS.md`, planning templates, or optional guides unless a trigger applies or the user asks.

## When To Use Other Guides

| Trigger                                        | Action                                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Any file edits (final message)                 | Use the change-explanation format in **After Coding (Required)**; see `docs/CHANGE-EXPLANATION.md` for detail |
| UI, components, styling, layout                | Read `docs/DESIGN-SYSTEM.md`                                                                                  |
| Review, refactor, dependencies                 | Read `docs/CODE-QUALITY.md`                                                                                   |
| Tests, fixtures, QA strategy                   | Read `docs/TESTING.md` if present                                                                             |
| Auth, permissions, secrets, PII                | Read `docs/SECURITY-CHECKLIST.md` if present                                                                  |
| Stack-specific code                            | Read `docs/STACK.md`                                                                                          |
| Architecture, data flow, AI, memory, env       | Read `docs/architecture.md`                                                                                   |
| User or issue requests a PRD                   | Create from `docs/PRD-TEMPLATE.md` under `docs/briefs`                                                        |
| User or issue requests an implementation brief | Create from `docs/IMPLEMENTATION-BRIEF-TEMPLATE.md` under `docs/briefs`                                       |
| Release or branching process (optional)        | Read `docs/WORKFLOWS.md` if present                                                                           |

### Optional Guides (Full Template Set)

These files are not installed with the standard template set. Do not assume they exist unless present in the repository:

- `docs/TESTING.md`
- `docs/SECURITY-CHECKLIST.md`
- `docs/PRD-TEMPLATE.md`
- `docs/IMPLEMENTATION-BRIEF-TEMPLATE.md`
- `docs/WORKFLOWS.md`

## Planning Artifacts

Use this decision tree before creating planning documents:

- **Tiny obvious fix** — implement directly; no PRD or brief required.
- **Product uncertainty** — create a PRD from `docs/PRD-TEMPLATE.md` only when the user, issue, or task explicitly requests planning documentation. Save it under `docs/briefs`.
- **Multi-file engineering with meaningful risk** — create an implementation brief from `docs/IMPLEMENTATION-BRIEF-TEMPLATE.md` only when the user, issue, or task explicitly requests it. Save it under `docs/briefs`.
- **Security-sensitive change** — follow `docs/SECURITY-CHECKLIST.md` if present.

Do not read planning templates on every task. Copy and fill them only when planning documentation is requested.

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
- Ask before destructive commands, broad refactors, schema changes, dependency additions, or security-sensitive changes.
- Run the narrowest useful checks before finishing (use **Project Commands** below).
- After any coding work that changes files, end with a change explanation per **After Coding (Required)**. Do not skip this for small fixes.
- Watch for common AI mistakes: invented APIs or commands, placeholder logic that looks production-ready, client-only authorization, and tests that do not exercise changed behavior.
- When reviewing or flagging issues, use severity: **Blocker** (must fix), **Concern** (should fix soon), **Suggestion** (optional).
- For review, refactor, or dependency work, read `CODE-QUALITY.md` for the full checklist.

## Before Coding

Before making meaningful code changes:

1. Confirm the task, scope, and acceptance criteria.
2. Inspect nearby code, tests, and existing patterns.
3. Read at most one triggered companion from **When To Use Other Guides** if it applies.
4. For non-trivial work: link to or create a Linear issue and use an appropriate branch when the project expects branches.
5. Ask for clarification if requirements, risk, or approval boundaries are unclear.

Tiny fixes can skip issue-and-branch ceremony when the change is obvious and low risk.

## During Coding

While implementing:

- Modify existing patterns before creating new ones.
- Keep behavior explicit and easy to test.
- Avoid unrelated formatting churn.
- Prefer existing utilities, components, and conventions.
- Add or update tests when behavior changes.
- For UI work, follow `docs/DESIGN-SYSTEM.md` and preserve existing interaction patterns.
- For stack-specific work, read `docs/STACK.md`.
- Document meaningful decisions in the change explanation when they matter.

## Approval Boundaries

Ask before:

- Adding a new runtime dependency.
- Changing schemas, migrations, permissions, auth, billing, or data retention behavior.
- Running destructive commands or deleting files.
- Changing global design tokens, theme primitives, or foundational layout rules.
- Performing broad refactors or large formatting-only rewrites.
- Editing generated, vendored, or external-source files unless the task explicitly requires it.

## After Coding (Required)

If you modified any files in the repository, your **final message** must include a change explanation.

This is how developers catch up on agent work. It is required for bugfixes, refactors, and small edits—not only large features or PRs. Scale section depth to the change; do not omit the explanation because the diff is small.

Do not write a separate change-explanation file unless the project asks for one. Use this structure in your reply:

- **Summary** — outcome in plain language (behavior delivered, not only files touched).
- **What changed** — main files or areas; what, why, and how each fits existing patterns.
- **Key decisions** — approach, alternatives, trade-offs (skip when straightforward).
- **Verification** — checks run and results; note any skipped checks and why.
- **Risks or limitations** — merge blockers, untested paths, follow-up (use "None identified" for trivial low-risk fixes when appropriate).
- **Suggested review focus** — where the developer should look first.

See `docs/CHANGE-EXPLANATION.md` for examples and style rules.

## Before Finishing

Before marking work complete:

1. Re-read the original request and acceptance criteria.
2. Confirm the implementation satisfies the requested scope.
3. Run the narrowest relevant checks from **Project Commands**.
4. Review the diff for unrelated changes.
5. Confirm no unnecessary dependencies, schema changes, theme changes, or broad refactors were introduced.
6. Include the change explanation from **After Coding (Required)** in your final message.

## Project Commands

| Command               | Description                                     |
| --------------------- | ----------------------------------------------- |
| `npm run dev`         | Start the SvelteKit frontend development server |
| `npm run dev:backend` | Start Convex dev                                |
| `npm run dev:all`     | Start SvelteKit and Convex together             |
| `npm run check`       | Run SvelteKit sync and `svelte-check`           |
| `npm run lint`        | Run Prettier check and ESLint                   |
| `npm run build`       | Build the project                               |

## Environment

Set local values in `.env.local` or the deployment environment. Never document or commit real secret values.

| Variable                        | Required         | Purpose                                                                                    |
| ------------------------------- | ---------------- | ------------------------------------------------------------------------------------------ |
| `PUBLIC_CONVEX_URL`             | Yes              | Convex deployment URL used by browser clients and SvelteKit server routes                  |
| `AI_GATEWAY_API_KEY`            | Yes              | Vercel AI Gateway key for default workspace AI workflows                                   |
| `OPENROUTER_API_KEY`            | Optional         | Enables OpenRouter model catalog entries                                                   |
| `GROQ_API_KEY`                  | Optional         | Enables Groq model catalog entries                                                         |
| `NIM_API_KEY`                   | Optional         | Enables NVIDIA NIM model catalog entries                                                   |
| `TAVILY_API_KEY`                | Optional         | Enables workspace web search and page extraction                                           |
| `SUPERMEMORY_API_KEY`           | Optional         | Enables Supermemory recall, profile context, and artifact memory sync                      |
| `COMPOSIO_API_KEY`              | Optional         | Enables selected external app tools in workspace chat through Composio                     |
| `COMPOSIO_WEBHOOK_SECRET`       | Optional         | Verifies Composio webhooks for project Launchpad Actions; set in SvelteKit and Convex envs |
| `BRAINTRUST_API_KEY`            | Optional         | Braintrust API key for workspace chat tracing (engineering observability)                  |
| `BRAINTRUST_TRACING_ENABLED`    | Optional         | Set to `true` with `BRAINTRUST_API_KEY` to trace workspace chat in Braintrust              |
| `BRAINTRUST_PROJECT_NAME`       | Optional         | Braintrust project name (defaults to `Launchpad Workspace Chat`)                           |
| `WORKSPACE_CHAT_EVAL_MODEL_ID`  | Optional         | Gateway model id for `npm run eval:chat` (default `openai/gpt-5.4-nano`)                   |
| `WORKSPACE_CHAT_EVAL_LLM_JUDGE` | Optional         | Set to `true` to run the LLM proactivity judge scorer (extra tokens/scores)                |
| `CONVEX_SITE_URL`               | Deployment       | Convex Auth site URL for deployed auth configuration                                       |
| `PUBLIC_CONVEX_SITE_URL`        | Optional         | Public Convex site URL when client-facing site routes need it                              |
| `CONVEX_DEPLOYMENT`             | Local Convex dev | Convex deployment identifier managed by `convex dev`                                       |

Never commit API keys, tokens, private keys, or local `.env` values. Keep secrets in environment variables or the project-approved secret store.

## Stack

Agents must read `docs/STACK.md` before changing stack-specific code.

- Primary framework: SvelteKit with Svelte 5
- Language/runtime: TypeScript on Node/Vite
- Backend/data layer: Convex queries, mutations, realtime data, HTTP actions, and Convex Auth
- AI: Vercel AI SDK with Vercel AI Gateway, OpenRouter, Groq, NVIDIA NIM, Tavily, and optional Supermemory
- Styling system: Tailwind CSS v4 with shadcn-svelte/Bits UI primitives and project CSS in `src/routes/layout.css`
- Test/check tools: `svelte-check`, SvelteKit sync, Vite build
- Lint/format tools: ESLint, Prettier, `prettier-plugin-svelte`, `prettier-plugin-tailwindcss`
<!-- agentkit:end agents -->
