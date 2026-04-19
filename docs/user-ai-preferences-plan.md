# Plan: User-injected AI preferences (Settings)

## Summary

Adding one or more text areas under **Settings** so users can inject **custom instructions** into workspace chat is a **reasonable product idea** for Launchpad-style assistants: it lets people encode stable context (role, product, constraints) and stylistic preferences (tone, format) without repeating them every thread.

Whether **two** fields (“memory” + “AI instructions”) is the right split depends on clarity for users and on how you **compose** them in the system prompt. This doc frames the tradeoffs and what to watch for in *this* codebase.

---

## Is it a good idea?

**Pros**

- **Less repetition**: Long-lived facts and preferences do not need to be re-typed in every chat.
- **Better fit**: Users can steer tone, depth, and formatting (bullets vs prose, level of technical detail).
- **Aligns with how the assistant works today**: Workspace chat already builds a single `instructions` string for the `ToolLoopAgent` (see `src/routes/api/workspace/chat/+server.ts`). User content would slot into that pipeline as an extra layer, not a new architecture.

**Cons / risks**

- **Naming collision with “memory”**: In Launchpad, durable memory is largely **artifacts** and **project/thread context**. A field labeled only “memory” may confuse users (“Is this the same as artifacts?”). Prefer labels like **“About you & your work”**, **“Context to always include”**, or **“Stable notes for the assistant”**, and explain the difference in one line of helper text.
- **Prompt injection & misuse**: Anything the user types is still **user-controlled text** merged into instructions. You should assume adversarial or accidental content (“ignore previous instructions”). Mitigations: keep **app-owned base instructions first**, clearly delimit user sections, enforce **length limits**, and avoid treating user text as trusted policy.
- **Token and cost pressure**: Long preferences are sent on **every** chat turn that uses them (as part of system/agent instructions). Cap length and surface approximate impact if you show usage/budget already.
- **Support burden**: Users may paste secrets, internal-only data, or PII. Short **disclaimer** copy helps (“Don’t paste passwords or regulated data”).
- **Team / org scenarios**: If you later add shared projects or seats, “my preferences” vs “project defaults” becomes important. Planning for **scope** (user vs project) early avoids a second migration.

**Verdict**: Yes for a **v1**—with clear labeling, limits, composition rules, and honest UX about what it does and does not replace (artifacts remain the structured, linkable memory).

---

## One field vs two (“memory” + “AI instructions”)

| Approach | When it fits |
|----------|----------------|
| **Single textarea** | Simplest mental model; users use headings themselves. Easiest to ship. |
| **Two fields** | Helps separate **factual context** (“I’m a PM at X, our users are Y”) from **behavior** (“Prefer short answers; ask before suggesting artifacts”). Reduces one blob getting unreadable. |
| **More than two** | Usually unnecessary until you have strong analytics showing confusion; consider **presets** or **snippets** later instead. |

**Recommendation**: Two fields is **fine** if the UI explains the split in one sentence each. If you cannot articulate a crisp difference, ship **one** field first and split later based on feedback.

**Suggested semantics (if you use two)**

1. **Context / background** — stable facts about the user, product, or constraints the model should assume.
2. **How to respond** — tone, length, language, when to ask clarifying questions, artifact suggestion cadence, etc.

Internally you can still concatenate them with clear headings when building `instructions`.

---

## What you might be missing

### 1. **Composition order (non-negotiable for safety and quality)**

Define a fixed order, for example:

1. **Base product instructions** (your existing `baseInstructions` and project context).
2. **Optional referenced artifact block** (already appended in some cases).
3. **User “context”** field.
4. **User “behavior”** field.

Never let user text **replace** base safety/product rules; only **append** (or prepend a short, fixed “user preferences below” delimiter).

### 2. **Limits and validation**

- **Max length per field** (characters or estimated tokens).
- **Normalize** whitespace; reject or strip null bytes if any.
- **Empty = omit** from the prompt entirely to save tokens.

### 3. **Scope**

- **Global (user settings)** — matches current Settings pattern (`userSettings` in Convex, `src/routes/workspace/settings/+page.svelte`).
- **Future**: per-project overrides, or “use in this thread only” — only if product needs it; don’t build until there is demand.

### 4. **Privacy & storage**

- Store on the **user settings** document you already persist per account.
- Be explicit in the UI: workspace admins or support tooling may need visibility depending on future compliance; assume **not encrypted end-to-end** unless you add that.

### 5. **Discoverability**

- Short **?** or link: “How this differs from artifacts.”
- Optional: **preview** (“last saved at …”) or a **test message** suggestion — keep minimal for v1.

### 6. **Analytics (lightweight)**

- Log **length buckets** (not raw text) to see if limits are right.
- Track **save** events vs **chat** usage to see adoption.

### 7. **Edge cases**

- **Very long** combined instructions vs model context limits — enforce caps before the gateway.
- **Multi-language** users — behavior field is where “Reply in Spanish” usually lives.

---

## Fit with the current codebase (implementation sketch)

Today, chat builds `instructions` in `src/routes/api/workspace/chat/+server.ts` from `workspaceInstructions(project)` plus optional referenced-artifact text, then passes that to `ToolLoopAgent({ instructions, ... })`.

A minimal integration path:

1. **Schema**: Extend Convex `userSettings` with one or two optional string fields (e.g. `aiContextMarkdown`, `aiBehaviorMarkdown`).
2. **API**: Expose them via existing `getMine` / `upsertMine` (or narrow mutations if you prefer).
3. **Settings UI**: Add `Textarea` controls on `src/routes/workspace/settings/+page.svelte`, same save flow as timezone/cap.
4. **Chat route**: After auth, `query(getMyUserSettingsQuery)` (or fold into an existing batched read), then concatenate into `instructions` using the **composition order** above.

This keeps changes localized: **Convex user settings + one API route + Settings page**.

---

## Alternatives to consider (instead of or before big UX)

- **Pinned first message** in a thread — user-visible, no global persistence; good for experiments.
- **Artifact titled “My preferences”** — uses existing memory model; weaker for “always apply” unless you auto-attach it (more magic, more cost).
- **Prompt presets** (dropdown) — fewer tokens, more predictable behavior.

---

## Suggested v1 checklist

- [ ] Decide **one vs two** fields; fix **user-facing names** (avoid vague “memory” alone).
- [ ] Define **composition order** with base instructions.
- [ ] Add **length limits** + empty omit.
- [ ] Add **helper + disclaimer** copy.
- [ ] Implement **Convex + Settings + chat route** as above.
- [ ] Smoke-test: budget/limit still enforced; long prefs do not break streaming.

---

## References in repo

- Workspace chat agent instructions: `src/routes/api/workspace/chat/+server.ts` (`baseInstructions`, `workspaceInstructions`, `ToolLoopAgent`).
- Settings page: `src/routes/workspace/settings/+page.svelte`.
- Client types for user settings: `src/lib/user-settings.ts`.
