# Durable workflows and orchestration

_Last updated: April 19, 2026_

This document describes **background and long-running orchestration** for Launchpad: how it differs from the live chat tool loop, which **product workflows** fit the app, how to choose a runtime, and **guardrails** that match existing product rules (draft-then-apply, explicit thread context).

**Companion doc:** [ai-chat-tools-and-vercel-workflows.md](ai-chat-tools-and-vercel-workflows.md) — canonical list of chat tools (implemented + planned).

**Official references (external):**

- [Vercel Workflow SDK — Getting started](https://workflow-sdk.dev/docs/getting-started)
- [Vercel Workflow SDK — Cookbook](https://workflow-sdk.dev/cookbook)
- [Trigger.dev — Introduction](https://trigger.dev/docs/introduction)
- [Convex — Workflow component](https://www.convex.dev/components/workflow)

---

## 1. Two layers: chat tool loop vs durable workflow

### Live chat (`POST /api/workspace/chat`)

- SvelteKit handler: `src/routes/api/workspace/chat/+server.ts`
- Uses Vercel AI SDK `ToolLoopAgent` with a **bounded step count** (see `stepCountIs` in that file).
- Tools run **inside the HTTP request**; best for interactive turns: list/read artifacts, create one artifact, propose one draft.

### Durable workflow

- **Multi-step** process that can span retries, deploys, and long model work **without** keeping the chat request open.
- Writes **progress and outputs** into Convex so the UI can show status (and subscriptions can update).
- Should still follow Launchpad rules: **no silent overwrites** of artifacts; durable steps should create **new artifact versions** or **new artifacts**, not bypass the explicit-write rules unless product explicitly adds “auto-apply with consent.”

Use a durable workflow when work:

- Exceeds what fits comfortably in one chat request’s tool budget,
- Needs **retries** or **resume after failure**,
- Combines **several model passes** (generate → critique → revise),
- Should **complete while the user navigates away**.

---

## 2. Runtime options (how they map to this repo)

Launchpad today: **SvelteKit** + **Convex** + **Vercel AI SDK** + **AI Gateway**. No workflow engine is installed in `package.json` yet; this section is for **choosing** when you add one.

| Runtime                                                                  | Strengths for Launchpad                                                                                                                                                  | Tradeoffs                                                                                                                                                     |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[Convex Workflow](https://www.convex.dev/components/workflow)**        | Steps are mostly **Convex queries/mutations** (`artifacts`, `projects`, `chatThreads`). Natural fit for **auth and data locality**, realtime status via Convex.          | Long **external** calls (many minutes of LLM + HTTP) may need careful chunking or delegation.                                                                 |
| **[Trigger.dev](https://trigger.dev/docs/introduction)**                 | **Queues, schedules, dashboards, retries** for AI-heavy pipelines; decouples long work from SvelteKit serverless limits.                                                 | Third service; you **bridge** `runId` ↔ Convex (`workflowRuns`-style table) yourself.                                                                         |
| **[Vercel Workflow SDK](https://workflow-sdk.dev/docs/getting-started)** | Durable **TypeScript steps** next to app code; cookbook patterns for branching/checkpointing. Good if you deploy on **Vercel** and want orchestration near `+server.ts`. | Confirm **SvelteKit** + your adapter match the SDK’s supported deployment model; orchestration is not Convex-native—you still **call Convex** from each step. |

**Heuristic:** If a run is **mostly transactions and reads in Convex**, bias **Convex Workflow**. If it is **mostly long/unreliable LLM or external HTTP**, bias **Trigger.dev** or **Vercel Workflow SDK** and persist results into Convex.

**Scheduled nudges** (cron, simple): Convex [scheduled functions](https://docs.convex.dev/scheduling/scheduled-functions) may be enough without a full workflow component until steps multiply.

---

## 3. Product-shaped workflows (catalog)

Each entry lists **trigger**, **outline of steps**, **Convex touchpoints**, and **why durability helps**.

### W1 — Artifact quality pipeline (recommended first)

**Trigger:** User confirms “Polish / expand this artifact” from artifact page or chat.

**Steps (example):**

1. Load thread-linked artifacts and recent messages (queries).
2. Gap analysis (model or rules): missing PRD sections, vague scope, etc.
3. One or more model passes to produce improved markdown.
4. Persist as a direct artifact update that creates a new **artifact version**, **or** `createArtifact` + `linkArtifactToThread` for a new doc (e.g. PRD from idea), per product choice.
5. Optional bounded **critic** pass; only update the **draft**, never apply in the workflow.

**Convex:** `artifacts`, `artifactVersions`, `threadArtifactLinks`, optionally `activityEvents`.

**Why durable:** Multiple LLM steps + retries without blocking the chat stream.

---

### W2 — Promotion readiness, then promote

**Trigger:** “Prepare project” or wizard before **Create project from thread**.

**Steps:**

1. Analyze linked artifacts + chat for promotion gaps (readiness checklist).
2. Persist checklist (run metadata row, or short-lived artifact).
3. **Human gate:** user reviews in UI.
4. On explicit confirm: **`createProjectFromThread`** (see `src/convex/projects.ts`).

**Why durable:** Clear **pause/resume**; room to add more mutations after promotion later.

---

### W3 — PRD → execution backlog

**Trigger:** User asks for backlog / “first week” plan from a PRD.

**Steps:**

1. Load PRD markdown (by artifact id).
2. Generate backlog markdown (outline → expand → consistency check vs MVP scope).
3. **`createArtifact`** (e.g. type `backlog` or markdown + metadata `source: backlog-generator`) + **`linkArtifactToThread`**.

**Guardrail:** Prefer a **new artifact** or an explicit **draft** on the PRD; avoid silent rewrites of the PRD body.

---

### W4 — Open questions and assumptions

**Trigger:** User or assistant requests “de-risk this scope.”

**Steps:** Ingest thread context → structured list of questions/assumptions → new artifact or direct artifact update appending a `## Open questions` section as a new version.

---

### W5 — Section-scoped refresh

**Trigger:** “Refresh only MVP scope from latest chat.”

**Steps:** Parse headings (or anchors) → model with **section-only** context → merge server-side → direct artifact update with full merged body (until a true section-patch API exists).

**Why durable:** Merge + retry logic; smaller diffs than a full-document artifact update for large PRDs.

---

### W6 — Project memory digest for a new thread

**Trigger:** New project-scoped thread created.

**Steps:** Query project artifacts by recency/type → recursive or budgeted summarization → store digest as **referenced** artifact or thread-attached metadata (product decision).

**Fits PRD:** Project memory stays broad; thread stays focused—the digest is **explicit** context, not silent import of every file.

---

### W7 — Stale thread nudge (scheduled)

**Trigger:** Cron (daily).

**Steps:** Find threads with recent messages but **no** `threadArtifactLinks` in N days → insert **`activityEvents`** (and later notifications).

**Implementation note:** May need composite indexes or a small denormalized flag as usage grows.

---

### W8 — Multi-artifact import and reconcile

**Trigger:** User selects several project artifacts to “import and reconcile.”

**Steps:** Validate ownership → **`linkArtifactToThread`** (`imported`) for each → optional model pass for contradictions → output as new artifact or draft.

---

### W9 — Bounded evaluator loop

**Trigger:** After any generated draft in W1/W3/W5.

**Steps:** Generate → critic (JSON: issues + severity) → at most one revise → write **draft only**.

---

## 4. Composing workflows (super-flows)

Examples of **linear** composition (human gates between stages):

- **Idea → PRD-shaped draft:** W1 targeting new `prd` artifact.
- **PRD → execution:** W3 then W4 on the backlog artifact.
- **Promotion:** W2 → user confirms → `createProjectFromThread` → optional W6 for first project chat.

Avoid a large DAG early; **human apply/discard** in the artifact reader remains the authority for mutating canonical artifact content.

---

## 5. Data model and idempotency (recommended before scale)

Consider a small Convex table (names illustrative):

| Field                                       | Purpose                                                        |
| ------------------------------------------- | -------------------------------------------------------------- |
| `kind`                                      | e.g. `artifact_polish`, `promotion`, `backlog`                 |
| `ownerId`, `threadId`                       | Scope and auth                                                 |
| `status`                                    | `pending`, `running`, `completed`, `failed`                    |
| `externalRunId`                             | Trigger.dev / Vercel Workflow run id, if any                   |
| `outputArtifactIds`, `outputDraftChangeIds` | Links for UI                                                   |
| `idempotencyKey`                            | Client-supplied key to prevent duplicate runs on double-submit |
| `error`                                     | Last failure message                                           |

**Retry-safe steps:** Deduplicate drafts where possible (e.g. by content hash + `pending` on same artifact) or “latest run wins” policy documented in code.

---

## 6. Boundaries and product consistency

- **Chat:** fast steering, short tool loops, user in the loop every turn.
- **Workflows:** batch and multi-pass work; outputs should be **drafts or new artifacts** unless you add explicit, auditable auto-apply (not recommended for v1).
- **Do not** bypass the explicit-write artifact rules from background jobs without a clear user consent design; it violates the “user controls writes” principle in [product-overview.md](product-overview.md).

---

## 7. MVP / PRD note

[chat-first-launchpad-prd.md](chat-first-launchpad-prd.md) lists long-running automation as **out of MVP scope** for the original product definition. Treat durable workflows as **post-MVP** or **internal-only** until you intentionally ship them to users; this doc is **engineering direction**, not a promise of shipped features.
