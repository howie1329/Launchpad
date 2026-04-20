# Supermemory integration — implementation handoff checklist

Derived from [supermemory-integration-prd.md](./supermemory-integration-prd.md). Use this when breaking work into engineering tasks.

## Prerequisites

- [ ] Supermemory org/project, API keys, and environment variable strategy (dev/staging/prod).
- [ ] Confirm data residency / compliance expectations for user and project content sent to Supermemory.
- [ ] Feature flag (e.g. env + per-user or global kill switch) for rollout.

## Scoping and identity

- [ ] Define **container tag** scheme: stable `user:{id}` and `project:{id}` (and any thread-level tags if added later).
- [ ] Map Launchpad `ownerId`, `projectId`, `threadId`, `artifactId` into Supermemory metadata on every ingest/search.
- [ ] Document idempotency keys (e.g. `customId` / document id per artifact revision) to avoid duplicate memories on retries.

## Ingestion (safe_auto)

- [ ] **Artifacts**: on create, update, and draft-apply paths, upsert markdown into Supermemory with full metadata; on delete, tombstone/remove per Supermemory API.
- [ ] **Chat facts**: define “high-signal confirmed” triggers (e.g. user explicit “remember this”, structured confirmations, or post-hoc summarization job)—do not ingest full raw transcripts by default.
- [ ] **MemorySafetyPolicy**: implement redaction / blocklist (secrets, tokens, emails, regulated data patterns); log blocked attempts without storing raw payload.
- [ ] Optional: ingest **thread summaries** only after a summarization step you control.

## Retrieval and composition

- [ ] **MemoryRetrievalService**: query using latest user intent + scoped tags (prefer project scope when in project thread, merge with user scope per PRD).
- [ ] **MemoryContextComposer**: fixed instruction order—app-owned base and project context first, explicit `@artifact` blocks next, then retrieved memory, then user settings preferences.
- [ ] Hard caps: max memories, max characters/tokens, max latency budget; truncate with explicit “truncated” notice in injected block.
- [ ] **MemoryFallbackController**: timeout + error swallow; never fail the chat request solely due to Supermemory.

## Agent integration (full stack)

- [ ] Evaluate **Vercel AI SDK + Supermemory** patterns (`withSupermemory`, memory tools) against current `ToolLoopAgent` + gateway setup; pick one consistent approach for model wrapping vs explicit tool calls.
- [ ] If adding `supermemoryTools`, merge with existing workspace tools without expanding tool surface area beyond what prompts can steer safely.
- [ ] Ensure `addMemory` cannot bypass **MemorySafetyPolicy** (server-side gate, not model-only).

## Observability and ops

- [ ] Metrics: retrieval hit rate, injected token estimate, p95 latency add-on, fallback rate, ingestion success/failure counts.
- [ ] Debug: optional structured log of memory IDs/snippets used per request (redacted in prod if needed).

## UX (minimal v1)

- [ ] Optional “Memory used” disclosure in UI (even if collapsed) to build trust.
- [ ] Settings: link or short copy explaining difference vs artifacts (can be lightweight).

## Rollout

- [ ] Ship behind flag; dogfood internally; ramp % of users or opt-in beta.
- [ ] Runbook: disable flag, purge project tags if needed, support “forget my memory” path if product requires it.

## References (external)

- Supermemory docs index: https://supermemory.ai/docs/llms.txt
- AI SDK integration: https://supermemory.ai/docs/integrations/ai-sdk
