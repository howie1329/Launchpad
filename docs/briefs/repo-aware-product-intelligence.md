# PRD: Repo-aware product intelligence

**Status:** Exploration
**Product surface:** Project-scoped workspace chat
**Working name:** Repository snapshot

## Problem Statement

Launchpad helps solo builders decide what to build and preserve product decisions, but its main AI chat cannot inspect the codebase behind a project. Users must manually explain what exists, paste files, or accept plans based on incomplete context. This makes gap analysis, feature scoping, prioritization, PRDs, and implementation plans less trustworthy.

The product needs durable, current-enough repository context without turning chat into a coding agent or making each chat request clone and scan a repository. Users should be able to see which revision was analyzed and trace material claims back to source files.

## Solution

Let a user connect one GitHub repository to a Launchpad project and manually request a read-only analysis. A background worker checks out a selected branch at a specific commit, scans a bounded set of text files without executing repository code, and saves a structured repository snapshot in Convex.

Project chat uses the latest successful snapshot through small read/search tools. It answers product questions with file evidence and states when the snapshot may be stale or does not support a conclusion. The snapshot is project context, not a user-editable artifact and not a replacement for Convex artifacts.

The first release is successful when repo-aware answers are materially more accurate and actionable than answers given only the project summary, while remaining fast enough for normal conversation.

## Product Fit

This feature strengthens Launchpad's existing loop rather than adding a new one:

| Existing product step | Today                                                                                                    | With repository intelligence                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Think in chat         | The assistant uses messages, project summary, artifacts, memory, web search, and selected external apps. | Project chat can also inspect a pinned repository snapshot when the question depends on implementation reality. |
| Preserve decisions    | The user explicitly saves durable artifacts such as PRDs and briefs.                                     | Repo-aware answers can become the same reviewed artifacts; snapshots themselves remain derived context.         |
| Organize work         | Projects contain related threads, artifacts, actions, and activity.                                      | A project may also have one connected repository and one active snapshot.                                       |
| Observe external work | Launchpad Actions bring GitHub and Linear events into project activity.                                  | Repository snapshots explain the current codebase; Actions continue to explain what recently happened.          |
| Decide what is next   | The assistant combines saved intent and conversation context.                                            | The assistant can compare saved intent with code evidence before recommending scope or priority.                |

Repository intelligence belongs only after an idea becomes a project. General chat should remain lightweight and exploratory. This preserves the distinction between early thinking and codebase-grounded planning.

The feature adds one kind of context, not a separate workspace:

- **Artifacts** contain reviewed intent, decisions, requirements, and plans.
- **Repository snapshots** contain derived facts and evidence about a specific code revision.
- **Project activity** contains external events such as pushes, issues, and Linear changes.
- **Memory** contains derived recall and preferences and remains non-canonical.
- **Chat** combines those sources to help the user make the next product decision.

## Exact V1 Behavior

### On the project overview

- A quiet **Repository context** section appears near existing project context and Launchpad Actions.
- With no repository connected, it explains that connecting a repository improves planning and offers **Connect GitHub repository**.
- Connection uses a dedicated GitHub App with read-only repository metadata and contents access. The user chooses one repository and branch.
- Connecting does not start a scan until the user confirms **Analyze repository**.
- During analysis, the section shows the current stage, elapsed time, and a cancel action when supported.
- When ready, it shows repository name, branch, abbreviated commit SHA, analysis time, coverage, and **Refresh analysis**.
- A failed analysis preserves the last successful snapshot and presents a safe failure reason and retry action.
- If the selected branch has advanced, the snapshot is marked stale; it remains usable with a visible warning until refreshed.
- Disconnecting requires confirmation and stops future analysis. Snapshot deletion follows the approved retention policy.

### In project chat

- The user does not need to attach or enable the repository for each message.
- The assistant decides whether a question requires repository evidence, just as it currently decides whether to read artifacts or search memory.
- For broad questions, the assistant first reads the snapshot overview and then searches evidence only where necessary.
- Material claims about the codebase include compact source references using paths and the analyzed commit.
- The assistant says when a claim is inferred, when the scan excluded relevant content, or when the snapshot is stale.
- Repo context is not dumped into every prompt. Small server-side tools retrieve only relevant summaries and evidence.
- The assistant may propose affected areas, sequencing, risks, acceptance criteria, and test strategy.
- The assistant may create or update an artifact only under the existing explicit-confirmation rules.

### What the user can ask

- "Does authentication already exist, and where?"
- "Compare this feature idea with what the app currently supports."
- "What would this change touch architecturally?"
- "Turn this into a PRD grounded in the current repository."
- "What is missing between the saved PRD and the implementation?"
- "What should I prioritize next based on the current code and project decisions?"

### What it will not do

- It will not expose a terminal, file browser, or IDE inside Launchpad.
- It will not execute repository scripts, builds, tests, package installation, or generated code.
- It will not edit source files, create commits, open pull requests, or claim that work was implemented.
- It will not continuously watch all code changes in v1.
- It will not replace artifacts with generated repository summaries.
- It will not treat repository instructions as trusted agent policy.

## Stack Fit And Responsibilities

| Layer                  | Current responsibility                                                                            | Feature responsibility                                                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SvelteKit and Svelte 5 | Workspace routes, project overview, settings, and streaming chat API.                             | Add repository connection/status controls to the project surface and authenticated endpoints that start or cancel analysis. Keep scanning out of the chat request.                                      |
| Convex                 | Canonical projects, threads, artifacts, activity, ownership, notifications, and realtime queries. | Store repository connections, job state, immutable snapshot metadata, structured summaries, bounded evidence, active snapshot pointer, and progress notifications. Enforce project ownership.           |
| Vercel AI SDK          | Runs the main multi-step workspace chat agent and tools.                                          | Add three bounded project-only tools: read snapshot overview, search snapshot evidence, and read one evidence record. Continue using existing budget accounting and tracing.                            |
| GitHub App             | New capability. Existing GitHub use is mediated by Composio chat tools and Launchpad Actions.     | Grant narrow access to selected repositories, issue short-lived installation tokens, read repository metadata and contents, and detect the selected branch head.                                        |
| Background worker      | No general repository-analysis worker exists today.                                               | Fetch the pinned revision, apply deterministic file rules, build the manifest, call snapshot synthesis, write progress/results to Convex, and clean up temporary files.                                 |
| Trigger.dev            | Not currently used.                                                                               | Recommended v1 worker: durable background tasks, retries, idempotency, cancellation, and operational visibility for a bounded static-analysis pipeline.                                                 |
| Daytona                | Not currently used.                                                                               | Deferred option when analysis requires a stronger ephemeral computer boundary, native repository tooling, or future controlled execution. It is unnecessary for an API/file-based static scanner in v1. |
| Composio               | Connected chat tools and GitHub/Linear project activity triggers.                                 | Continue serving those workflows. Do not use dynamic chat tools as the canonical repository ingestion pipeline.                                                                                         |
| Supermemory            | Optional derived recall from workspace state.                                                     | No v1 role. Do not upload source evidence or replace deterministic snapshot retrieval with semantic memory.                                                                                             |
| Braintrust             | Optional workspace-chat tracing and evals.                                                        | Extend eval datasets and trace repo tool usage without adding source bodies to custom metadata.                                                                                                         |

### Recommended request flow

1. The project UI requests repository access through the GitHub App and saves the selected repository and branch in Convex.
2. The user starts analysis; an authenticated SvelteKit endpoint validates ownership and creates an idempotent snapshot job record in Convex.
3. The endpoint triggers the worker with opaque job and project identifiers, then returns immediately.
4. The worker requests a short-lived GitHub installation token, resolves the branch to a commit SHA, and marks the job as scanning.
5. The worker fetches a bounded repository archive or shallow checkout for that exact SHA, applies ignore and safety rules, and creates a deterministic manifest.
6. The worker synthesizes structured project, architecture, feature, and planning summaries with evidence references.
7. Convex validates and stores the immutable snapshot, marks it active, and updates the project in realtime.
8. During project chat, repo tools query only the active snapshot after enforcing project ownership and response-size limits.
9. A lightweight branch-head check marks the snapshot stale when the repository has advanced; v1 refresh remains manual.

### Why this division

- Convex remains the durable product state and realtime coordination layer, matching the current architecture.
- SvelteKit remains the authenticated web and chat boundary without becoming a long-running worker.
- The AI SDK continues to orchestrate conversational tool use rather than repository ingestion.
- A GitHub App offers repository-specific installations, narrow permissions, webhooks, and short-lived server-to-server tokens. This is a clearer security boundary than treating a general connected-app session as ingestion infrastructure.
- Trigger.dev is designed for long-running background tasks with status handles, retries, idempotency, and isolated task execution. It solves the v1 orchestration problem without introducing an agent computer.
- Daytona provides isolated sandboxes with their own kernel, filesystem, network, and lifecycle APIs. That is valuable if Launchpad later needs controlled repository commands, but it would add capability and product risk beyond a read-only static scanner.
- Convex actions can call external services and run in Node, but currently time out after ten minutes. They remain suitable for coordination or a small API-only prototype, not the preferred home for repository checkout and multi-stage analysis.

Official platform references: [GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps), [Convex actions](https://docs.convex.dev/functions/actions), [Trigger.dev execution model](https://trigger.dev/docs/how-it-works), and [Daytona sandboxes](https://www.daytona.io/docs/en/).

## V1 Experience

1. The user opens a Launchpad project and connects a GitHub repository.
2. The user selects a branch and starts analysis manually.
3. Launchpad shows queued, scanning, ready, failed, and stale states outside the chat stream.
4. A background worker creates a read-only checkout and builds a structured snapshot.
5. The project shows the analyzed repository, branch, commit SHA, completion time, and scan coverage.
6. Project chat can inspect the snapshot when a question depends on the codebase.
7. Repo-backed claims include paths and, where available, line ranges from the analyzed commit.
8. The user manually refreshes the snapshot after repository changes.

## Core Questions V1 Must Answer

1. What parts of this proposed feature already exist?
2. Which modules, routes, data models, and documents are relevant to this idea?
3. What remains to be built, and what are the likely dependencies or risks?
4. Does the proposal fit the current architecture and established project patterns?
5. Can Launchpad produce an evidence-backed PRD, feature brief, or implementation plan?
6. Given the current codebase and saved project decisions, what should the user prioritize next?

## User Stories

1. As a project owner, I want to connect a GitHub repository to a Launchpad project, so that product conversations reflect the software I am building.
2. As a project owner, I want to choose the branch Launchpad analyzes, so that the snapshot matches the work I care about.
3. As a project owner, I want analysis to start only when I request it, so that repository access and AI usage remain intentional.
4. As a project owner, I want to see analysis progress, so that I know whether repository context is available.
5. As a project owner, I want analysis to happen outside the chat request, so that normal chat remains responsive.
6. As a project owner, I want to see the exact commit SHA and analysis time, so that I can judge freshness.
7. As a project owner, I want a clear stale state when the tracked branch advances, so that old context is not presented as current.
8. As a project owner, I want to refresh a snapshot manually, so that I control when Launchpad consumes repository resources.
9. As a project owner, I want failed scans to explain the failure and be retryable, so that a temporary error does not permanently disconnect the project.
10. As a project owner, I want private repository access to remain scoped to the repository I selected, so that Launchpad does not gain unnecessary access.
11. As a project owner, I want Launchpad to read repository content without executing it, so that analysis does not run untrusted project code.
12. As a builder, I want to ask what already exists for a feature, so that I avoid planning duplicate work.
13. As a builder, I want relevant files and modules identified, so that I can validate the assistant's understanding.
14. As a builder, I want architectural patterns summarized, so that new work fits the existing application.
15. As a builder, I want missing work separated from uncertain inferences, so that a plan does not present guesses as facts.
16. As a builder, I want source references for material claims, so that I can inspect the evidence quickly.
17. As a builder, I want Launchpad to say when evidence is insufficient, so that I do not rely on false confidence.
18. As a builder, I want generated PRDs and briefs grounded in the snapshot, so that planning documents match the codebase.
19. As a builder, I want implementation plans to name affected areas and dependencies without editing code, so that I can hand work to my coding tool.
20. As a builder, I want prioritization suggestions to combine repository gaps with saved project decisions, so that recommendations reflect both product intent and implementation reality.
21. As a builder, I want normal product questions to remain conversational, so that repository evidence does not overwhelm every response.
22. As a builder, I want the assistant to distinguish repository facts from saved artifacts and external activity, so that provenance remains clear.
23. As a builder, I want ignored, generated, binary, secret-like, and oversized files excluded, so that scans are useful and bounded.
24. As a builder, I want scan coverage summarized, so that I know what was and was not inspected.
25. As a builder, I want a repository connection removable from a project, so that I can revoke access and stop future scans.
26. As a builder, I want stored repository context deleted when I disconnect it, subject to an explicit retention policy, so that old source data is not retained unexpectedly.
27. As a Launchpad operator, I want file, byte, duration, and AI-budget limits, so that one repository cannot exhaust system capacity.
28. As a Launchpad operator, I want snapshot jobs to be idempotent per project and commit, so that retries do not create duplicate context.
29. As a Launchpad operator, I want scan failures and durations observable without storing secrets or unnecessary source content in logs, so that the system can be operated safely.
30. As a Launchpad evaluator, I want a fixed set of repo-aware questions with expected evidence, so that answer quality can be compared against the current chat baseline.

## Snapshot Contract

Each successful snapshot should expose a stable, structured contract to chat:

- Repository identity: provider, repository owner/name, default branch, selected branch, and repository URL.
- Revision identity: commit SHA and commit timestamp.
- Lifecycle: queued, scanning, ready, failed, or stale; created, started, and completed timestamps; safe error summary.
- Coverage: included and excluded file counts, text bytes scanned, applied limits, and exclusion reasons.
- Project profile: detected languages, frameworks, package managers, applications, and top-level structure.
- Architecture: major modules, routes, data stores, external integrations, and important data flows.
- Product surface: user-facing capabilities inferred from routes, components, documentation, and tests.
- Planning signals: TODOs, incomplete areas, explicit roadmap notes, architectural constraints, and test coverage signals.
- Evidence: path, optional line range, content digest, and a short supporting excerpt or summary.
- Analysis metadata: snapshot schema version, analyzer version, and model identifier where AI synthesis is used.

The snapshot should store structured summaries and bounded evidence, not an unrestricted duplicate of the repository. Exact storage limits and retention duration must be approved before implementation.

## Implementation Decisions

- Repository awareness is available only in project-scoped chat in v1.
- GitHub is the only repository provider in v1 and uses an installation or connection with repository-scoped read access.
- A project has at most one active repository connection in v1.
- Snapshot creation and refresh are manual. Scheduled scans and automatic webhook refresh are deferred.
- Every snapshot is immutable and tied to a branch and commit SHA. A newer successful snapshot becomes active; older snapshot retention is policy-controlled.
- Repository analysis runs as a background job. The streaming chat route never clones or scans a repository.
- The worker performs a read-only checkout and static inspection. It does not install dependencies, run scripts, execute tests, build the repository, or apply changes.
- Deterministic discovery happens before AI synthesis: honor repository ignore rules, reject binary and secret-like files, enforce allowlists and limits, then summarize accepted content.
- Convex owns repository connection metadata, job state, snapshot metadata, structured summaries, and progress updates. The execution provider owns only the ephemeral checkout and scan process.
- Chat receives small tools to inspect snapshot overview, search snapshot evidence, and read a bounded evidence record. The full snapshot is not injected into every prompt.
- Repo-backed claims cite the analyzed commit and evidence paths. The assistant distinguishes direct evidence, inference, and missing evidence.
- Existing artifacts remain canonical user-authored project memory. Repository snapshots are derived, read-only context with separate provenance.
- Existing project ownership checks apply to every connection, job, snapshot, and evidence read.
- Provider selection is deferred until a thin scanning prototype compares operational fit. Daytona is favored when isolated repository tooling is required; Trigger.dev may orchestrate work but is not itself the isolation boundary; a Convex action is acceptable only for a tightly bounded API-only prototype.

## Proposed Modules

- **Repository connection:** owns provider identity, selected repository and branch, authorization state, disconnect behavior, and ownership checks.
- **Snapshot coordinator:** exposes start, retry, status, activate, and stale-marking operations while keeping jobs idempotent.
- **Repository scanner:** accepts a repository revision and limits, then returns a deterministic file manifest and bounded source records without executing code.
- **Snapshot synthesizer:** converts the manifest and source records into the versioned snapshot contract with evidence links.
- **Snapshot context tools:** give workspace chat bounded overview, search, and evidence-read operations with provenance.
- **Repository context UI:** presents connection, branch selection, progress, revision, coverage, freshness, refresh, failure, and disconnect states on the project surface.
- **Repo-aware eval suite:** compares baseline and snapshot-assisted answers for coverage, factuality, evidence quality, usefulness, latency, and cost.

These modules should have small contracts so the execution provider can change without rewriting chat, storage, or UI behavior.

## Evaluation Plan

Create two small fixture repositories that model Launchpad-like applications: one well documented and one with incomplete or misleading documentation. For each repository, pin a commit and define expected evidence for the six core questions.

Compare the current project chat baseline against snapshot-assisted chat on:

- **Factual coverage:** required existing capabilities and missing work correctly identified.
- **Groundedness:** material claims supported by valid evidence from the pinned commit.
- **Citation precision:** cited paths and line ranges support the claim.
- **Uncertainty calibration:** unsupported conclusions are qualified or declined.
- **Planning usefulness:** output gives actionable scope, dependencies, risks, and sequencing.
- **Product boundary:** output plans work but does not claim to edit, run, or ship code.
- **Freshness awareness:** answers identify the analyzed revision and warn when stale.
- **Performance:** chat-tool retrieval latency and total background scan duration remain within approved targets.
- **Cost:** bytes processed and model usage remain within approved per-snapshot limits.

Initial release gate: every deterministic factual and citation check passes, no critical unsupported claims appear in manual review, and snapshot-assisted answers improve planning usefulness over baseline on at least five of the six core questions. Numeric latency, scan-size, and cost targets should be set after the prototype measures realistic repositories.

## Testing Decisions

- Test external behavior and contracts rather than worker internals or prompt wording.
- Unit-test repository path normalization, ignore rules, binary/secret-like exclusion, limits, snapshot validation, freshness calculation, and evidence citation formatting.
- Integration-test ownership, job idempotency, status transitions, retry behavior, snapshot activation, disconnect cleanup, and bounded chat tool responses.
- Use fixture repositories pinned to known commits for scanner contract tests; never depend on a moving public branch.
- Extend the existing workspace chat eval pattern with deterministic tool stubs before adding optional model-judged usefulness scoring.
- Add manual security validation for private repository access, token exposure, malicious repository instructions, archive/path traversal, symlinks, oversized files, and disconnect behavior.

## Out of Scope

- Editing files, creating commits or branches, opening pull requests, or applying patches.
- Arbitrary terminal access or command execution.
- Installing dependencies, building projects, running tests, or executing repository code.
- Continuous indexing, scheduled refresh, or webhook-driven refresh.
- Multiple repositories per Launchpad project.
- Providers other than GitHub.
- Whole-repository embeddings or semantic indexing.
- Full source-code storage without explicit limits and retention approval.
- Automatic code review, issue triage, CI diagnosis, or coding-agent workflows.
- Repository access in general, non-project chat.

## Risks And Guardrails

- **Prompt injection in repository content:** treat all repository text as untrusted data, keep it outside system policy, and restrict available tools during synthesis.
- **Secret exposure:** exclude common secret paths and detected credentials before AI processing; do not log source bodies or tokens.
- **Untrusted execution:** use read-only static analysis and an isolated ephemeral checkout; never execute repository content in v1.
- **Stale advice:** display revision and stale state and include freshness metadata in repo-aware responses.
- **False confidence:** require evidence for material repo claims and explicitly label inference.
- **Cost and latency:** enforce hard file, byte, duration, concurrency, and model-budget limits before rollout.
- **Vendor lock-in:** keep the scanner input/output contract independent from the job and sandbox provider.
- **Product drift:** repo tools are read-only and planning-oriented; no mutation or terminal tools are exposed to chat.

## Open Decisions Before Implementation

1. Which GitHub authentication path should v1 reuse or add, and what exact repository permissions are acceptable?
2. What are the maximum files, bytes, individual file size, scan duration, concurrency, and AI cost per snapshot?
3. How long are inactive snapshots and bounded evidence retained after refresh or disconnect?
4. Is branch freshness checked only when the user opens a project, or also through a lightweight periodic metadata check?
5. Which execution provider best satisfies isolation, cancellation, observability, and cost requirements in a representative prototype?
6. Should source excerpts be stored in Convex or fetched on demand by commit SHA after summaries are stored?

## Further Notes

The central product contract is: **Launchpad understands what exists, identifies what matters next, and turns product intent into evidence-backed plans. It does not edit or run the product.**

Implementation requires explicit approval for schema changes, GitHub authorization, data retention, and any new runtime dependency or execution vendor.
