---
name: Launchpad
description: Chat-first workspace for solo builders turning rough ideas into scoped, buildable work.
colors:
  background: "oklch(1 0 0)"
  foreground: "oklch(0.145 0 0)"
  card: "oklch(1 0 0)"
  popover: "oklch(1 0 0)"
  primary: "oklch(0.205 0 0)"
  primary-foreground: "oklch(0.985 0 0)"
  secondary: "oklch(0.97 0 0)"
  secondary-foreground: "oklch(0.205 0 0)"
  muted: "oklch(0.97 0 0)"
  muted-foreground: "oklch(0.556 0 0)"
  accent: "oklch(0.97 0 0)"
  accent-foreground: "oklch(0.205 0 0)"
  destructive: "oklch(0.577 0.245 27.325)"
  border: "oklch(0.922 0 0)"
  input: "oklch(0.922 0 0)"
  ring: "oklch(0.708 0 0)"
  sidebar: "oklch(0.985 0 0)"
typography:
  display:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0"
  body:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
  label:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "0"
rounded:
  sm: "0.27rem"
  md: "0.36rem"
  lg: "0.45rem"
  xl: "0.63rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
  "2xl": "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "1.75rem"
    padding: "0 0.5rem"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "1.75rem"
    padding: "0 0.5rem"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "1rem"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: "2rem"
    padding: "0 0.75rem"
---

# Design System: Launchpad

## 1. Overview

**Creative North Star: "The Builder's Workbench"**

Launchpad is a product workspace, not a campaign surface. The interface should feel like a quiet workbench for turning messy thoughts into useful project material: neutral, compact, low-drama, and always oriented around the next decision. The current system uses a restrained monochrome palette, Geist Sans, compact controls, light borders, tonal panels, and simple rounded geometry.

The visual system should keep planning close to action. Chat, artifacts, projects, imports, settings, notifications, and usage controls all belong to the same workspace vocabulary. Avoid theatrical productivity language, decorative SaaS chrome, and anything that makes the product feel like a heavyweight PM suite.

**Key Characteristics:**

- Restrained neutral palette with black as the primary action color.
- Geist Sans for app chrome, labels, marketing copy, and product surfaces.
- Compact shadcn-svelte and Bits UI primitives with 7px base radius.
- Tonal layering and 1px borders instead of decorative shadows.
- Dense but breathable workspace layouts: side navigation, tabs, panels, command palette, dialogs, and markdown editing surfaces.
- Reduced-motion support for page transitions and state feedback.

## 2. Colors

The palette is deliberately restrained: white and near-white surfaces, black primary actions, neutral gray supporting states, and semantic color only when the state demands it.

### Primary

- **Workbench Ink** (`primary`): the primary action fill and strongest selection signal. Use it for the one action that commits the user's next step.
- **Ink On Dark** (`primary-foreground`): text and icons on primary action fills.

### Neutral

- **Canvas White** (`background`, `card`, `popover`): the default page, card, and overlay surface.
- **Near Black Ink** (`foreground`): headings, body text, high-emphasis labels, and active navigation.
- **Soft Panel** (`secondary`, `muted`, `accent`): low-emphasis button fills, selected rows, chat bubbles, sidebar accents, and quiet grouping surfaces.
- **Muted Ink** (`muted-foreground`): secondary descriptions, timestamps, metadata, helper text, and low-priority navigation labels.
- **Hairline Gray** (`border`, `input`): dividers, control outlines, panel borders, and form field boundaries.
- **Focus Gray** (`ring`): focus-visible rings and validation emphasis when no semantic state applies.
- **Sidebar Wash** (`sidebar`): the side navigation base layer, slightly separated from the main content canvas.

### Tertiary

- **Destructive Red** (`destructive`): destructive actions, invalid field states, and irreversible operation warnings. Use sparingly and never as decoration.

### Named Rules

**The Restraint Rule.** Primary color is not decoration. It marks commitment, current selection, or state, and should stay rare on a screen.

**The Tonal Layer Rule.** Use `secondary`, `muted`, `accent`, and `sidebar` to create structure before adding borders or new colors.

## 3. Typography

**Display Font:** Geist Sans, with sans-serif fallback.
**Body Font:** Geist Sans, with sans-serif fallback.
**Label/Mono Font:** system monospace only for code, tokens, shortcuts, and editor content.

**Character:** The type system is single-family and product-focused. It should read as precise, calm, and practical, with hierarchy coming from weight, size, and spacing rather than font changes.

### Hierarchy

- **Display** (600, 2.25rem, 1.1): marketing hero headlines and major empty-state titles. Keep line lengths balanced and avoid oversized hero type inside product chrome.
- **Headline** (600, 1.5rem, 1.2): workspace page headings, dialog titles, and artifact reader titles.
- **Title** (600, 0.875rem, 1.35): panel headers, card titles, navigation group labels, and compact section titles.
- **Body** (400, 0.875rem, 1.6): chat text, artifact summaries, settings descriptions, and marketing support copy. Cap prose at 65 to 75 characters when it is meant to be read.
- **Label** (500, 0.75rem, 1.45): buttons, tabs, badges, metadata, controls, and dense navigation.
- **Micro Label** (500, 0.625rem to 0.6875rem): small product metadata in mockups, previews, and dense sidebar details.

### Named Rules

**The Product Type Rule.** Do not introduce display fonts for app chrome, form labels, tables, navigation, or dialogs. Familiarity is part of the product's trust.

**The Copy Density Rule.** Keep labels direct and short. The UI should say what will happen: "Create artifact", "Promote to project", "Import context", "Save changes".

## 4. Elevation

Launchpad is flat by default. Depth comes from tonal layering, borders, panel placement, and active state changes rather than floating cards. Shadows are not part of the normal component vocabulary.

### Shadow Vocabulary

- **None at rest:** cards, panels, sidebars, command items, inputs, and buttons sit on the surface without decorative drop shadows.
- **Ring elevation:** components use `ring-1 ring-foreground/10`, `border-border/70`, or `focus-visible:ring-2` when they need definition.
- **Overlay separation:** dialogs, dropdowns, popovers, and command surfaces may use the existing shadcn-svelte overlay treatment, but they should feel like functional layers, not glass panels.

### Named Rules

**The Flat Workbench Rule.** If a surface needs attention, change hierarchy, placement, or tone first. Do not add a soft wide shadow to make a quiet component feel designed.

## 5. Components

### Buttons

Buttons are compact, text-first controls built on the shared shadcn-svelte button primitive.

- **Shape:** gently rounded rectangle (`rounded-md`, about 6px).
- **Primary:** black fill, light text, 28px default height, 32px large height, compact horizontal padding, medium 12px label.
- **Hover / Focus:** primary hover darkens through opacity; focus uses a visible 2px ring with the shared ring token.
- **Secondary / Ghost / Outline:** low-contrast neutral fills or transparent outlines for non-committing actions. Use icon buttons for toolbar and navigation actions when the icon is familiar.
- **Destructive:** red-tinted background and red text for destructive actions, never a full red button unless the destructive operation is the whole dialog's subject.

### Chips

Chips and badges identify types, states, tags, and small metadata.

- **Style:** rounded-full or small rounded rectangles with `secondary` or muted backgrounds and compact 10px to 12px text.
- **State:** selected chips can use stronger foreground or primary dots. Avoid saturated fills for inactive filters.

### Cards / Containers

Cards are functional containers for repeated items, previews, and bounded panels.

- **Corner Style:** rounded-lg, about 7px. Do not exceed 12px for product cards.
- **Background:** `card`, `background`, or soft tonal layers. Sidebar panels may use `sidebar` or `accent` with reduced opacity.
- **Shadow Strategy:** no decorative shadows. Use borders and rings for definition.
- **Border:** light 1px border or ring only when the surface needs separation.
- **Internal Padding:** 12px to 16px for dense panels, 20px to 24px for reader and editor surfaces.

### Inputs / Fields

Inputs are quiet, compact, and explicit.

- **Style:** 1px border, background or soft panel fill, rounded-md, 32px to 40px height depending on density.
- **Focus:** visible ring and border emphasis, with no glow.
- **Error / Disabled:** destructive border or ring for invalid states; disabled controls lower opacity and keep layout stable.
- **Large Text Areas:** use the same border and radius vocabulary, with larger internal padding and clear placeholder contrast.

### Navigation

Navigation is workspace-first and optimized for repeated use.

- **Sidebar:** collapsible product navigation with project, thread, artifact, settings, usage, and notification entry points.
- **Tabs:** workspace tab strip reflects open targets and keeps active work recoverable.
- **Command Palette:** the fast path for navigation and workspace actions. Search input, grouped results, keyboard focus, and empty states must stay predictable.
- **Mobile:** preserve the same hierarchy, but collapse persistent side navigation into accessible overlays or drawers.

### Signature Components

**Workspace Chat Landing.** The start surface combines a focused prompt input, suggestion buttons, and example cards. It should invite messy first thoughts without turning the page into a marketing hero.

**Artifact Surfaces.** Artifact reader, editor, diff, and history views are the durable memory layer. They need strong typography, clear version state, and stable controls for edit, preview, restore, and delete actions.

**Project Promotion Flow.** Promotion should feel like a review step, not magic. Dialogs and readiness states must expose strengths, missing information, included artifacts, and explicit confirmation.

## 6. Do's and Don'ts

### Do:

- **Do** use the existing Tailwind token mappings from `src/routes/layout.css` as the source of truth.
- **Do** keep product surfaces compact, scannable, and steady under repeated use.
- **Do** use tonal panels and hairline borders before introducing new visual treatment.
- **Do** keep AI actions reviewable with clear draft, included context, warning, and confirmation states.
- **Do** preserve keyboard access, visible focus, readable contrast, and reduced-motion behavior.
- **Do** use Hugeicons and existing shadcn-svelte/Bits UI primitives before creating custom affordances.

### Don't:

- **Don't** recreate the stale OpenCode terminal-manpage system that previously occupied this file.
- **Don't** make Launchpad look like a heavyweight PM suite, a generic AI chat wrapper, or decorative SaaS marketing.
- **Don't** add gradient text, glassmorphism, oversized hero metrics, side-stripe borders, or repeated icon-card grids.
- **Don't** use soft wide card shadows or nested cards as decoration.
- **Don't** use saturated color on inactive states or as general ornament.
- **Don't** let AI flows overwrite durable workspace state without explicit user review.
