# Launchpad AI Chat Toolset Review + Recommended Target Set

_Last updated: April 19, 2026_

This revision focuses on one question: **what should the AI chat toolset be, given what already exists today**.

**Durable workflows (separate concern):** Multi-step and background orchestration (polish pipelines, promotion gates, backlog generation) should **not** overload the live chat tool loop. See **[durable-workflows-and-orchestration.md](durable-workflows-and-orchestration.md)** for runtime comparison (Convex Workflow, Trigger.dev, Vercel Workflow SDK) and product-shaped workflow catalog.

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
8. `updateThreadArtifact`

These are already aligned with Launchpad’s core product rules (thread-scoped context, explicit imports, explicit user-authorized writes).

**Implementation location:** `src/routes/api/workspace/chat/+server.ts` (`workspaceTools`). System instructions for when to call tools are in the same file (`baseInstructions`).

**Convex mutations/queries used by tools (representative):** artifact and thread helpers in `src/lib/artifacts.ts` and `src/lib/projects.ts` reference Convex functions such as `createArtifact`, `updateThreadArtifact`, `linkArtifactToThread`, `createProjectFromThread`, and listing queries—see `src/convex/artifacts.ts` and `src/convex/projects.ts`.

---

## 1b) Enhancing existing tools (without adding new names)

These improvements keep the same tool **names** but make them safer or cheaper for the model:

| Tool                                           | Enhancement idea                                                                                                                                                            |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `readThreadArtifact`                           | Optional **range or section** parameters (or a follow-on tool) so the model does not pull full large markdown every time; today the handler returns full `contentMarkdown`. |
| `listThreadArtifacts` / `listProjectArtifacts` | Richer list payload: **char counts**, **section headings**, or **last edited** hints so the model can choose what to read next without an extra read.                       |
| `createPrdArtifact`                            | Optional **validation mode**: respond with missing-field checklist **before** persisting when inputs are thin (product choice: strict vs lenient).                          |
| `updateThreadArtifact`                         | Server-side **size warnings** or summary metadata so the model prefers focused, user-requested updates when docs are huge.                                                  |
| `importProjectArtifactToThread`                | Return a short **summary line count** after import so the model knows how heavy the new context is.                                                                         |

---

## 2) Proposed tools vs current tools (overlap analysis)

## Legend

- **Overlap: Direct** = essentially already covered
- **Overlap: Partial** = same job area, but more precise/new behavior
- **Overlap: None** = net-new capability

| Proposed tool                | Overlap with current tools                    | Overlap level | Keep?            | Notes                                                                             |
| ---------------------------- | --------------------------------------------- | ------------- | ---------------- | --------------------------------------------------------------------------------- |
| `searchArtifacts`            | `listThreadArtifacts`, `listProjectArtifacts` | Partial       | **Yes**          | Existing tools list; this adds retrieval quality (search/filter/ranking).         |
| `readArtifactSections`       | `readThreadArtifact`                          | Partial       | **Yes**          | Existing read returns full markdown; this adds token-efficient partial read.      |
| `summarizeArtifactForThread` | none                                          | None          | Optional         | Useful, but can be done by model without a dedicated persistence tool.            |
| `createArtifactFromTemplate` | `createIdeaArtifact`, `createPrdArtifact`     | Partial       | **No (for now)** | Existing creation tools already handle MVP types; template system can wait.       |
| `proposeArtifactSectionEdit` | `updateThreadArtifact`                        | Partial       | **Yes**          | Keeps diffs smaller and safer; strong extension of current edit flow.             |
| `compareArtifacts`           | none                                          | None          | Optional         | Good for later planning/iteration, not core MVP loop.                             |
| `readinessCheckForPromotion` | `createProjectFromThread`                     | Partial       | **Yes**          | Existing tool executes promotion; this adds pre-flight decision support.          |
| `generateExecutionBacklog`   | none                                          | None          | **Yes**          | Natural next step after PRD; high user value.                                     |
| `extractOpenQuestions`       | none                                          | None          | **Yes**          | Helps de-risk scope before build.                                                 |
| `logDecision`                | none                                          | None          | Optional         | Valuable, but can initially be handled as normal artifact edits.                  |
| `threadMilestoneSnapshot`    | none                                          | None          | Optional         | Useful continuity feature; not critical for first expansion.                      |
| `budgetAwareMode`            | usage/budget checks in server path            | Partial       | No               | Budget control already exists at request gate; no urgent need for dedicated tool. |

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
8. `updateThreadArtifact`

---

## B) Add now (highest ROI, low complexity)

9. `searchArtifacts` _(new)_
10. `readArtifactSections` _(new)_
11. `proposeArtifactSectionEdit` _(new)_
12. `readinessCheckForPromotion` _(new)_

Why these four first:

- Improve retrieval precision and token efficiency
- Improve edit trust via smaller diffs
- Improve promotion quality without auto-writing

---

## C) Add next (strong product leverage)

13. `generateExecutionBacklog` _(new)_
14. `extractOpenQuestions` _(new)_

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

### E) Further tool ideas (backlog / workflow-adjacent)

These are **not** in the canonical 14-tool freeze below; use them when a clear user story appears. Several pair naturally with [durable-workflows-and-orchestration.md](durable-workflows-and-orchestration.md) (e.g. backlog generation may be a **workflow** first, then optionally exposed as a one-click chat tool).

| Tool                                  | Purpose                                                                                                                                                           |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listRecentArtifactVersions`          | List recent versions for the active artifact so the assistant can point users at recent saved changes.                                                            |
| `linkThreadArtifact` (reference-only) | Mark a project artifact as in-thread context **without** implying full import semantics—if product differentiates “reference” vs `importProjectArtifactToThread`. |
| `proposeAppendToArtifact`             | Safer than full replace: append a dated “Decisions from chat” block via direct update plus a new artifact version.                                                |
| `duplicateArtifactAsDraft`            | Fork an idea or PRD into a new artifact for exploration without touching the original until the user deletes or archives.                                         |

**Chat UI:** When adding or renaming tools, update human-readable titles and summaries in `src/lib/idea-chat-assistant-parts.ts` (`WORKSPACE_TOOL_TITLES`, `WORKSPACE_RUNNING_SUMMARIES`, `summarizeWorkspaceTool`) so the workspace chat tool rail stays clear.

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
8. `updateThreadArtifact` (existing)
9. `searchArtifacts` (new)
10. `readArtifactSections` (new)
11. `proposeArtifactSectionEdit` (new)
12. `readinessCheckForPromotion` (new)
13. `generateExecutionBacklog` (new)
14. `extractOpenQuestions` (new)

This set keeps the current product principles intact (chat-first, explicit context, user-controlled writes), while adding the highest-leverage missing capabilities.

---

## 5) In-chat orchestration patterns (AI SDK / ToolLoopAgent)

Inside a **single** chat request, the most useful patterns for this toolset are:

1. **Routing:** infer intent, then prefer the smallest set of tools (list → read one artifact → act).
2. **Sequential chain:** structured PRD inputs → `createPrdArtifact`; or read → `updateThreadArtifact`.
3. **Evaluator-optimizer (bounded):** at most one or two refinement passes within the agent step limit (`stepCountIs` in `+server.ts`) so the request still completes quickly.

Heavy multi-pass work (many model calls, long merges, batch imports) belongs in a **durable workflow** instead—see [durable-workflows-and-orchestration.md](durable-workflows-and-orchestration.md). Recommended first background workflow there: **artifact quality pipeline** with outputs as **drafts** or **new artifacts** only, until the user applies changes in the artifact reader.
