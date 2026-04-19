# Launchpad AI Chat Toolset Review + Recommended Target Set

_Last updated: April 19, 2026_

This revision focuses on one question: **what should the AI chat toolset be, given what already exists today**.

---

## 1) Current toolset in the chat API (implemented)

From `src/routes/api/workspace/chat/+server.ts`, the current ToolLoopAgent exposes:

1. `listThreadArtifacts`
2. `readThreadArtifact`
3. `listProjectArtifacts`
4. `importProjectArtifactToThread`
5. `createIdeaArtifact`
6. `createPrdArtifact`
7. `createProjectFromThread`
8. `proposeArtifactEdit`

These are already aligned with Launchpad’s core product rules (thread-scoped context, explicit imports, draft-then-apply edits).

---

## 2) Proposed tools vs current tools (overlap analysis)

## Legend
- **Overlap: Direct** = essentially already covered
- **Overlap: Partial** = same job area, but more precise/new behavior
- **Overlap: None** = net-new capability

| Proposed tool | Overlap with current tools | Overlap level | Keep? | Notes |
| --- | --- | --- | --- | --- |
| `searchArtifacts` | `listThreadArtifacts`, `listProjectArtifacts` | Partial | **Yes** | Existing tools list; this adds retrieval quality (search/filter/ranking). |
| `readArtifactSections` | `readThreadArtifact` | Partial | **Yes** | Existing read returns full markdown; this adds token-efficient partial read. |
| `summarizeArtifactForThread` | none | None | Optional | Useful, but can be done by model without a dedicated persistence tool. |
| `createArtifactFromTemplate` | `createIdeaArtifact`, `createPrdArtifact` | Partial | **No (for now)** | Existing creation tools already handle MVP types; template system can wait. |
| `proposeArtifactSectionEdit` | `proposeArtifactEdit` | Partial | **Yes** | Keeps diffs smaller and safer; strong extension of current edit flow. |
| `compareArtifacts` | none | None | Optional | Good for later planning/iteration, not core MVP loop. |
| `readinessCheckForPromotion` | `createProjectFromThread` | Partial | **Yes** | Existing tool executes promotion; this adds pre-flight decision support. |
| `generateExecutionBacklog` | none | None | **Yes** | Natural next step after PRD; high user value. |
| `extractOpenQuestions` | none | None | **Yes** | Helps de-risk scope before build. |
| `logDecision` | none | None | Optional | Valuable, but can initially be handled as normal artifact edits. |
| `threadMilestoneSnapshot` | none | None | Optional | Useful continuity feature; not critical for first expansion. |
| `budgetAwareMode` | usage/budget checks in server path | Partial | No | Budget control already exists at request gate; no urgent need for dedicated tool. |

---

## 3) Final recommended AI chat toolset

This is the **target toolset** I recommend, including both existing and new tools.

## A) Keep current tools (core, already correct)

1. `listThreadArtifacts`
2. `readThreadArtifact`
3. `listProjectArtifacts`
4. `importProjectArtifactToThread`
5. `createIdeaArtifact`
6. `createPrdArtifact`
7. `createProjectFromThread`
8. `proposeArtifactEdit`

---

## B) Add now (highest ROI, low complexity)

9. `searchArtifacts` *(new)*
10. `readArtifactSections` *(new)*
11. `proposeArtifactSectionEdit` *(new)*
12. `readinessCheckForPromotion` *(new)*

Why these four first:
- Improve retrieval precision and token efficiency
- Improve edit trust via smaller diffs
- Improve promotion quality without auto-writing

---

## C) Add next (strong product leverage)

13. `generateExecutionBacklog` *(new)*
14. `extractOpenQuestions` *(new)*

Why next:
- They convert planning artifacts into immediate execution momentum
- They reduce hidden ambiguity before coding

---

## D) Defer (nice-to-have, not core for current scope)

- `compareArtifacts`
- `logDecision`
- `threadMilestoneSnapshot`
- `summarizeArtifactForThread`
- `createArtifactFromTemplate`
- `budgetAwareMode`

---

## 4) Recommended “set tool set” (single canonical list)

If we freeze one canonical list for roadmap alignment, it should be:

1. `listThreadArtifacts` (existing)
2. `readThreadArtifact` (existing)
3. `listProjectArtifacts` (existing)
4. `importProjectArtifactToThread` (existing)
5. `createIdeaArtifact` (existing)
6. `createPrdArtifact` (existing)
7. `createProjectFromThread` (existing)
8. `proposeArtifactEdit` (existing)
9. `searchArtifacts` (new)
10. `readArtifactSections` (new)
11. `proposeArtifactSectionEdit` (new)
12. `readinessCheckForPromotion` (new)
13. `generateExecutionBacklog` (new)
14. `extractOpenQuestions` (new)

This set keeps the current product principles intact (chat-first, explicit context, user-controlled writes), while adding the highest-leverage missing capabilities.

---

## 5) Vercel AI workflow fit (kept concise)

For this toolset, the most useful workflow patterns are:

1. **Routing**: classify user intent, then expose only relevant tools per turn.
2. **Sequential chain**: convert chat -> structured output -> quality pass.
3. **Evaluator-optimizer (bounded)**: 1–2 refinement passes for PRD quality checks.

For durable background execution (Vercel Workflows), start with one workflow only:
- **Artifact quality pipeline** that generates draft proposals asynchronously and logs progress.

Keep all durable outputs as drafts unless user explicitly applies changes.
