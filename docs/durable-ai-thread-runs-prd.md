# PRD: Durable AI Thread Runs

## Summary

Launchpad should let users start an AI response in one workspace thread, navigate to another thread or project, and return later to find the original thread either still running, completed, or failed with a clear retry path. The AI response lifecycle should be owned by durable backend state rather than by the currently mounted browser component.

## Problem

Today, workspace chat responses are streamed through a SvelteKit API route and finalized by the active `WorkspaceThread.svelte` client component. The final assistant message is persisted to Convex from the client `onFinish` callback. If a user navigates away while a response is streaming, the component may unmount, the stream may abort, and the assistant response may never be saved.

This undermines a core workspace behavior: users should be able to work across multiple threads and projects without babysitting every running AI response.

## Goals

- Users can start an AI response in a thread and safely navigate elsewhere.
- Users can return to a thread and see its latest durable state: queued, running, completed, or failed.
- Completed assistant responses are persisted even if the originating browser route is no longer mounted.
- Project-scoped threads continue to receive the correct project context.
- The UI can display clear run status and recovery actions.
- The architecture supports future partial streaming, retries, and observability.

## Non-Goals

- Rebuilding the entire chat UI.
- Adding multi-agent orchestration in the first version.
- Supporting arbitrarily long-running workflows beyond normal AI response generation.
- Introducing Trigger.dev or another external job system unless Convex-native execution proves insufficient.
- Guaranteeing offline browser support beyond durable server-side completion once a request is accepted.

## User Stories

### Start and switch

As a user, I can send a message in Thread A, switch to Thread B or another project, and continue working without interrupting Thread A.

### Return to completed work

As a user, I can return to Thread A and see the completed assistant response if the run finished while I was away.

### Understand active work

As a user, I can return to Thread A while the response is still running and see an explicit running state rather than an empty or confusing thread.

### Recover from failure

As a user, if the AI response fails, I can see that it failed and retry from the failed user message.

## Proposed Solution

Move the AI response lifecycle into Convex-backed durable state.

Instead of relying on the browser component to own completion, the client should submit user intent to Convex. Convex should save the user message, create a durable run record, and schedule backend execution. The backend execution should call the language model, persist the assistant message, and update run status.

The UI should become a subscriber to Convex messages and run state, not the owner of the run lifecycle.

## Conceptual Architecture

1. User submits a message.
2. Convex mutation validates access and persists the user message.
3. Convex creates a `chatRuns` record with status `queued`.
4. Convex schedules an action or workflow to execute the AI run.
5. The action loads thread, project, artifacts, user settings, memory, and budget context.
6. The action calls the selected language model.
7. The action persists the assistant message to `chatMessages`.
8. The action updates `chatRuns.status` to `completed` or `failed`.
9. The UI reacts to Convex updates regardless of which workspace route is active.

## Data Model Requirements

Add a durable run model, conceptually:

```ts
chatRuns: {
  ownerId: Id<'users'>;
  threadId: Id<'chatThreads'>;
  triggeringMessageId: string;
  assistantMessageId?: string;
  modelId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  startedAt?: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}
```

Useful indexes:

- `by_threadId_and_createdAt`
- `by_ownerId_and_createdAt`
- `by_status_and_createdAt`, if operational views or cleanup jobs need it

## Functional Requirements

### Run creation

- Creating a run must be atomic with saving the user message.
- A thread should not accidentally start duplicate runs for the same submitted message.
- Project ownership and thread ownership must be validated before creating a run.

### Run execution

- Backend execution must load the latest durable thread context from Convex.
- Project threads must include project context.
- Artifact references and thread-linked artifacts must continue to work.
- AI usage tracking must still be recorded.
- The assistant message must be persisted by the backend before the run is marked completed.

### UI behavior

- Thread pages should subscribe to messages and active/recent run state.
- If a run is queued or running, show an explicit status indicator.
- If a run failed, show a failure message and retry action.
- Navigating away from a thread must not cancel the run by default.
- Workspace navigation and tabs should continue to work as navigation state only.

### Retry behavior

- Failed runs should be retryable from the same user message.
- Retry should create a new run or clearly update the failed run according to the final implementation design.
- Duplicate assistant messages should be avoided.

## Streaming Requirements

First version may persist only the final assistant response.

A future version should support partial streaming persistence:

- Create an assistant placeholder message when a run starts.
- Patch partial content into Convex as chunks arrive.
- Let any open client subscribe to partial content.
- Mark the message final when the run completes.

## Technical Direction

Prefer a Convex-native implementation first:

- Convex mutations for durable writes.
- Convex actions for external AI provider calls.
- Convex scheduler or Convex workflow/component for durable execution.

Trigger.dev or another job runner should only be considered if Convex-native execution cannot satisfy reliability, timeout, retry, observability, or operational requirements.

## Open Questions

- Should v1 preserve live token-by-token streaming, or is final-response persistence acceptable initially?
- What are the expected maximum run durations for supported models/tools?
- Should users be able to cancel a running response?
- Should only one active run be allowed per thread?
- How should tool calls that create/update artifacts be persisted during a backend-owned run?
- Should run failures create a visible assistant-system message in the thread, or only a UI status row?

## Success Metrics

- A user can start a response, navigate to another workspace route, return after completion, and see the assistant response.
- Refreshing the browser during a run does not lose the run record.
- Failed runs are visible and retryable.
- No duplicate assistant messages are created for a single run.
- Project-scoped responses continue to include project context.

## Acceptance Criteria

- Chat response completion no longer depends on `WorkspaceThread.svelte` staying mounted.
- A durable run record exists for every backend-owned AI response.
- Messages and run status are queryable by thread.
- Completed runs persist assistant messages from the backend.
- Navigating between workspace tabs, projects, and threads does not cancel accepted runs.
- Existing saved thread history remains readable after migration.

## Risks

- Moving provider calls into Convex actions may require refactoring SvelteKit-only dependencies.
- Streaming UX may regress if v1 persists only final responses.
- Tool execution side effects need careful idempotency to avoid duplicate artifacts or usage records.
- Long model/tool runs may hit platform limits if not designed around Convex execution constraints.

## Suggested Milestones

### Milestone 1: Durable run model

- Add `chatRuns` schema.
- Add mutations/queries for run creation and thread run status.
- Keep existing chat path intact while introducing the model.

### Milestone 2: Backend-owned final responses

- Move AI generation into a Convex action or workflow.
- Persist final assistant messages from the backend.
- Update UI to show queued/running/completed/failed states.

### Milestone 3: Remove client-owned completion dependency

- Replace client `onFinish` persistence for backend-owned runs.
- Ensure thread switching and refresh scenarios work.
- Add retry behavior for failed runs.

### Milestone 4: Streaming and polish

- Add partial assistant message persistence if needed.
- Improve running indicators across tab strip/project pages.
- Add cancellation if product needs it.
