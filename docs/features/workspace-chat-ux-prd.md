# Workspace chat UX PRD

## Problem Statement

Workspace AI chat is the main place users iterate with the assistant, yet common workflows are harder than they should be. Users cannot retry a bad or empty assistant reply without retyping or adding noise. Copying their own text or the assistant’s answer requires awkward selection in the browser. Exploring an alternate conversation path from an earlier point means manually recreating context in a new thread. When something goes wrong—network errors, API failures, or failed persistence—the experience does not always make it obvious what broke or what single action will fix it.

Together this slows power users and frustrates newcomers when the model or network misbehaves.

## Solution

Ship a focused v1 of chat UX improvements:

1. **Retry (regenerate)** — From a chosen **user** message, **drop all messages after it** in the same thread, then request a **fresh assistant** response. One clear recovery path without duplicate history in the database for dropped turns (replaced by the new run once persisted).

2. **Copy** — Per-message actions to copy **user** text and **assistant** content to the clipboard, with predictable behavior for multi-part assistant turns (text vs tools).

3. **Fork thread** — From a message (typically a user or assistant turn boundary), create a **new thread** whose history is the **prefix** of messages through that point. **Do not** copy thread–artifact links or show “forked from” lineage in v1. **Project-scoped** source threads produce a **new thread in the same project**; general workspace threads fork to general threads.

4. **Empty and error states** — Unified, explicit UI for: no messages yet, loading/submitted, stream/API failure, and Convex persistence failure—with **primary** actions (retry send, retry sync, continue typing) and consistent copy so users always know what failed.

Open product choices called out in **Further Notes** should be confirmed before implementation locks behavior.

## User Stories

### Retry

1. As a workspace user, I want to **retry** after a user message so that I can get a new assistant answer without starting a new thread.
2. As a workspace user, I want retry to **remove later turns** from the current thread so that the transcript matches what the model actually sees on retry.
3. As a workspace user, I want retry to be **disabled while the assistant is streaming**, so that I do not corrupt an in-flight response.
4. As a workspace user, I want retry only from **user** messages (not assistant-only retry), so that the model always has a clear user turn to respond to.
5. As a workspace user, I want a **clear label** (e.g. Regenerate / Retry) on the action, so that I understand it will replace content after that point.
6. As a workspace user, I want retried conversations to **persist** like normal chat, so that refresh keeps the latest transcript.
7. As a workspace user, I want an **error** if retry cannot complete (e.g. network), so that I can try again without silent failure.

### Copy

8. As a workspace user, I want to **copy my message** in one action, so that I can reuse it elsewhere without careful selection.
9. As a workspace user, I want to **copy the assistant’s answer**, so that I can paste into docs, email, or another tool.
10. As a workspace user, I want copy to respect **line breaks** in my messages, so that pasted text matches what I typed.
11. As a workspace user, I want a **visible confirmation** when copy succeeds (toast or brief state), so that I trust the action completed.
12. As a workspace user, I want copy to be **keyboard-accessible** where practical (focus + action), so that I am not forced to use a mouse.
13. As a workspace user, I want assistant copy behavior to be **documented or predictable** when the turn includes tools or structured parts (see open decisions), so that I know what lands on the clipboard.

### Fork

14. As a workspace user, I want to **fork from a message**, so that I can explore a different direction from an earlier point in the conversation.
15. As a workspace user, I want the forked thread to include **only messages up to and including the fork point**, so that the new thread is a true prefix of the old one.
16. As a workspace user, I want the app to **navigate to the new thread** after fork, so that I can continue immediately.
17. As a workspace user, I want a fork from a **project** thread to stay **in that project**, so that project-scoped work does not leak into general chat or the wrong project.
18. As a workspace user, I want a fork from a **general** thread to remain **general**, so that I do not accidentally attach unrelated threads to a project.
19. As a workspace user, I understand that **artifact links** from the sidebar are **not** copied in v1, so that my expectations match behavior (I can still @-mention artifacts manually if needed).

### Empty and error states

20. As a workspace user, I want a **friendly empty state** when a thread has no messages yet, so that I know I can start typing.
21. As a workspace user, I want to see **distinct messaging** when the **assistant stream fails** versus when **saving to the server fails**, so that I take the right recovery step.
22. As a workspace user, I want a **Retry** (or equivalent) action when the stream fails after I sent a message, so that I can continue without retyping.
23. As a workspace user, I want **Retry sync** (or equivalent) when persistence fails, so that my local view can be reconciled with the server.
24. As a workspace user, I want errors to be **dismissible** when appropriate, so that they do not permanently block the composer.
25. As a workspace user, I want **loading** states during submission/streaming, so that I know the system is working.
26. As a workspace user, I want **reduced-motion** preferences respected for loading indicators where the product already does so elsewhere.

### Cross-cutting

27. As a workspace user, I want message actions to appear in a **consistent place** (e.g. hover or toolbar), so that I learn the pattern once.
28. As a workspace user, I want actions that cannot run to be **disabled with a reason** (tooltip or aria), so that I am not confused by no-ops.
29. As a workspace user, I want fork/retry to respect **authentication** (signed out → sign in path), so that I do not hit opaque errors.
30. As a workspace user, I want **long threads** to remain usable after adding toolbars, so that layout does not break on small viewports.
31. As a workspace owner, I want fork/retry to enforce **ownership** server-side, so that IDs cannot be abused across accounts.

### Quality and follow-ups (later phases; still valid stories for backlog)

32. As a workspace user, I want to **stop** generation mid-stream, so that I can correct course without waiting for completion.
33. As a workspace user, I want to **edit** a past user message before retry, so that I can fix typos without fork-and-retype.
34. As a workspace user, I want **markdown vs plain** copy options, so that I can match the destination format.
35. As a workspace user, I want **keyboard shortcuts** for copy, so that power users can move faster.
36. As a workspace user, I want **export entire thread**, so that I can archive outside Launchpad.

## Implementation Decisions

- Use the existing **AI SDK Svelte `Chat`** client and **Convex `saveMessages`** contract; after truncate, the client sends the **shortened message list** so stored `sequence` values stay aligned with the canonical transcript (alternatively document a dedicated server mutation that replaces the tail—pick one approach and test it).
- **Retry** is implemented as **truncate after selected user message** + **regenerate** the assistant for that user turn in the **same** `chatThreads` document.
- **Fork** creates a **new** `chatThreads` row and **new** `chatMessages` rows for the prefix only; **no** `threadArtifactLinks` duplication; **no** fork lineage fields in v1.
- **Project inheritance**: new thread copies **`scopeType` and `projectId`** from the source thread when the source is project-scoped; otherwise general scope without `projectId`.
- **Message action bar** is a small composable: given message role, index, `UIMessage`, and global busy/error flags, it renders copy, retry (user only), fork (boundary rules in implementation plan).
- **Chat status surfaces** map transport persistence errors, `Chat` lifecycle status, and Convex load state into a **small enum-like set** of UI modes with shared layout components.
- Reuse existing **message primitives** from the design system (`Message`, `MessageActions`, toolbars) rather than one-off buttons scattered in the thread layout.
- **Assistant copy** v1 default: copy **human-readable text** from assistant text parts; tool steps may be summarized or omitted until “copy scope” product decision is closed (see Further Notes).

## Testing Decisions

- **v1 acceptance:** **Manual QA only** (no automated test requirement for this feature unless added opportunistically).
- Use a **manual QA matrix** covering: retry on first vs middle user message; retry with tools in last assistant turn; fork at first message and at last message; fork project vs general; stream error then retry; save error then retry sync; copy user and assistant with multiline text; mobile narrow width; refresh after each flow to confirm Convex matches the UI (especially after truncate).
- **Optional follow-up:** unit tests for pure helpers (truncate, copy payload builders) or Convex tests for fork ownership—nice to have, not blocking ship for this iteration.

## Out of Scope

- **Multiple assistant branches** per user turn without truncating history.
- **Fork lineage** UI or stored `parentThreadId` / `forkedFromMessageId` in v1.
- **Copying thread–artifact links** or draft-change context into forked threads.
- **Stop/cancel** streaming, **edit user message**, **export thread**, and **markdown/plain toggle** (tracked as follow-up stories above unless explicitly pulled into v1).

## Further Notes

### Agreed in planning (conversation)

- Retry semantics: **truncate tail**, same thread, fresh assistant response.
- Fork payload: **messages only**; project threads **inherit `projectId`**.
- Validation: **manual testing** for v1 (see Testing Decisions).

### Open product confirmations

1. **Retry entry point:** Allow retry from **any** user message (consistent with truncate design), or restrict to **last** user message only for simpler mental model.
2. **Assistant copy scope:** **Final assistant text only** vs **include tool / structured part representations** in clipboard text.
3. **Forked thread title:** Match **new-thread placeholder** until title generation runs vs **prefill title** from source thread or first line.
4. **Empty vs stuck:** When there is **only a user message** and the assistant never completed (error vs still loading), whether to show **loading**, **error + retry**, or both with strict state rules.

### GitHub issue

The same sections can be pasted into a GitHub issue for tracking; this file is the **source of truth** in the repo.
