## Problem Statement

As a workspace user, I can currently run chat through Vercel AI Gateway, OpenRouter, and Groq catalog entries, but not NVIDIA NIM. That blocks me from using NIM-hosted models in the same chat workflow, model picker, and daily-cap tracking system.

## Solution

Add NVIDIA NIM as a first-class provider in Launchpad’s existing curated model catalog and route selected NIM models through the AI SDK OpenAI-compatible provider path. NIM models will appear in both model pickers (landing and active thread), require `NIM_API_KEY` on the server, and use the same usage/cost estimation pipeline as existing providers.

## User Stories

1. As a workspace user, I want to choose NVIDIA NIM models in the model selector, so that I can run chat on NIM-hosted models.
2. As a workspace user, I want the same NIM options on both chat entry points, so that model selection is consistent before and after thread creation.
3. As a workspace user, I want NIM to work with the existing streaming chat flow, so that I do not lose current interaction quality.
4. As a workspace user, I want NIM responses to still use workspace tools, so that artifact and project workflows stay intact.
5. As a workspace user, I want my selected model to remain explicit in usage records, so that spend and history are understandable.
6. As a workspace user, I want daily cap estimation to include NIM usage, so that budget controls remain meaningful.
7. As a workspace user, I want clear setup guidance if NIM is not configured, so that I can fix environment issues quickly.
8. As a workspace user, I do not want silent fallback to another provider, so that my chosen model/provider is respected.
9. As a workspace operator, I want one env var (`NIM_API_KEY`) for NIM setup, so that deployment configuration is straightforward.
10. As a maintainer, I want provider routing kept in one resolver, so that adding providers remains predictable.
11. As a maintainer, I want shared model-group rendering in picker UIs, so that adding a provider is not duplicated in multiple components.
12. As a maintainer, I want provider IDs to avoid collisions, so that model validation stays safe.
13. As a maintainer, I want NIM model IDs prefixed consistently, so that provider provenance is obvious.
14. As a maintainer, I want a curated static NIM model list initially, so that we keep launch scope small and maintainable.
15. As a maintainer, I want title generation to remain on gateway defaults, so that optional NIM setup does not affect titling behavior.
16. As a support engineer, I want API errors to be actionable and specific, so that support requests are faster to resolve.
17. As a product owner, I want the NIM launch to be additive, so that existing provider users are unaffected.
18. As a product owner, I want a small v1 scope (two NIM models), so that we can ship quickly and iterate.
19. As a product owner, I want docs updated with the new provider setup, so that onboarding stays accurate.
20. As a product owner, I want no forced migrations for current users, so that this release has low operational risk.

## Implementation Decisions

- Add `nim` as a new `IdeaAiModelProvider` and keep NIM model IDs namespaced as `nm:<slug>`.
- Introduce a NIM model shape in the catalog with `nimModel`, context limits, and approximate input/output token rates.
- Ship with a curated two-model starter set:
  - `deepseek-ai/deepseek-r1`
  - `meta/llama-3.3-70b-instruct`
- Route NIM through `@ai-sdk/openai-compatible` with base URL `https://integrate.api.nvidia.com/v1` and `NIM_API_KEY`.
- Add `NIMNotConfiguredError` and return HTTP 400 with actionable setup copy when a NIM model is selected without key configuration.
- Keep the current gateway/OpenRouter/Groq behavior unchanged.
- Keep thread title generation pinned to gateway default model.
- Extract shared model-provider grouping metadata for both selector UIs so provider sections and logos come from one source.
- Add NVIDIA provider labeling and logo mapping for selector display.
- Update docs to include NIM provider behavior and environment variable setup.

## Testing Decisions

- Good tests validate externally visible behavior (model availability, routing outcomes, and user-facing error behavior), not internal implementation details.
- For this v1, ship with manual QA only (no new automated tests).
- Manual QA coverage:
  - NIM models render in both model selectors.
  - Chat succeeds with NIM when `NIM_API_KEY` is configured.
  - Chat returns clear 400 configuration error when NIM is selected without `NIM_API_KEY`.
  - Daily usage/cost accounting still records NIM model IDs and updates cap usage.
  - Existing Gateway/OpenRouter/Groq flows still work.

## Out of Scope

- Dynamic model discovery from NVIDIA APIs.
- Per-workspace or per-user custom NIM model catalogs.
- Automatic fallback from NIM to other providers.
- BYOK UI flows for provider keys.
- Additional telemetry dashboards for provider adoption in this release.

## Further Notes

- NIM pricing inputs are intentionally approximate for v1 and should be revised as provider pricing evolves.
- The implementation keeps provider expansion straightforward by centralizing catalog and selector grouping logic.
