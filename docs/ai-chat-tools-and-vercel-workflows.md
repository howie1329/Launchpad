# Launchpad AI Chat Tools + Vercel Workflow Opportunities

_Last updated: April 19, 2026_

This doc maps AI tool and workflow ideas to Launchpad’s current product shape:

- Chat-first builder workflow
- Thread-scoped artifact memory
- Draft-then-apply edits
- Convex-backed ownership and project/thread scoping

It is intentionally practical: small, high-leverage additions first.

---

## 1) What Launchpad already does well

Current chat agent capabilities already match the product’s core loop:

- Thread artifact discovery/read (`listThreadArtifacts`, `readThreadArtifact`)
- Project artifact discovery/import in project chats (`listProjectArtifacts`, `importProjectArtifactToThread`)
- Create artifacts (`createIdeaArtifact`, `createPrdArtifact`)
- Promote work (`createProjectFromThread`)
- Safe edits via draft changes (`proposeArtifactEdit`)

This is a strong baseline. The next tools should primarily improve:

1. Context quality (better retrieval and less noise)
2. Conversion speed (chat -> usable artifacts faster)
3. Workflow continuity (keep momentum across sessions)
4. Safety and trust (clear write controls and explicit diffs)

---

## 2) Recommended new AI chat tools (product-fit)

## A. Context + retrieval tools

### 1. `searchArtifacts`
**What it does:** semantic + keyword search across user-owned artifacts with filters (`type`, `projectId`, recency).

**Why it fits Launchpad:** users accumulate many artifacts; list-only retrieval will degrade as memory grows.

**Minimal output shape:**
- `artifactId`
- `title`
- `type`
- `projectId`
- `preview`
- `matchReason` (keyword/semantic)

**Guardrails:**
- Never auto-import to thread context
- Return candidates; user confirms import

---

### 2. `readArtifactSections`
**What it does:** fetches only requested headings/sections from markdown artifacts.

**Why it fits:** keeps context token-efficient and avoids dropping full docs into every turn.

**Good inputs:**
- `artifactId`
- `sectionTitles[]` (e.g. `MVP scope`, `Test scenarios`)

---

### 3. `summarizeArtifactForThread`
**What it does:** creates a compact, thread-specific summary snapshot of an artifact for current chat goals.

**Why it fits:** project memory can be large; thread needs focused context.

**Guardrails:**
- Summaries are ephemeral by default
- Persist as artifact only on explicit user request

---

## B. Artifact refinement tools

### 4. `createArtifactFromTemplate`
**What it does:** creates markdown artifacts from controlled templates (`idea`, `prd`, later `brief`, `experiment-plan`).

**Why it fits:** consistency across artifacts without adding heavy schema complexity.

**Guardrails:**
- Template choice explicit in tool input
- Uses same draft-safe editing model for updates

---

### 5. `proposeArtifactSectionEdit`
**What it does:** propose targeted edits to specific sections instead of rewriting whole artifact draft content.

**Why it fits:** smaller diffs are easier to review and trust.

**Good inputs:**
- `artifactId`
- `sectionTitle`
- `proposedReplacementMarkdown`
- optional `summary`

---

### 6. `compareArtifacts`
**What it does:** compares two artifacts (or two PRDs) and returns deltas in goals/scope/test scenarios.

**Why it fits:** builders often iterate direction and need quick “what changed?” clarity.

---

## C. Project progression tools

### 7. `readinessCheckForPromotion`
**What it does:** scores whether a thread is ready for “Create Project from this” based on explicit checklist signals.

**Suggested checks:**
- Problem clarity
- Target user clarity
- MVP scope bounded
- Known risks captured
- Next 1–2 build steps defined

**Why it fits:** aligns with Launchpad’s chat -> project promotion loop.

---

### 8. `generateExecutionBacklog`
**What it does:** derives first implementation backlog from PRD into small tasks (MVP-only).

**Output:** markdown checklist artifact or draft proposal.

**Why it fits:** gives immediate post-PRD momentum.

**Guardrails:**
- Keep scope intentionally narrow
- No autonomous execution in MVP

---

### 9. `extractOpenQuestions`
**What it does:** pulls unresolved decisions from thread + linked artifacts and groups by severity.

**Why it fits:** reduces hidden ambiguity before coding starts.

---

## D. Decision + traceability tools

### 10. `logDecision`
**What it does:** appends a structured decision block to a selected artifact (or creates a dedicated decisions artifact).

**Fields:**
- Decision
- Alternatives considered
- Rationale
- Risks
- Revisit trigger/date

**Why it fits:** preserves “why” behind scope decisions and prevents repeated debates.

---

### 11. `threadMilestoneSnapshot`
**What it does:** snapshots current thread state (summary + linked artifact ids + next actions).

**Why it fits:** better continuity after long gaps between sessions.

---

## E. Usage + budget-aware tools

### 12. `budgetAwareMode`
**What it does:** recommends response mode by daily cap state (`deep`, `balanced`, `lean`).

**Why it fits:** product already enforces daily spend cap; this gives proactive UX before hard stop.

---

## 3) Prioritized rollout (smallest path first)

### Phase 1 (highest ROI, low complexity)
1. `searchArtifacts`
2. `readArtifactSections`
3. `proposeArtifactSectionEdit`
4. `readinessCheckForPromotion`

### Phase 2 (quality + continuity)
5. `extractOpenQuestions`
6. `generateExecutionBacklog`
7. `threadMilestoneSnapshot`

### Phase 3 (nice-to-have)
8. `compareArtifacts`
9. `logDecision`
10. `budgetAwareMode`

---

## 4) Vercel AI workflow patterns that make sense for Launchpad

AI SDK’s workflow patterns are directly relevant for in-request orchestration inside your current chat endpoint.

## A. Sequential processing (chain)
Use for deterministic multi-step transforms.

**Launchpad fit:**
- user request -> clarify intent -> produce structured artifact draft -> quality pass -> final response

**Best for:** PRD generation, backlog generation.

---

## B. Routing
Use a classifier step to decide path/toolset.

**Launchpad fit:**
- classify user turn as: brainstorm / artifact-create / artifact-edit / project-promotion / memory-retrieval
- enable only relevant tools per route

**Benefit:** lower tool misuse and cleaner responses.

---

## C. Parallel processing
Run independent analyses concurrently.

**Launchpad fit:**
- parallel PRD audits: scope risk, test completeness, clarity score
- merge outputs into one concise recommendation

**Benefit:** richer feedback with predictable latency.

---

## D. Evaluator-optimizer loop
Generate -> evaluate against rubric -> revise (bounded iterations).

**Launchpad fit:**
- PRD quality loop with max 2–3 passes and explicit stop condition

**Benefit:** higher artifact quality without manual back-and-forth.

---

## E. Orchestrator-worker
One coordinator delegates to specialized workers.

**Launchpad fit:**
- orchestrator handles plan
- workers for: problem framing, user/persona clarity, MVP slicing, test scenario generation

**Benefit:** good for complex project planning turns.

---

## 5) Vercel Workflow (durable workflows) opportunities

Use Vercel Workflow when work must continue beyond a single request/response, wait for events, or survive retries/deploys.

## Durable candidate workflows for Launchpad

### 1. Artifact quality pipeline (async)
- Trigger: user requests “improve this PRD”
- Steps:
  1. run quality checks
  2. generate section-level proposals
  3. persist draft change candidates
  4. notify user in activity feed

**Why durable:** multiple steps, retry-safe, user can return later.

---

### 2. Human-in-the-loop approval workflow
- Trigger: high-impact edit proposal
- Flow:
  - workflow pauses waiting for explicit user approval event
  - resumes to apply/discard and log activity

**Why durable:** explicit pause/resume maps to approval UX.

---

### 3. Scheduled project heartbeat
- Trigger: daily/weekly schedule
- Flow:
  - summarize project status
  - detect stale artifacts/open questions
  - create “next actions” summary artifact draft

**Why durable:** scheduled long-running background coordination.

---

### 4. Research queue (post-MVP)
- Trigger: user asks for research plan execution
- Flow:
  - fan out sources
  - collect notes
  - evaluate confidence
  - draft research memo

**Why durable:** naturally parallel + retry-heavy + could span minutes/hours.

**Note:** this conflicts with current MVP “no automation”; keep behind future flag.

---

### 5. Project setup assistant
- Trigger: “Create project from this thread”
- Flow:
  - create project
  - relink artifacts
  - create initial backlog draft
  - create kickoff checklist

**Why durable:** chained writes where idempotency and retries matter.

---

## 6) Suggested workflow architecture (simple and safe)

1. **Keep synchronous chat path as default** for immediate responses.
2. **Escalate to durable workflow only** when task is long-running, retriable, or approval-gated.
3. **Use thread + project ids as workflow correlation keys** for traceability.
4. **Persist intermediate results as draft artifacts** (never silent canonical writes).
5. **Emit activity events on each major step** for transparent progress.

---

## 7) Concrete recommendations for next 30 days

1. Add `searchArtifacts` + `readArtifactSections` to improve retrieval precision.
2. Add `proposeArtifactSectionEdit` to reduce oversized diff proposals.
3. Introduce a lightweight routing step in chat to limit active tools by intent.
4. Pilot one durable Vercel Workflow: **Artifact quality pipeline** (async draft proposals only).
5. Add simple metrics for tool success:
   - tool invocation frequency
   - apply/discard rate for draft changes
   - time from chat request to accepted artifact update

---

## 8) Scope boundaries to keep

To stay aligned with Launchpad’s current product strategy:

- Keep chat primary; workflows should support chat, not replace it.
- Keep thread context explicit (no hidden global memory injection).
- Keep user in control of writes (draft-then-apply remains default).
- Avoid autonomous “agent runs wild” behavior in MVP.

If we keep those constraints, these tool/workflow additions should increase quality and speed without increasing product complexity.
