# Launchpad Product Summary

## What It Is

Launchpad is a chat-first workspace for solo builders and indie hackers. It helps people move from rough idea to scoped work by keeping conversations, decisions, project context, and AI assistance in one place.

The product is designed for builders who want more structure than a blank chat window, but less ceremony than enterprise planning tools.

## The Core Loop

1. Start a thread for a rough idea, question, or product direction.
2. Use the AI assistant to explore, clarify, and shape the work.
3. Save durable markdown artifacts such as ideas, PRDs, research notes, or project briefs.
4. Promote serious work into a project so related chats and artifacts stay together.
5. Keep iterating with artifact history, project memory, imported context, and daily AI budget controls.

## Why It Matters

- **Planning stays close to thinking.** Product decisions live beside the chats that created them.
- **Memory becomes durable.** Artifacts turn ephemeral conversation into reusable workspace context.
- **Scope stays visible.** Projects and PRDs help builders decide what is worth building before code starts.
- **AI can act on the workspace.** The assistant can use tools for artifacts, project context, web search, memory, and promotion workflows.
- **Costs stay bounded.** Daily spend caps and usage accounting keep AI work controlled.

## Current Product Surface

| Feature | Status |
| --- | --- |
| Signed-in workspace | Main app surface at `/workspace` |
| General and project threads | Persisted chats with model selection |
| Projects | Containers for related chats and artifacts |
| Artifacts | Markdown documents with editing, preview, versions, diffs, and restore |
| External context imports | Review flow for converting pasted AI context into project material |
| AI tools | Artifact/project operations, promotion support, optional Tavily search, optional Supermemory recall |
| Multi-provider AI | Gateway, OpenRouter, Groq, and NVIDIA NIM catalog entries |
| Usage controls | Daily AI cap, usage ledger, activity history |
| Notifications and tabs | Workspace navigation and progress feedback |

## Target Users

- Solo developers shaping ideas into buildable MVPs
- Indie hackers comparing product directions
- Technical founders who want PRD-quality clarity without adopting heavy process
- Builders who use AI heavily and need project memory, artifacts, and cost controls

## Positioning

Launchpad is not a general document editor, project management suite, or one-off prompt wrapper. It is a lightweight workspace where AI-assisted product thinking becomes durable, organized, and ready to build.
