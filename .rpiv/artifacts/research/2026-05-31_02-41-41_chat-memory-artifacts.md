---
date: 2026-05-31T02:41:41-0400
author: howie1329
commit: b5de564
branch: main
repository: Launchpad
topic: "AI chat, Supermemory, and artifacts"
tags: [research, codebase, chat, supermemory, artifacts]
status: complete
last_updated: 2026-05-31T02:41:41-0400
last_updated_by: howie1329
---

# Research: AI chat, Supermemory, and artifacts

## Research Question
How does LaunchPad AI chat work, how is Supermemory/memory used, how do artifacts affect AI chat, can the AI manually attach artifacts to conversations, and can the AI autonomously inspect project artifacts during a conversation?

## Summary
LaunchPad workspace chat is a Svelte `Chat<UIMessage>` client that posts to `/api/workspace/chat`; the route validates thread/model/messages, builds server-side instructions from workspace/project context, explicit artifact mentions, Supermemory profile/retrieval, and user AI preferences, then streams through an AI SDK `ToolLoopAgent`. Supermemory is read before model invocation and injected as instruction text; it is also exposed through guarded `addMemory`/`forgetMemory` tools. Chat turns are not automatically stored in Supermemory. Artifacts affect chat in three ways: explicit `@artifact:<id>` mention expansion into prompt context, Supermemory retrieval of synced artifact documents, and model tools for listing/reading/searching/importing/creating/updating artifacts. The AI can create thread-linked artifacts and import current-project artifacts into the active thread. The AI can inspect project artifacts in project chats through constrained list/search/import/read flows, but it cannot directly read arbitrary full artifact content unless linked to the thread or imported from the current project.

## Detailed Findings

### Chat Runtime
- Frontend loads persisted thread messages and thread artifacts in `src/lib/components/workspaces/WorkspaceThread.svelte:148-161`.
- The local AI SDK chat client is created with `new Chat<UIMessage>({ id: threadId, messages, transport })` in `src/lib/components/workspaces/WorkspaceThread.svelte:543-567`.
- The transport posts to `/api/workspace/chat` with `threadId`, `modelId`, `messages`, and `webSearchRequested` in `src/lib/components/workspaces/WorkspaceThread.svelte:548-557`.
- Final message persistence happens client-side after stream finish via `persistMessages()` in `src/lib/components/workspaces/WorkspaceThread.svelte:561-583`.
- Server chat entrypoint is `src/routes/api/workspace/chat/+server.ts:103-260`; it validates input, loads thread/project, builds instructions/tools, creates `ToolLoopAgent`, and streams the response.
- Convex chat storage uses `chatThreads` and `chatMessages` in `src/convex/schema.ts:71-97`; save/list behavior lives in `src/convex/chat.ts:91-180`.

### Supermemory / Memory
- Supermemory client is configured from `SUPERMEMORY_API_KEY` in `src/lib/server/memory/client.ts:5-9`; missing key disables memory operations gracefully.
- The chat route builds a Supermemory profile block before model invocation in `src/routes/api/workspace/chat/+server.ts:172-176`, calling `src/lib/server/memory/profile.ts:15-42`.
- The chat route retrieves relevant memories with latest user text in `src/routes/api/workspace/chat/+server.ts:178-183`, calling `src/lib/server/memory/retrieval.ts:79-104`.
- Retrieval searches project memory first when project-scoped, plus user memory, using source filters for LaunchPad-owned `artifact` and `user_note` documents in `src/lib/server/memory/retrieval.ts:8-39`.
- Retrieved memory instructions are capped and formatted in `src/lib/server/memory/composer.ts:3-40` as advisory context.
- `addMemory` and `forgetMemory` are AI tools in `src/routes/api/workspace/chat/+server.ts:648-704`; `addMemory` requires the remembered text to appear verbatim in the latest user message.
- Artifact memory sync writes artifact content/metadata to Supermemory through `src/lib/server/launchpad-memory.ts:6-44` and `src/lib/server/memory/ingestion.ts:31-145`.
- There is no automatic storage of every chat turn into Supermemory in the chat route; writes occur through explicit memory tools or artifact sync flows.

### Artifacts in Chat Context
- Artifact persistence is in `artifacts`, `threadArtifactLinks`, `artifactVersions`, and `memorySyncs` in `src/convex/schema.ts:98-153`.
- `createArtifact` inserts an artifact, version, optional thread link, and activity log in `src/convex/artifacts.ts:21-97`.
- Thread association is many-to-many through `threadArtifactLinks`; `linkArtifactToThread` handles imported/referenced links in `src/convex/artifacts.ts:425-443`.
- The UI represents selected artifacts as mention chips, then appends `@artifact:<id>` tokens to outgoing user text in `src/lib/components/workspaces/WorkspaceThread.svelte:407-430` and `src/lib/artifact-mention-tokens.ts:30-42`.
- The chat request body does not send separate attachment objects; artifact IDs are embedded in message text.
- Server prompt expansion parses `@artifact:` tokens and injects referenced artifact markdown into instructions in `src/routes/api/workspace/chat/+server.ts:162-170` and `src/routes/api/workspace/chat/+server.ts:775-806`.
- Referenced artifact markdown is capped at `MAX_REFERENCED_ARTIFACT_CHARS = 14_000` in `src/routes/api/workspace/chat/+server.ts:31` and `src/routes/api/workspace/chat/+server.ts:785-789`.
- Merely linking an artifact to a thread does not automatically include full content in every prompt; it makes the artifact visible to UI and model tools.

### AI Artifact Tools
- The model receives tools from `workspaceTools()` via `ToolLoopAgent` in `src/routes/api/workspace/chat/+server.ts:199-228`.
- Read/list/search/import tools include `listThreadArtifacts`, `readThreadArtifact`, `listProjectArtifacts`, `searchArtifacts`, and `importProjectArtifactToThread` in `src/routes/api/workspace/chat/+server.ts:379-494`.
- Creation/update tools include `createIdeaArtifact`, `createPrdArtifact`, and `updateThreadArtifact` in `src/routes/api/workspace/chat/+server.ts:502-616`.
- Created artifacts pass `sourceThreadId: threadId`, so Convex automatically links them to the active thread in `src/convex/artifacts.ts:72-79`.
- `importProjectArtifactToThread` links current-project artifacts to the active thread, but only in project chats, in `src/routes/api/workspace/chat/+server.ts:474-494`.
- `updateThreadArtifact` can only update artifacts already linked to the active thread; Convex enforces this in `src/convex/artifacts.ts:349-358` and `src/convex/artifacts.ts:639-654`.

## Code References
- `src/lib/components/workspaces/WorkspaceThread.svelte:148-161` — loads thread messages and thread artifacts.
- `src/lib/components/workspaces/WorkspaceThread.svelte:407-430` — sends chat messages and imports mentioned artifacts.
- `src/lib/components/workspaces/WorkspaceThread.svelte:543-583` — AI SDK chat setup, transport, and final persistence.
- `src/routes/api/workspace/chat/+server.ts:103-260` — main workspace chat route and model streaming path.
- `src/routes/api/workspace/chat/+server.ts:162-195` — explicit artifact, Supermemory profile, and memory retrieval instruction assembly.
- `src/routes/api/workspace/chat/+server.ts:350-704` — workspace tool definitions exposed to the model.
- `src/routes/api/workspace/chat/+server.ts:775-806` — explicit artifact mention expansion into prompt context.
- `src/convex/chat.ts:91-180` — list and save persisted UI messages.
- `src/convex/artifacts.ts:21-97` — artifact creation and source-thread linking.
- `src/convex/artifacts.ts:425-443` — linking/importing artifacts to threads.
- `src/lib/server/memory/retrieval.ts:79-104` — Supermemory relevant memory search.
- `src/lib/server/memory/ingestion.ts:31-145` — artifact/user-note ingestion into Supermemory.

## Integration Points

### Inbound References
- `src/lib/components/workspaces/WorkspaceThread.svelte:543-567` — frontend sends messages into the chat API.
- `src/routes/workspace/+layout.svelte:511-529` — UI action imports artifacts into the active thread.
- `src/routes/workspace/+layout.svelte:430-461` — manual artifact creation queues memory sync.

### Outbound Dependencies
- `src/routes/api/workspace/chat/+server.ts:121-123` — chat API uses authenticated `ConvexHttpClient`.
- `src/routes/api/workspace/chat/+server.ts:215-228` — chat API resolves provider model and creates `ToolLoopAgent`.
- `src/lib/server/resolve-workspace-language-model.ts:102-126` — provider routing for AI Gateway/OpenRouter/NIM/Groq.
- `src/lib/server/memory/client.ts:5-9` — Supermemory SDK client setup.

### Infrastructure Wiring
- `src/convex/schema.ts:71-153` — persisted chat, artifact, link, version, and memory sync tables.
- `src/routes/api/workspace/memory/artifact/+server.ts:8-25` — artifact memory sync endpoint.
- `src/routes/api/workspace/artifacts/[artifactId]/+server.ts:31-33` — artifact deletion removes Supermemory document.

## Architecture Insights
- Chat context is assembled server-side, while durable assistant-message persistence is client-triggered after streaming completes.
- Tool calls can mutate Convex during streaming before the assistant message is finally persisted.
- Project boundaries are enforced through `projectId`, `sourceThreadId`, ownership checks, and thread-artifact links.
- Supermemory stores artifacts and explicit user notes, not raw chat transcript history.
- Artifact access is intentionally constrained: full content is available through explicit mentions, linked-thread reads, or import-from-current-project flows.

## Direct Answers

### Can the AI manually attach artifacts to conversations?
Yes, in constrained ways. It can create new artifacts (`createIdeaArtifact`, `createPrdArtifact`) that are automatically linked to the active thread because they pass `sourceThreadId`. It can also import current-project artifacts into the active thread through `importProjectArtifactToThread`. It cannot call a generic `attachArtifact` or arbitrary filesystem-style write tool.

### Can the AI autonomously inspect project artifacts during a conversation?
Yes, partially. In project chats, it can call `listProjectArtifacts`, `searchArtifacts`, and `importProjectArtifactToThread`; after import, it can call `readThreadArtifact` for full markdown. It can also list/read artifacts already linked to the thread. It cannot directly read arbitrary full artifact content from any project/workspace without being in scope and linked/imported.

### Do attached artifacts affect AI chat?
Yes. Explicit artifact mentions are expanded into prompt context as primary context. Thread-linked artifacts are available through tools but are not automatically fully included every turn. Synced artifact content can also reappear through Supermemory retrieval as advisory context.

### How is Supermemory used?
Supermemory is queried before model invocation for profile and relevant memory snippets; these are injected into the instruction string. The model also has guarded `addMemory` and `forgetMemory` tools. Artifact creation/sync writes artifacts into Supermemory. Chat transcripts are not automatically persisted as memory.

## Precedents & Lessons
Git precedent sweep was not run for this read-only research pass.

## Historical Context (from `.rpiv/artifacts/`)
No prior artifacts were required to answer this research question.

## Developer Context
No developer checkpoint questions were needed; the requested questions were directly answerable from current code.

## Related Research
None.

## Open Questions
- Should project artifact inspection remain tool-driven, or should project overview artifacts be automatically preloaded for project chats?
- Should users get visibility/control over which artifacts have been synced into Supermemory?
- Should `updateThreadArtifact` also resync memory after updates? Current research confirmed creation sync paths but did not find an update-tool memory resync in the chat path.
