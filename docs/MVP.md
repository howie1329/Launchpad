# Launchpad — MVP PRD

## Problem

Developers with a new idea waste time figuring out what to actually build first. There's no fast, structured way to go from "I have an idea" to a clear, prioritized feature list and scope — so they either over-build or never start.

## Target User

Solo developers and indie hackers who want to validate and scope an idea quickly before writing a single line of code.

---

## Core Features — Must Have

### Idea intake form

`Frontend` `Reactive`

A single-page form: idea description (textarea), preferred stack (text input), and app type (dropdown: web app, SaaS, mobile, CLI, API). Live character count on the idea field. Submit triggers the server action.

### AI PRD generation

`Server-side` `API call`

SvelteKit form action posts to a `+page.server.js`, calls Anthropic, and returns a structured PRD: problem statement, target user, must-have features, out-of-scope, suggested stack, and a 1-week build plan. Response streams back to the client.

### Formatted PRD output

`Frontend` `Reactive`

Results render in clearly labeled sections as the stream comes in. Each section appears progressively. Copy-to-markdown button at the bottom.

---

## Stretch Features — Nice to Have

### PRD history

`Database`

Save generated PRDs to SQLite via Turso. A simple `/history` route lists past PRDs by idea name and date, each linkable.

### Out of scope

Not building for MVP: auth, user accounts, sharing/collaboration, editing the PRD inline, multiple AI models, billing, export to PDF.

---

## SvelteKit Concepts Covered

| Concept            | What you learn                                  |
| ------------------ | ----------------------------------------------- |
| `+page.server.js`  | Form actions + server-side Anthropic API call   |
| Streaming          | Stream AI response back to the UI progressively |
| Svelte stores      | Reactive loading + result state                 |
| File-based routing | `/` for form, `/history` for saved PRDs         |

---

## Suggested Stack

- SvelteKit + TypeScript
- Tailwind CSS
- Anthropic SDK
- Turso / SQLite _(stretch)_
- Vercel _(deployment)_

---

## Timeline

| Day   | Goal                                                            |
| ----- | --------------------------------------------------------------- |
| Day 1 | Form + server action + AI call + streamed output                |
| Day 2 | Polish UI, copy button, deploy to Vercel. Stretch: history page |
