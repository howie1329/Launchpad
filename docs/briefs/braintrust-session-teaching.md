# Braintrust codebase changes — teaching checklist

Incremental understanding of **what we built**, not eval error debugging.

Say when you're ready to be quizzed on a stage.

## Stage 1 — Map of the change (what exists now)

- [ ] Why Braintrust was added (tracing + evals) and what was **not** changed (client, other AI routes, Convex billing)
- [ ] The three layers: optional tracing → parent metadata → offline evals
- [ ] Main files added vs modified (table mental model)
- [ ] Env vars and what each gate does

## Stage 2 — Tracing path (Phases 1–2)

- [ ] `src/lib/server/braintrust.ts` — gating, `getWorkspaceChatAi`, `traceWorkspaceChatRun`
- [ ] How `chat/+server.ts` uses them (only agent + stream wrapped)
- [ ] What gets logged vs what stays in Convex (`recordAiRunMutation` unchanged)
- [ ] When tracing is on vs off (behavior)

## Stage 3 — Prompt + eval path (Phase 5)

- [ ] `workspace-chat-instructions.ts` — why extracted from `+server.ts`
- [ ] `evals/workspace-chat/` — dataset, stub tools, task, scorers, `workspace-chat.eval.ts`
- [ ] How eval task differs from production chat (stubs, no Convex/Tavily/Composio live)
- [ ] `npm run eval:chat` and experiment naming

## Stage 4 — Shared constants & impact

- [ ] `composio-toolkits.ts` — why not import `composio.ts` from evals/instructions
- [ ] How to compare prompts (`workspaceChatBaseInstructions` + re-run eval)
- [ ] What production users see (nothing unless tracing env on server)
- [ ] Docs touched (`AGENTS.md`, `architecture.md`, brief)

---

## Session log

| Stage | Status | Notes |
| ----- | ------ | ----- |
| 1     | In progress | |
| 2     | Pending | |
| 3     | Pending | |
| 4     | Pending | |
