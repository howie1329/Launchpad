# OpenRouter as a second AI provider

## Problem Statement

Launchpad workspace chat is fixed to **Vercel AI Gateway** only. Builders who want specific models available only (or more reliably) via **OpenRouter** cannot select them; there is no way to route `modelId` to a different provider backend while keeping one chat UX and the existing daily cap / usage recording.

## Solution

Keep a **single curated model picker** backed by `ideaAiModels`, but each entry declares which **provider backend** handles it (`gateway` or `openrouter`). The workspace chat API **resolves** the selected `modelId` to either the existing gateway client or an OpenRouter client (via `@openrouter/ai-sdk-provider`). Costs and context UI continue to use the same catalog so **daily AI caps** stay meaningful. Missing OpenRouter configuration fails fast with a clear error when an OpenRouter model is chosen.

## User Stories

1. As a signed-in workspace user, I want to pick a model that is served via **OpenRouter**, so that I can use models my team exposes there.
2. As a signed-in workspace user, I want models served via **Vercel AI Gateway** to keep working as they do today, so that I am not forced to migrate keys.
3. As a workspace user, I want the app to **reject** unsupported `modelId` values, so that arbitrary provider strings cannot be injected from the client.
4. As a workspace user, I want a **clear error** if OpenRouter is selected but the server is not configured with `OPENROUTER_API_KEY`, so that I know what to fix.
5. As a workspace user, I want **streaming tool-calling chat** to behave the same for OpenRouter models as for gateway models, so that workspace tools and artifacts keep working.
6. As a workspace user with a **daily AI cap**, I want spend estimated from **documented per-model rates**, so that caps remain fair when mixing providers.
7. As a workspace user, I want **usage events** to record the same `modelId` I selected, so that settings/history stay understandable.
8. As a developer maintaining Launchpad, I want **one catalog** to drive validation, UI labels, and Convex cost tables, so that rates do not drift across files.
9. As a developer, I want a **small resolver module**, so that provider wiring does not sprawl across route handlers.
10. As an operator, I want **README / env docs** to list `OPENROUTER_API_KEY`, so that deployment setup is obvious.
11. As a workspace user starting a **new thread**, I want OpenRouter models available on the **landing** composer, not only inside an existing thread.
12. As a workspace user, I want the **model selector** to make **provider sections** (gateway vs OpenRouter) clearly labeled, so that I know how my request is routed.
13. As a workspace user loading an old thread, I want a **saved `modelId`** that is still in the catalog to restore selection, so that continuity is preserved.
14. As a workspace user with a thread whose saved `modelId` was removed from the catalog, I want a **safe fallback** to the default model, so that the thread stays usable.
15. As a product owner, I want **thread title generation** to remain on a **cheap, stable gateway default**, so that OpenRouter key issues do not break titling on the first message.
16. As a workspace user, I want the **model menu** to match the rest of the app’s **Linear-style** density and tokens, so that the composer feels cohesive.

## Implementation Decisions

- **Dual provider:** Vercel AI Gateway for `provider: 'gateway'`; **OpenRouter** via `@openrouter/ai-sdk-provider` (`createOpenRouter`) for `provider: 'openrouter'`.
- **Catalog-driven routing:** Every allowed `modelId` includes an explicit `provider` (no inference from string shape — gateway and OpenRouter can both use `provider/model`-style slugs).
- **OpenRouter model id:** Catalog entries use a stable `id` (e.g. `or:...`) and an `openRouterModel` field with the API slug (e.g. `openai/gpt-4o-mini`).
- **Curated list:** New OpenRouter rows added manually with pricing used for Convex `estimateCostUsd` (approximate list pricing; refine as needed).
- **Secrets:** `OPENROUTER_API_KEY` server-only; read via SvelteKit `$env/dynamic/private` so the app can run without the key when only gateway models are used.
- **Errors:** Missing OpenRouter key + OpenRouter model → **HTTP 400** with actionable copy (not 500).
- **Deduplication:** Client `estimateCost` in the context component uses the same per-model rates as the catalog (shared derivation from `ideaAiModels`).
- **PRD location:** This file under `docs/features/` is the source of truth.

## Testing Decisions

- **Primary:** **Manual testing** (see checklist below). No required automated test suite for this feature ship.
- **Optional later:** Unit tests for the resolver (mock env) if we want regression coverage without browser runs.

### Manual QA checklist

- [ ] Send a message with a **Vercel AI Gateway** model; stream and tools behave as before.
- [ ] Set `OPENROUTER_API_KEY`, pick an **OpenRouter** catalog model, send a message; stream works.
- [ ] Unset `OPENROUTER_API_KEY`, pick an OpenRouter model, send; receive **400** with a clear configuration message.
- [ ] **Model menu:** two labeled groups (Vercel AI Gateway vs OpenRouter), **checkmark** on the selected row, **hover** on rows, **light and dark** themes.
- [ ] **Daily cap / usage** still increments (Convex) for both provider types; context cost hint looks sane.

## Out of Scope

- Dynamic model discovery from the OpenRouter API.
- User-supplied API keys or BYOK.
- Non–workspace chat AI surfaces.
- Automatic failover between gateway and OpenRouter for the same logical model.

## Further Notes

- **Pricing:** OpenRouter list prices can change; update `ideaAiModels` when needed so caps stay fair.
- Optional **app attribution:** `createOpenRouter` supports `appName` / `appUrl` for OpenRouter dashboard analytics (Referer / title headers).
