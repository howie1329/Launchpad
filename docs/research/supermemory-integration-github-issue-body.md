## Summary

Product requirements for integrating **Supermemory** with Launchpad as an augmentation layer on top of existing artifacts, threads, and projects—without replacing Convex as source of truth.

Canonical copy with validation notes: [docs/supermemory-integration-prd.md](docs/supermemory-integration-prd.md)

---

## Problem Statement

Launchpad currently relies on explicit durable context (artifacts linked to threads/projects) plus static instruction layers in workspace chat. This model is strong for user-controlled memory, but it misses high-quality automatic recall across conversations and projects, which can reduce personalization, continuity, and assistant usefulness over time.

Users should not need to repeatedly restate stable facts, ongoing project context, or recently confirmed constraints. The assistant should recall relevant context automatically while preserving Launchpad’s existing explicit-memory UX and safety posture.

## Solution

Integrate Supermemory as a memory retrieval and context infrastructure layer that augments (not replaces) Launchpad’s existing artifact and project/thread memory model.

V1 targets a **full-stack integration** with the following behavior:

- Use **user + project scoped memory boundaries**.
- Enable **safe automatic memory writes** from high-signal sources (artifacts and confirmed important chat facts), while filtering sensitive or low-confidence content.
- Retrieve and inject memory context into the chat model in a bounded, explainable, and fail-safe way.
- Keep existing Launchpad artifact workflows and memory tools as primary user-facing controls.

The result is improved contextual continuity and personalization with strict latency/token guardrails.

## User Stories

1. As a returning user, I want Launchpad to remember stable preferences and context, so that I don’t repeat them each chat.
2. As a builder working across multiple threads in one project, I want relevant prior project context recalled automatically, so that responses stay consistent.
3. As a user working on unrelated projects, I want memory isolation between projects, so that context does not leak.
4. As a user, I want global profile-level memory for durable personal preferences, so that my style and defaults carry over where appropriate.
5. As a user, I want the assistant to recall only relevant memories for my current question, so that responses are focused.
6. As a user, I want clearly bounded memory injection, so that memory does not overwhelm model instructions.
7. As a user, I want sensitive details not to be auto-saved to memory, so that my privacy is protected.
8. As a user, I want explicit artifacts to remain first-class memory objects, so that I keep control over durable knowledge.
9. As a user, I want references to thread-linked artifacts to keep working exactly as today, so that existing workflows are not disrupted.
10. As a user, I want memory retrieval failures to degrade gracefully, so that chat remains available.
11. As a user, I want continuity after artifact edits, so that memory reflects the latest artifact content.
12. As a user, I want contradictions to resolve over time in memory, so that stale context is less likely to appear.
13. As a user, I want memory behavior to align with my settings preferences, so that personalization feels coherent.
14. As a product owner, I want measurable quality lift with bounded latency/cost, so that the integration is worth shipping.
15. As an engineer, I want memory scope and metadata to be explicit and queryable, so that debugging and observability are practical.
16. As an engineer, I want idempotent ingestion and update semantics, so that retries don’t duplicate memory.
17. As an engineer, I want stable fallback behavior when Supermemory is unavailable, so that reliability remains high.
18. As an engineer, I want source traceability from injected memories back to Launchpad entities, so that incorrect recall can be audited.
19. As an admin/operator, I want controls for memory write aggressiveness and safeguards, so that policy can evolve safely.
20. As a future PM, I want a path to add deeper memory tooling later, so that v1 architecture does not block expansion.

## Implementation Decisions

- Integrate Supermemory as an augmentation layer in chat orchestration, not as a replacement datastore.
- Keep Launchpad data model authoritative for user identity, projects, threads, artifacts, and links.
- Use Supermemory with **full-stack pattern**:
  - ingestion APIs for artifact and selected chat-fact writes,
  - retrieval for runtime context recall,
  - optional profile context inclusion for personalization.
- Scope memory by **user + project**:
  - user scope for durable personal/global context,
  - project scope for workspace-specific context.
- Preserve current instruction layering and append retrieved memory as an additive section with explicit delimiters and precedence rules.
- Maintain existing explicit artifact controls and tools; memory retrieval is assistive, not authoritative.
- Auto-write policy is **safe_auto**:
  - always ingest artifact lifecycle updates,
  - ingest only high-signal confirmed conversational facts,
  - exclude sensitive/unsafe content via filtering policy.
- Retrieval policy:
  - query-time memory search using last user intent + scope filters,
  - rank and cap injected memory by relevance and token budget,
  - enforce per-request limits to protect latency/cost.
- Failure policy:
  - if Supermemory retrieval or ingestion errors occur, proceed with current Launchpad behavior and record telemetry.
- Observability:
  - track retrieval hit rates, injected token size, latency impact, fallback rates, and quality indicators.
- Rollout strategy:
  - feature-flagged rollout with staged exposure and guardrail thresholds.

### Planned module boundaries (deep modules)

- **MemoryIngestionService**: deterministic ingestion/update/delete contract from Launchpad entities into Supermemory with idempotency and metadata normalization.
- **MemoryRetrievalService**: scope-aware retrieval API returning ranked, bounded memory candidates.
- **MemoryContextComposer**: composes model instructions from base/project/ref-artifact/memory/settings layers with clear precedence and token caps.
- **MemorySafetyPolicy**: encapsulates safe_auto rules for what can be persisted, redaction/exclusion rules, and confidence thresholds.
- **MemoryFallbackController**: handles timeouts/errors and guarantees graceful degradation paths.

## Testing Decisions

Testing requirements are not mandated at the PRD level per product preference. During implementation, prefer tests that assert **externally observable behavior** (e.g., chat still succeeds when Supermemory is down; injected memory respects caps; unsafe content is not persisted) rather than brittle internals. Integration-style tests around chat orchestration with memory on/off are recommended where cost-effective.

## Out of Scope

- Replacing Launchpad artifacts as the canonical memory model.
- Large UX redesign of settings or artifact management.
- Full organization/admin governance workflows for memory.
- Cross-org shared memory or enterprise policy engines.
- Broad connector ecosystem rollout (Drive/Notion/etc.) in this phase.
- Automatic ingestion of all raw conversation turns without filtering.

## Further Notes

- This PRD intentionally prioritizes balanced outcomes: measurable quality/personalization improvements with strict latency and token discipline.
- The implementation should preserve current user trust model: explicit artifacts remain user-visible, editable, and primary for durable knowledge.
- A phased rollout is recommended, but architecture should be laid out for full-stack capability from the start.
