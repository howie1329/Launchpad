# mvp-scoper Design System — Linear Principles

This design system codifies the visual and interaction principles observed in Linear and applies them to **mvp-scoper** (SvelteKit + [shadcn-svelte](https://www.shadcn-svelte.com/)). It supersedes default shadcn styling assumptions wherever they conflict.

All color values are defined in `src/routes/layout.css` and referenced via CSS custom property tokens (e.g. `--background`, `--sidebar-accent`). This document never hardcodes color values — the palette is theme-managed and works across light and dark modes.

Interface typography uses **`--font-sans`** (Inter Variable), wired in the `@theme inline` block in `layout.css`. This document specifies size, weight, and role — not ad hoc font family names in components. For monospaced UI, add **`--font-mono`** to `@theme inline` when you introduce code or ID styling, then use Tailwind’s `font-mono` utility.

---

## 1. Surface and Color

### Philosophy

The interface is a **single continuous canvas**. Regions are separated by **spacing and typography**, not by stacking colored containers. Borders exist only at structural seams (sidebar edge, toolbar bottom) and never wrap individual items.

### Token roles

All colors are consumed via semantic tokens defined in `src/routes/layout.css`. The design system uses these roles — actual values live in the stylesheet and can differ between light and dark mode.

| Token                | Role                                                 |
| -------------------- | ---------------------------------------------------- |
| `--background`       | Canvas — the base surface everything sits on         |
| `--sidebar`          | Sidebar canvas — may match or differ from background |
| `--card`             | Elevated surface for popovers, dialogs, cards        |
| `--popover`          | Overlay surface (menus, command palette)             |
| `--sidebar-accent`   | Hover and active fill in sidebar                     |
| `--accent`           | Hover and active fill in content areas               |
| `--muted-foreground` | Secondary text, section labels, meta                 |
| `--foreground`       | Primary text, titles, active labels                  |
| `--border`           | Structural dividers at major seams                   |
| `--sidebar-border`   | Sidebar-specific dividers                            |
| `--primary`          | Accent — brand mark, primary action buttons          |
| `--destructive`      | Danger states, delete confirmations                  |

### Rules

- **No layered cards.** If content sits on the canvas, it sits directly on the background. Cards exist only for elevated affordances (popovers, dialogs, sheets).
- **No decorative gradients** on routine product surfaces.
- **One accent color.** `--primary` for brand identity and primary actions. Everything else uses the neutral scale.
- Surface separation comes from **spacing** first, then **thin 1px borders** at major structural edges, never from background-color differentiation between adjacent sections.
- **Theme-agnostic.** Every surface, text, and border color is a CSS variable. Components never contain literal color values.

---

## 2. Typography

### Families

| Role                  | Token / utility             | Notes                                                                     |
| --------------------- | --------------------------- | ------------------------------------------------------------------------- |
| Interface text        | `--font-sans` / `font-sans` | Set in `layout.css` `@theme inline`. Default for `html` in `@layer base`. |
| Code, IDs, timestamps | `font-mono`                 | Define `--font-mono` in `@theme inline` when you need a dedicated stack.  |

Avoid hardcoded family names in components; keep stacks centralized in `layout.css`.

### Scale

| Role              | Size                    | Weight  |
| ----------------- | ----------------------- | ------- |
| Page heading      | `text-xl` (20px)        | 600     |
| Section heading   | `text-base` (16px)      | 600     |
| Body / row label  | `text-xs` (12px)        | 400–500 |
| Meta / secondary  | `text-[11px]`           | 400     |
| Nav section label | `text-[11px]` uppercase | 500     |
| Tiny helper       | `text-[10px]`           | 400     |

Text color is always a token (`foreground`, `muted-foreground`, `sidebar-foreground`, etc.) — never a literal value.

### Rules

- **Headlines are quiet.** Page titles use medium weight at a modest size — they orient, they don't shout.
- **Dense but readable.** Default line-height is tight (`leading-tight` or `leading-snug`). Generous spacing between sections compensates.
- **Uppercase sparingly.** Only for navigation section labels and metadata badges. Never for headings or body.
- **Font family is interchangeable.** Change `--font-sans` in `layout.css` without touching individual components.

---

## 3. Navigation (Sidebar)

### Anatomy

From top to bottom (adapt labels to your routes):

1. **Header row** — Account or app identity (avatar + name + chevron), search, primary create action. One dense line.
2. **Primary links** — Highest-frequency destinations, with no section label or a visually quiet one.
3. **Collapsible groups** — Grouped areas (e.g. project or tool sections). Each has a muted uppercase label + chevron. Default open where it helps scanning.
4. **Footer** — Single lightweight affordance (e.g. help or docs). Avoid duplicating account blocks.

### Item styling

| State   | Treatment                                                                      |
| ------- | ------------------------------------------------------------------------------ |
| Default | `text-xs`, `text-sidebar-foreground/75`, no background                         |
| Hover   | `bg-sidebar-accent/80` fill, `text-sidebar-accent-foreground`                  |
| Active  | `bg-sidebar-accent` pill fill, `font-medium`, `text-sidebar-accent-foreground` |

- Items use the `navPill` variant: `rounded-full`, `h-7`, `px-2.5`.
- Icons are 12px (`size-3`), monochrome, no fill or color differentiation.
- Active state is a **full-width pill**, not an inset highlight or left-edge indicator.

### Section labels

- `text-[11px]`, `font-medium`, `uppercase`, `tracking-wide`, `text-muted-foreground`.
- Clickable with chevron for collapse; subtle hover background.
- Visually quiet — they orient, they don't compete with the items below.

### Collapsed state

- Sidebar collapses to an **icon rail** (`3rem` / 48px).
- Each item shows **icon only** with a **tooltip** on hover.
- Header becomes stacked icon buttons (identity, search, create, expand).
- `Cmd+B` (or your chosen shortcut) toggles the sidebar — implement in the shell layout / sidebar component.

### Width

- Expanded: `15rem` (240px).
- Collapsed: `3rem` (48px).
- Mobile: full-width sheet, matching expanded width.

Use [shadcn-svelte Sidebar](https://www.shadcn-svelte.com/docs/components/sidebar) patterns under `$lib/components/ui` when you add the shell; configure width and collapse behavior there or in the route layout that wraps the app.

---

## 4. Layout Regions

### App shell

```
+-------------+-----------------------------------------+
|  Sidebar    |  Page content                           |
|  (15rem)    |  (flex-1, min-w-0)                      |
|             |                                         |
|             |  +------- Inspector (optional) -------+ |
|             |  |  Right panel, 22–28rem             | |
|             |  +------------------------------------+ |
+-------------+-----------------------------------------+
```

- **Sidebar**: fixed left, full viewport height. Uses `--sidebar` background.
- **Content**: fills remaining space. Uses `--background`.
- **Inspector**: optional right panel (detail, chat, properties). Collapsible with sheet or offcanvas.
- No border between sidebar and content on the content side — the sidebar's right border creates the seam.

### Page content patterns

| Pattern            | Structure                                                     | Used for                        |
| ------------------ | ------------------------------------------------------------- | ------------------------------- |
| **List workspace** | Toolbar strip + scrollable list                               | Indexes, feeds, collections     |
| **Detail view**    | Breadcrumb header + content + optional right properties panel | Single-entity views             |
| **Editor**         | List rail (left) + editor pane (center)                       | Split views, threads, documents |
| **Settings**       | Sidebar nav (left) + form content (right)                     | Settings and configuration      |

### Toolbar strip

- One row, `h-10` to `h-12`.
- Left: page title or breadcrumb. Right: filters, view toggles, actions.
- Bottom border: `border-b border-border/50`.
- No background differentiation — it sits on the same canvas as content.

---

## 5. Interactive Elements

### Buttons

| Variant     | Visual                                               | Usage                                         |
| ----------- | ---------------------------------------------------- | --------------------------------------------- |
| Primary     | Solid `--primary` fill, `--primary-foreground` text  | One per page region. Create, submit, confirm. |
| Secondary   | `bg-secondary`, `--secondary-foreground` text        | Alternative actions next to primary           |
| Ghost       | No background, `--muted-foreground` text, hover fill | Toolbars, inline actions                      |
| Destructive | `--destructive` fill                                 | Delete confirmations only                     |
| Icon-only   | `size-8`, ghost, tooltip                             | Sidebar header, toolbar icons                 |

- Default radius: `rounded-md` (uses `--radius`).
- **No shadows** on buttons. Press feedback is background-color shift only.
- Primary buttons are rare. Most actions are ghost or secondary.

### Form inputs

- `bg-input` fill, `border-input` border.
- Focus ring: `ring-2 ring-ring`.
- Compact height: `h-8` default, `h-7` for dense contexts.
- Labels above inputs, never floating.

### Menus and dropdowns

- `bg-popover`, `border border-border/70`, `rounded-lg`.
- Items: `text-xs`, `rounded-md`, `px-2 py-2`.
- Selected/checked items get a checkmark, not a background.
- Separators: `border-border`, `h-px`, `-mx-1`.

### Dialogs

- Centered, `rounded-lg`, `bg-popover`.
- Overlay: semi-transparent black.
- Title: `text-base font-semibold`. Description: `text-xs text-muted-foreground`.
- Footer actions right-aligned: secondary left, primary right.

---

## 6. Lists and Data

### Row anatomy

```
[icon 12px]  [title text-xs]                    [meta text-[11px] muted]
```

- Single-line by default. Two-line only when a secondary line adds real value (preview, subtitle).
- No row borders. Rows are separated by spacing (`gap-0` between items, padding within).
- Hover: subtle `bg-accent/50` fill. No border change.
- Active/selected: `bg-accent` pill fill, `font-medium`.

### Grouping

- Group headers: `text-muted-foreground`, optional collapse chevron.
- Indented children use `pl-6` or `pl-8`, never nested bordered containers.
- Empty states: centered icon + one sentence + optional CTA button.

### Tables (when needed)

- Header row: `text-[11px] uppercase tracking-wide text-muted-foreground`.
- Body rows: `text-xs`, hover highlight.
- No zebra striping. No heavy cell borders. Column separation by spacing.

---

## 7. Status and Feedback

### Status indicators

- Small dots (`size-2` circles) for status, using semantic tokens for color.
- Priority: icon-based (urgent, high, medium, low) — not color-coded backgrounds.
- Tags/labels: small pills with subtle left-border accent or dot, not full-color badges.

### Loading

- Skeleton placeholders matching row dimensions. No spinners on page content.
- Spinner only for inline actions (button loading state).

### Toasts

- Bottom-center or bottom-left.
- `bg-popover`, subtle border, `text-xs`.
- Auto-dismiss. No persistent banners unless action-required.

### Empty states

- Centered in the content region.
- One illustration or icon (`text-muted-foreground`).
- One sentence explaining the state.
- Optional single CTA button.

---

## 8. Motion

### Principles

- Motion confirms action and orientation. It does not decorate.
- Prefer **150ms** for micro-interactions (hover, toggle, collapse).
- Prefer **200–250ms** for layout shifts (sidebar, panel open/close).
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` — fast-out, slow-in.

### Where motion exists

| Interaction              | Motion                        | Duration |
| ------------------------ | ----------------------------- | -------- |
| Sidebar collapse/expand  | Width transition + label fade | 200ms    |
| Collapsible group toggle | Height + opacity              | 150ms    |
| Hover fill               | Background color              | 150ms    |
| Active pill              | Instant (no animation)        | 0ms      |
| Inspector panel slide    | Translate-x + opacity         | 240ms    |
| Dialog enter             | Scale 0.95 to 1 + opacity     | 200ms    |
| Toast enter              | Translate-y + opacity         | 150ms    |

### Where motion does not exist

- Page-to-page navigation (instant swap, no transitions).
- List item reordering (instant, or deferred to drag-and-drop).
- Focus ring (instant).

---

## 9. Spacing System

### Base unit

Tailwind’s spacing scale uses **4px** as the fundamental step (`p-1` = 4px, etc.). Prefer multiples of **4px** for padding, gap, and layout rhythm.

### Common values

| Token   | Value | Usage                                    |
| ------- | ----- | ---------------------------------------- |
| `p-1`   | 4px   | Tight internal padding (icon buttons)    |
| `p-1.5` | 6px   | Sidebar header internal                  |
| `p-2`   | 8px   | Section padding, card padding            |
| `p-3`   | 12px  | Content section padding                  |
| `p-4`   | 16px  | Page-level padding                       |
| `gap-0` | 0     | Between list items (padding is internal) |
| `gap-1` | 4px   | Between header elements                  |
| `gap-2` | 8px   | Between sections                         |

### Density

- **Sidebar**: dense. Rows are `h-7` (28px). Section gaps are `8px`.
- **Content**: moderate. Rows are `h-8` to `h-10`. Section gaps are `16px`.
- **Settings/forms**: relaxed. Rows are `h-10` to `h-12`. Section gaps are `24px`.

---

## 10. Accessibility

- **Keyboard**: all interactive elements reachable via Tab. Document app shortcuts (e.g. sidebar toggle, search, optional inspector) in your shell and wire them in SvelteKit layout or dedicated handlers.
- **Focus ring**: `ring-2 ring-ring` on all focusable elements. Visible in both light and dark mode.
- **ARIA**: sidebar uses `nav` landmark. Groups use collapsible pattern with `aria-expanded`. Menus use proper `role="menu"` / `role="menuitem"`.
- **Color contrast**: all text must meet WCAG 2.1 AA against its background in both light and dark themes. Verify when changing token values in `layout.css`.
- **Reduced motion**: honor `prefers-reduced-motion`. Collapse transitions become instant. Inspector slide becomes instant opacity swap.

---

## 11. Anti-Patterns (Do Not)

- **Do not** wrap content regions in cards with borders and shadows. Use spacing and typography.
- **Do not** use more than one accent color. Neutral scale + `--primary`.
- **Do not** add decorative gradients behind product surfaces.
- **Do not** stack multiple competing toolbars. One toolbar strip per page.
- **Do not** use large branded headers inside the app shell. The sidebar header is the identity.
- **Do not** use heavy box-shadows on interactive elements. Shadows exist only on elevated overlays (popovers, dialogs, sheets).
- **Do not** use colored backgrounds to differentiate sidebar sections. Spacing and labels do the work.
- **Do not** create bordered cards for individual list items. Hover states provide the interactive boundary.
- **Do not** add icon color coding in navigation. All nav icons are monochrome foreground.
- **Do not** use toast notifications for success states that are obvious from context (e.g. item appears in list after creation).
- **Do not** hardcode color values in components. Always use CSS variable tokens.
- **Do not** hardcode font family names in components. Use `font-sans` / `font-mono` (and optional `font-serif` if you add it to `@theme`) tied to `layout.css`.

---

## 12. Applying This System

### New component checklist

1. Does it sit on the canvas without a card wrapper?
2. Is text hierarchy limited to 2-3 levels (heading, body, meta)?
3. Does hover state use a single subtle background fill?
4. Is the accent color used only for primary action or brand mark?
5. Does it work in collapsed sidebar state?
6. Does it meet the spacing grid (4px multiples)?
7. Does it have proper keyboard access?
8. Are all colors referenced via CSS variable tokens (no literal values)?
9. Are font families referenced via theme utilities (`font-sans`, `font-mono` as configured), not literal names?
10. Does it pass contrast checks in both light and dark mode?

### Reviewing existing UI

When updating existing components, apply the system bottom-up:

1. Remove unnecessary card wrappers and borders.
2. Replace colored backgrounds with spacing.
3. Reduce button variants to ghost where possible.
4. Align text sizes to the scale above.
5. Ensure hover/active states follow the pill pattern.
6. Replace any hardcoded colors with token references.
7. Replace any hardcoded font families with theme utilities.

### Where values live

- **Colors (light and dark):** `src/routes/layout.css` — `:root` and `.dark` blocks.
- **Font stack:** `src/routes/layout.css` — `@theme inline` (`--font-sans`; add `--font-mono` when needed).
- **Radius:** `src/routes/layout.css` — `--radius` and derived `--radius-*` in `@theme inline`.
- **Tailwind ↔ tokens:** `src/routes/layout.css` — `@theme inline` maps semantic colors to Tailwind.
- **Sidebar width / collapse:** shadcn-svelte Sidebar components under `$lib/components/ui` and the route layout that composes them (configure when the app shell exists).

### Working rule

This document is the source of truth for Linear-style surfaces in mvp-scoper. If you add other product docs (e.g. feature specs), prefer this file for **sidebar, navigation, lists, and page chrome** unless a deliberate exception is documented.
