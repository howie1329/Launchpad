# Mobile-first responsive implementation plan

This plan is implementation-first: specific files, sequencing, acceptance checks, and rollout gates.

## Objective

Make the Launchpad experience feel native on phones first, then progressively enhance for tablet/desktop.

## Definition of done (mobile)

- No horizontal scrolling on core app screens at **360px width**.
- All primary actions have at least ~44px touch targets.
- Header actions are discoverable without crowding or accidental taps.
- Chat composer remains usable with virtual keyboard open.
- Artifact and thread context flows are understandable without split-pane assumptions.

## Scope (phase 1 release)

Primary paths only:

- `/workspace` landing and active thread views
- `/workspace/artifacts/[artifactId]`
- Global workspace shell (`+layout.svelte`)

Out of scope for phase 1:

- Pixel-perfect redesign of every legacy screen
- New design system package/dependency
- Desktop visual overhauls not tied to mobile behavior

## UX strategy

1. **Mobile defaults first** in classes and layout decisions.
2. Add `sm`/`md`/`lg` enhancements progressively.
3. Keep one obvious primary action per screen section.
4. Move secondary actions into overflow/sheet patterns on narrow widths.

---

## Workstream A — Workspace shell responsiveness

### Files

- `src/routes/workspace/+layout.svelte`
- `src/lib/components/workspaces/WorkspaceTabStrip.svelte`
- `src/lib/components/workspaces/WorkspaceTabPicker.svelte`
- `src/lib/components/ui/sidebar/*` (only if needed for behavior, avoid broad rewrites)

### Implementation plan

1. **Header collapse model (mobile-first)**
   - Keep only: sidebar trigger + context-aware primary action + overflow trigger.
   - Move tab strip, tab picker, artifact mode toggles, and secondary CTA into overflow panel/dialog on `< md`.
2. **Overflow-safe layout rules**
   - Enforce `min-w-0`, truncation, and hide/show priorities for title-like content.
   - Explicitly avoid multi-control wrapping that causes accidental taps.
3. **Sidebar behavior on phone**
   - Prefer drawer-like interaction; close after selection.
   - Keep section toggles and action affordances reachable with touch.

### Acceptance checks

- At 360px and 390px widths, header remains single-purpose and stable.
- No clipped/overlapping controls in top chrome.

---

## Workstream B — Chat composer and thread ergonomics

### Files

- `src/lib/components/workspaces/WorkspaceThread.svelte`
- `src/lib/components/workspaces/WorkspaceChatLanding.svelte`
- `src/lib/components/ai-elements/prompt-input/**`
- `src/lib/components/ai-elements/context/**`
- `src/lib/components/ai-elements/model-selector/**`

### Implementation plan

1. **Composer toolbar simplification on phone**
   - Keep submit affordance always visible.
   - Collapse model/context controls into a single “Options” affordance on narrow widths.
2. **Keyboard-safe behavior**
   - Validate scroll anchoring when keyboard opens/closes.
   - Prevent submit button from being obscured.
3. **Message readability pass**
   - Promote micro text used in high-frequency mobile contexts (where needed) to improve legibility.
   - Keep desktop density unchanged.

### Acceptance checks

- Sending a message on iPhone-sized viewport requires no lateral scrolling.
- Composer + controls remain operable with keyboard open.

---

## Workstream C — Artifact and context panel mobile flows

### Files

- `src/lib/components/workspaces/WorkspaceArtifactReader.svelte`
- `src/lib/components/workspaces/ArtifactReadSurface.svelte`
- `src/lib/components/workspaces/ArtifactHistorySurface.svelte`
- `src/routes/workspace/artifacts/[artifactId]/+page.svelte`
- `src/lib/components/workspaces/WorkspaceThread.svelte` (context panel behavior)

### Implementation plan

1. **Context panel interaction model**
   - On mobile, present context as full-height sheet or dedicated drill-in view.
   - Keep back/close behavior explicit.
2. **Artifact readability rules**
   - Stack metadata and controls vertically below `md`.
   - Avoid side-by-side assumptions for history/read controls.
3. **Action placement consistency**
   - Primary action at bottom/top consistently on mobile surfaces.

### Acceptance checks

- Context can be opened, understood, and closed in one-handed flow.
- Artifact pages have no cramped side-by-side metadata/control blocks on phone.

---

## Workstream D — Responsive tokens and guardrails

### Files

- `src/routes/layout.css`
- components where `text-[10px]` / `text-[11px]` and compact icon buttons are high-frequency

### Implementation plan

1. Define a minimal responsive typography/tap-target policy for app surfaces:
   - avoid 10px text for frequent interactive labels on mobile
   - ensure primary tap targets are comfortably touchable
2. Apply only where high-frequency interactions exist first (workspace shell, composer, tabs, context controls).
3. Do not introduce a new styling framework or large abstraction layer.

### Acceptance checks

- Major interactive surfaces meet readability and touch comfort targets on phone.

---

## Sequencing and milestones

### Milestone 1 (2–3 days): Shell first

- Complete Workstream A.
- Demo: stable mobile header + overflow actions.

### Milestone 2 (2–3 days): Chat ergonomics

- Complete Workstream B.
- Demo: reliable composer and options behavior with keyboard.

### Milestone 3 (2–3 days): Artifact/context flows

- Complete Workstream C.
- Demo: context + artifact mobile flows without split-pane friction.

### Milestone 4 (1 day): Token pass and polish

- Complete Workstream D.
- Run regression pass for desktop/tablet behavior.

---

## QA matrix (required)

### Devices / viewports

- 360x800
- 390x844
- 768x1024
- 1280x800

### Test scenarios

1. Open workspace, switch tabs, open overflow actions.
2. Start new thread, send prompt, toggle options/context.
3. Open artifact, switch read/history, navigate back.
4. Rotate portrait/landscape on mobile widths.
5. Verify no horizontal overflow on key screens.

### Commands

- `npm run check`
- `npm run lint`
- `npm run build`

---

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Mobile header regressions break desktop affordances | Implement mobile-specific variants and keep desktop path unchanged behind `md`+ classes |
| Too many one-off class tweaks | Consolidate repeated patterns into a few shared utility class constants per component area |
| Context flow confusion on mobile | Prefer one interaction model (sheet or drill-in) and use it consistently |

## Rollout approach

- Ship by milestone behind small PRs (not one mega PR).
- After each milestone: run QA matrix + capture before/after screenshots in PR.
- If a milestone introduces instability, revert only that milestone PR.
