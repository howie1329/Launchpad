# Launchpad Plan: Dashboard, PRDs, and Ideas

Date: 2026-04-17

This document describes the next product shape for Launchpad based on what exists today in the codebase:

- `Ideas` is already a chat-first workspace with a structured “outline” side panel that gets updated via tool calls.
- `Scope` is currently a single-shot PRD generator with saved version history.

The goal is to:

1. Make the dashboard home useful (resume work quickly).
2. Turn “Scope” into **PRDs**: a **human-editable** PRD document as the canonical source of truth.
3. Keep **Ideas** as intake + drafting, with a clean handoff into PRDs.

## 1) Dashboard

### Current state

- Dashboard shell exists with sidebar navigation:
  - MVP Creator (`/dashboard/scope`)
  - Ideas (`/dashboard/ideas`)
  - Settings
- Dashboard home (`/dashboard`) is empty-ish (“Select MVP Creator or Ideas…”).

### Change

Dashboard home should answer: “Where do I pick up?”

Minimum useful home:

- **Continue**
  - Most recently updated Idea chat (open it)
  - Most recently updated PRD (open it)
- **Start**
  - New idea chat
  - New PRD
- **Recent**
  - Combined short list of recent Ideas + PRDs (last ~10), showing title and updated time.

Notes:

- Uses existing data: `ideas.updatedAt` and `prds.updatedAt`.
- Keeps the existing dashboard sidebar; this is about making the default route valuable.

## 2) PRDs (the feature formerly called “Scope” / “MVP Creator”)

### Product stance

- A PRD is a **human-editable document**.
- AI is **assistive**, not the primary UI.
- Versions are **immutable history** (snapshots), not the canonical document.

### Canonical model

We want:

- **Latest PRD = editable draft**
- **Prior versions = immutable snapshots**

In practice:

- `prds` holds the “draft” (latest editable content and metadata).
- `prdGenerations` holds versioned immutable snapshots (`v1`, `v2`, ...).

### PRD editor UX

Primary PRD view is an editor:

- Editable sections (at least the existing structured sections):
  - Problem statement
  - Target user
  - Must-have features
  - Out of scope
  - Suggested stack
  - One-week build plan
- Draft save state:
  - Save draft (fast, frequent, non-versioned)
  - Save as version (creates immutable `vN` snapshot)
- Contextual AI help (per section), examples:
  - Rewrite section
  - Suggest must-haves
  - Generate acceptance criteria
  - Point out gaps / contradictions

### Migration of current “Scope” behavior

Current “Generate PRD” becomes: “Generate initial draft”.

Flow:

1. User enters idea brief (and small metadata like app type, stack).
2. AI generates an initial structured PRD output.
3. That output becomes the initial draft content.
4. User edits the PRD.
5. User optionally “Save as v1” to freeze a snapshot.

### Naming / navigation

- Rename sidebar label from “MVP Creator” to **PRDs** (or “PRD Builder” if you want a slightly more guided vibe).
- Treat “Generate” as a starting affordance, not the point of the feature.

## 3) Ideas

### Product stance

Ideas is the intake and exploration lane:

- Chat is primary.
- Structured outline is a side panel artifact that stays short, scannable, and updated during chat.
- Ideas can produce a PRD draft and hand off into PRDs, but the PRD becomes the long-lived thing you edit.

### Tools that make sense (keep minimal)

Keep tools limited to actions that:

1. Update durable saved state (outline/status).
2. Produce artifacts that show in the UI (PRD draft).
3. Create/link records (create PRD from idea).

Practical set:

- Keep: `updateIdeaStructured` (already exists; updates one-liner/problem/audience/status/source/score).
- Add: create PRD draft from idea chat (structured PRD object).
- Add: create PRD record from idea (handoff).

Avoid “heavy” tools early (e.g. semantic search / embeddings) until there is a real need.

### Ideas -> PRD handoff

Add a clear handoff action from Ideas:

- “Create PRD from this idea”
  - Creates a PRD draft in PRDs (using the best current synthesis from chat)
  - Navigates to the PRD editor

Ideas retains:

- The conversation history
- The outline snapshot
- A lightweight status pipeline (inbox/exploring/prdReady/archived)

PRDs owns:

- The canonical editable doc
- Version history

## 4) Incremental implementation path

1. Dashboard home: Continue / Start / Recent.
2. PRDs: introduce editable draft as canonical, keep existing saved versions.
3. Ideas: add “Create PRD from this” handoff.
4. Optional: polish naming, sidebar grouping, and cross-links (Idea -> PRD, PRD -> originating Idea).

