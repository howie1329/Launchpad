---
version: alpha
name: OpenCode-design-analysis
description: |
  A terminal-native marketing system rendered entirely in Berkeley Mono — every word on the page, from the hero headline down to the footer fine print, is monospaced. The page itself reads like a manpage or a static-site README: warm cream canvas, nearly-black ink, tight-radius rectangles for the few interactive elements, and bracketed `[+]`/`[-]` ASCII markers used as bullets. The brand's only "visual moment" is a single dark hero card that mocks up the OpenCode TUI itself — black background, monospaced terminal output, ASCII pipe characters, and a wordmark rendered as block-pixel ASCII. Every section sits as a hairline-bordered text block on the cream canvas with no shadows, no gradients, no decorative imagery, and no non-monospaced character anywhere in the system.
---

## Overview

OpenCode's marketing site is rendered entirely in Berkeley Mono — every word on the page, from the 38px hero headline down to the 14px footer fine print, sits in the same monospaced face. The visual identity comes from that single typographic decision: the page reads like a manpage or a static-site README, complete with bracketed `[+]` / `[-]` / `[x]` ASCII markers used in place of icons or bullets, and a wordmark rendered as block-pixel ASCII art at the top of the nav. There is no sans-serif anywhere, no display face, no italics, no decorative ornament — the system is one font and one weight away from being a 1990s `whatis` page rendered at modern resolutions.

The chrome is austere: warm cream canvas, nearly-black ink, and a restrained neutral gray ladder for body, metadata, and disabled text. Cards don't exist as raised surfaces — sections are just hairline-bordered text blocks sitting directly on the canvas with 96px air between them. The single "visual" moment in the entire system is a full-bleed dark hero card that mocks up the OpenCode TUI itself: a terminal frame with `tab` / `ctrl-p` keybinding hints, a "Build" command line, and the OpenCode wordmark rendered as a pixel-block ASCII title.

The semantic palette is intentionally quiet on marketing surfaces. Accent, warning, danger, and success colors appear mainly inside the dark TUI mockup as syntax-highlight stand-ins. The marketing pages mostly stay monochrome.

**Key Characteristics:**

- 100% Berkeley Mono typography across every text role — no sans-serif fallback anywhere in the chrome
- Warm cream canvas as the only body background — no surface alternation across sections
- Single dark surface reserved exclusively for the hero TUI mockup
- 4px radius on every interactive element; sections themselves are sharp rectangles bordered in 1px hairline
- ASCII bracket markers (`[+]`, `[-]`, `[x]`) used as bullet glyphs in feature lists and FAQ rows
- Block-pixel ASCII wordmark in the primary nav and inside the hero TUI — the brand identity is its own ASCII art
- 96px section rhythm between every section, with no decorative dividers; only thin 1px hairline rules separate content blocks

## Colors

> **Source pages:** `/` (home), `/zen`, `/enterprise`. The chrome palette is identical across all three.
> **Implementation source:** use [`src/routes/layout.css`](src/routes/layout.css) for real color variables, Tailwind theme mappings, font variables, radius variables, and base styles.

This file describes the visual target only. Do not invent or reference color names from this document when implementing. Use `src/routes/layout.css` and the Tailwind utilities already available in the app.

Visual intent:

- Warm cream page canvas.
- Nearly-black ink for headings, body text, nav links, and solid marks.
- Subtle neutral grays for metadata, disabled states, dividers, and secondary annotations.
- A single dark terminal surface for the hero TUI mockup.
- Semantic colors only as restrained in-terminal syntax or status accents, not as loud marketing chrome.

## Typography

### Font Family

**Berkeley Mono** is the proprietary monospaced face used across every text role in the system. It carries weights 400 (regular), 500 (medium), and 700 (bold) and falls back through a long monospace stack — IBM Plex Mono → ui-monospace → SFMono-Regular → Menlo → Monaco → Consolas → Liberation Mono → Courier New.

The single-font decision is the brand. There is no display face, no body sans, no italic alternative, and no fallback to a proportional font anywhere — even the legal copyright row uses Berkeley Mono at 14px. This is the most aggressive typographic restraint of any site in the marketing-tools category: OpenCode's identity is "the marketing page is a man page."

### Hierarchy

| Role                       | Size | Weight | Line Height | Letter Spacing | Use                                                                   |
| -------------------------- | ---- | ------ | ----------- | -------------- | --------------------------------------------------------------------- |
| 38px bold monospace display  | 38px | 700    | 1.5         | 0              | Hero headline ("The open source AI coding agent")                     |
| 16px bold monospace heading  | 16px | 700    | 1.5         | 0              | Section label ("What is OpenCode?", "FAQ", "Built for privacy first") |
| 16px regular monospace     | 16px | 400    | 1.5         | 0              | Body copy, paragraph text, list-row text, install-snippet code        |
| 16px medium monospace | 16px | 500    | 1.5         | 0              | Inline emphasis, primary nav link, tab-label active                   |
| compact 16px medium monospace  | 16px | 500    | 1           | 0              | Compact label rendered without breathing room                         |
| 16px regular monospace link     | 16px | 400    | 1.5         | 0              | Inline anchor link in body prose                                      |
| 16px medium monospace button text   | 16px | 500    | 2           | 0              | Every button label across the system                                  |
| 14px regular monospace caption  | 14px | 400    | 2           | 0              | Footer link text, badge label, copyright row, chart caption           |

### Principles

The hierarchy is built almost entirely from size and weight contrast on a single face. The display headline (38px / 700) and the heading-md label (16px / 700) share a weight; the difference is just size. Body and link share size, weight, and line-height — only context distinguishes them. Buttons get a deliberately tall line-height (2.0) so labels feel calmly spaced inside the 4px-radius rectangle.

### Note on Font Substitutes

Berkeley Mono is a paid commercial font. Open-source substitutes that approximate its metrics within ~3% at body sizes:

- **JetBrains Mono** — closest match for stroke contrast and x-height; pair at weights 400 / 500 / 700.
- **IBM Plex Mono** — official secondary fallback in the documented font stack; slightly more open counters but matches line-height behavior.
- **Geist Mono** — modern alternative with similar geometric construction.

When substituting, line-height behavior is preserved by keeping `lineHeight: 1.5` for body and `lineHeight: 2` for buttons — adjusting weight is rarely needed.

## Layout

### Spacing System

- **Base unit:** 8px (with finer 1/2/4px steps available for tight inline gaps).
- **Spacing scale:** 1px, 4px, 8px, 12px, 16px, 24px, 32px, and a 96px major-section rhythm.
- **Universal section rhythm:** every page in the set uses 96px as the vertical gap between major content blocks. This is the dominant layout cue across the home, `/zen`, and `/enterprise` pages.
- **Section internal padding:** content rows inside a section sit at 16px vertical spacing with no horizontal padding — text starts flush at the section's left edge.

### Grid & Container

- **Max width:** ~960px content column for body sections; the dark hero TUI mockup is full-bleed within an outer ~1100px content frame.
- **Two-column split:** `/enterprise` pairs a left text block (~360px wide) with a right-aligned form column (~480px wide). The home page is single-column reading.
- **Footer:** 5-up horizontal link row (GitHub / Docs / Changelog / Discord / X) at desktop, collapsing to 2-up at tablet and 1-up at mobile.

### Whitespace Philosophy

Whitespace is structural and generous. Sections sit 96px apart with no decorative dividers between them — the hairline 1px rule is the only signal of separation. Inside a section, content is left-flush against the column edge with no internal indentation; bullets use ASCII bracket prefixes (`[+]` / `[-]`) instead of indent-based layout. The result is a page that feels like a printed code listing rather than a styled marketing layout.

## Elevation & Depth

| Level               | Treatment                                             | Use                                                                                          |
| ------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 0 — Flat            | No border, no shadow                                  | Default for body sections, list rows, hero text block, footer                                |
| 1 — Hairline rule   | 1px solid hairline (translucent warm tint) | Section dividers, between major content blocks                                               |
| 2 — Hairline strong | 1px solid strong hairline                  | Tab strip bottom rule, in-list emphasized divider                                            |
| 3 — Inverted dark   | dark terminal surface fill                          | Hero TUI mockup, dark CTA pill — the system's only "elevated" surface uses color, not shadow |

There are no drop shadows in the system. Nothing lifts, nothing floats. The only way an element registers as "above" another is the dark surface used in the hero mockup.

### Decorative Depth

Depth comes from typography density and the single dark TUI mockup, not from CSS effects:

- **ASCII block-pixel wordmark** — the OpenCode brand name rendered as a 5-row block of monospaced character cells, used in the primary nav and as the centerpiece of the hero TUI mockup.
- **Hero TUI mockup** — full-bleed dark terminal surface rectangle containing a faux terminal interface: ASCII wordmark, a `tui-prompt-row` showing a Build command line, and `tab switch agent` / `ctrl-p commands` keybinding hints in secondary terminal text at the bottom edge.
- **Chart tiles** — three thin-line ASCII charts inside the home page's "open source AI coding agent" stat block, with abstract dotted/sparse-line plots in body text against the cream canvas. Captions sit beneath in 14px regular monospace caption (`Fig 1. 150K GitHub Stars`, `Fig 2. 850 Contributors`, `Fig 3. 6.5M Monthly Devs`).

## Shapes

### Border Radius Scale

| Shape            | Value  | Use                                                                                                       |
| ---------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| 0px radius | 0px    | Sections, hero TUI mockup, primary nav, footer, list rows — every container that isn't a button           |
| 4px radius   | 4px    | Every interactive element — primary CTA, secondary CTA, text inputs, install snippet, badges, prompt rows |
| full circle radius | 9999px | Avatar circles in testimonials                                                                            |

The radius vocabulary is two values: 4px for interactive elements and 0px for everything else. Avatar circles in testimonial rows are the only fully-rounded element in the system.

### Photography Geometry

There is no photography. Visual elements are limited to:

- **ASCII block-pixel wordmark** in the nav and hero TUI mockup.
- **Inline ASCII charts** inside the stat-block section — abstract sparse-line and dotted plots without specific data points.
- **Avatar dots** (~32px) inside testimonial rows on `/zen` — flat colored circles.
- **In-product icons** (kbd, A+, ⊕, ↻, K, Z) rendered as small monospaced character glyphs, not bitmaps or SVG.

## Components

> **No hover states documented** per system policy. Each spec covers Default and Active/Pressed only.

### Buttons

**`button-primary`** — the universal OpenCode CTA

- Background primary action fill from layout.css, text on-primary text from layout.css, type 16px medium monospace button text, padding `4px 20px`, height ~36px, rounded 4px radius (4px).
- Used for "Download" (top nav), "Get started with Zen", "Send" (enterprise contact form), "Subscribe" (newsletter footer), "Read docs →".
- Pressed state lives in `button-primary-active` — background drops to pressed primary fill.

**`button-secondary`** — outlined alternative

- Background warm cream canvas, text nearly-black ink, 1px solid strong hairline border, type 16px medium monospace button text, padding `4px 20px`, rounded 4px radius.
- Lower-emphasis CTA — appears beside the primary fill where two actions are paired.

**`button-tab`** + **`button-tab-active`** — install-tab strip

- Default: transparent background, text muted text, type 16px medium monospace button text, padding `8px 16px`, rounded 0px radius.
- Active: same surface, text nearly-black ink, with a 2px secondary terminal text bottom underline indicating selection.
- Used in the install-method tab strip on the home page (`curl` / `npm` / `bun` / `brew` / `yay`).

**`button-disabled`**

- Background soft inset surface, text secondary terminal text, rounded 4px radius.

### Badges & Chips

**`badge-news`** — small dark chip in the news/announcement strip

- Background dark terminal surface, light text, type 14px regular monospace caption, padding `2px 8px`, rounded 4px radius.
- Sits inline with body copy as a "News" / "Beta" / "Live now" tag on the home page above the hero headline.

**`badge-section-label`** — bracketed section header

- Background transparent, text nearly-black ink, type 16px bold monospace heading, rounded 0px radius.
- Renders as a bare `**Heading**` line above a 1px hairline rule with no chip background — but the way the text reads ("[+]", "[x]", `What is OpenCode?`) makes it function as a label component.

### Inputs & Forms

**`text-input`** + **`text-input-focused`**

- Default: background soft surface, text nearly-black ink, 1px solid hairline, type 16px regular monospace, padding `8px 12px`, height ~40px, rounded 4px radius.
- Focused: background flips to warm cream canvas, border becomes 1px solid nearly-black ink (the canvas's flat focus signal — no halo, no glow).
- Used for every contact-form field on `/enterprise` (Full name, Role, Company, Company email, Phone number) and the newsletter email field at the home page footer.

**`textarea`**

- Background soft surface, text nearly-black ink, 1px solid hairline, type 16px regular monospace, padding `12px`, rounded 4px radius.
- "What problem are you trying to solve?" multi-line textarea on `/enterprise`.

**`install-snippet`** — the home page's signature install code block

- Background soft inset surface, text nearly-black ink rendered in 16px regular monospace (already monospaced — Berkeley Mono), padding `12px 16px`, rounded 4px radius.
- Contains the literal `curl -fsSL https://opencode.ai/install | bash` command with a small copy-icon at the right edge. Sits below the install-method tab strip.

### Cards & Containers

**`hero-tui-mockup`** — the home page's signature TUI preview

- Container: full-bleed dark terminal surface (~near-black), padding `64px 32px`, rounded 0px radius.
- Contents (top to bottom): ASCII block-pixel "OPENCODE" wordmark centered in light text; the TUI prompt row showing a "Build" command line with model selector text; a `tab switch agent  ctrl-p commands` keybinding hint row at the bottom in secondary terminal text.

**`tui-prompt-row`** — the inset command line inside the TUI mockup

- Background slightly elevated dark terminal surface, light text in 16px regular monospace, padding `8px 12px`, rounded 4px radius.
- Renders an inline command (`Build  Claude Opus 4.5  OpenCode Zen`) with a leading vertical pipe and the model name styled as a bracketed label.

**`list-row`** — feature/benefit row with ASCII bracket bullet

- Background warm cream canvas, text body text in 16px regular monospace, padding `8px 0`.
- Each row begins with a `[+]` / `[-]` / `[x]` ASCII marker followed by a bold label and a regular description: e.g., `[+] LSP enabled    Automatically loads the right LSPs for the IDE`. The bracket marker is part of the text content, not a separate icon.

**`faq-row`** — FAQ entry with bracket toggle

- Background warm cream canvas, text nearly-black ink in 16px regular monospace, padding `12px 0`, with a 1px hairline bottom rule.
- Each row leads with `+` / `−` ASCII markers indicating expand/collapse state. Always rendered as plain text rows — no chevron icons, no animated accordion chrome.

**`testimonial-row`** — `/zen` peer-quote row

- Background soft surface, text body text in 16px regular monospace, padding `16px 20px`, rounded 4px radius.
- Layout: a 32px avatar circle (full circle radius) at left, name + role + company in 16px medium monospace on the first line, quote in 16px regular monospace body text on the second line.

**`chart-tile`** — the stat-block sparse-line chart

- Background warm cream canvas, text body text in 14px regular monospace caption, rounded 0px radius, padding `16px`.
- Contains an inline SVG/CSS-drawn ASCII-style sparse-line plot (dotted, abstract — never specific data points) with a `Fig N. <stat label>` caption beneath in muted text.

### Navigation

**`primary-nav`**

- Background warm cream canvas, text nearly-black ink in 16px medium monospace, height ~56px, rounded 0px radius, with a 1px hairline bottom rule.
- Layout (desktop): block-pixel ASCII OpenCode wordmark at left (~120×24px), nav links cluster center-right ("GitHub [150K] · Docs · Zen · Go · Enterprise"), the primary button "Download" CTA at the far right with a small download glyph.

**Top Nav (Mobile)**

- ASCII wordmark stays at left, nav links collapse into a hamburger drawer at the right. The Download CTA remains visible at every breakpoint.

### Footer

**`footer-section`**

- Background warm cream canvas, text body text in 14px regular monospace caption, padding `32px 0`, with a 1px hairline top rule.
- Top row: 5-column horizontal link grid (GitHub [150K] · Docs · Changelog · Discord · X), each rendered as a centered cell separated by 1px hairline vertical rules.
- Bottom row: `©2026 Anomaly` copyright at left, `Brand · Privacy · Terms · English ▼` utility cluster at right, all in 14px regular monospace caption muted text.

### Inline

**`link-inline`** — body-prose anchor link

- nearly-black ink text with underline. The brand's only link affordance — even links inside body paragraphs use ink color rather than accent blue. Apple Blue is reserved for the in-product TUI.

## Do's and Don'ts

### Do

- Render every text role in Berkeley Mono. The single-font decision is the entire identity.
- Keep warm cream canvas as the only body background. Don't introduce gray section bands.
- Use ASCII bracket markers (`[+]`, `[-]`, `[x]`, `+`, `−`) as bullets, toggles, and section glyphs. They are the brand's only iconography.
- Anchor the dark the hero TUI mockup exactly once per landing page as the hero centerpiece. Never use the dark surface for body content.
- Reserve accent (Apple Blue) and the rest of the semantic ramp for in-TUI states; marketing chrome stays monochrome.
- Use 4px radius (4px) on every interactive element and 0px radius (0px) on every container.
- Stack content sections at a 96px rhythm with only 1px hairline rules between them.

### Don't

- Don't introduce a sans-serif body font, a display face, or an italic style. Berkeley Mono carries everything.
- Don't add drop shadows, gradients, or atmospheric backgrounds. The system is flat-on-cream.
- Don't replace the ASCII bracket markers with SVG icons. The brackets are the icons.
- Don't use the semantic accent ramp (accent, warning, danger, success) on marketing CTAs. They belong to the in-product TUI.
- Don't pad cards with 24px+ internal padding. List rows sit at 8px vertical; FAQ rows at 12px.
- Don't render the OpenCode wordmark as a vector logo. It is always block-pixel ASCII.
- Don't fill the hero TUI mockup with photography or illustration. It is text-only and always shows a faux terminal command line.

## Responsive Behavior

### Breakpoints

| Name          | Width   | Key Changes                                                                         |
| ------------- | ------- | ----------------------------------------------------------------------------------- |
| desktop-large | 1280px+ | Default — 960px content column, 5-up footer link grid                               |
| desktop       | 1024px  | Same layout; nav remains horizontal                                                 |
| tablet        | 850px   | Footer collapses to 2-up grid; `/enterprise` two-column form stacks                 |
| tablet-narrow | 768px   | Primary nav becomes hamburger drawer; Download CTA stays visible                    |
| mobile        | 640px   | Single-column everything; hero display drops 38px → ~28px; section padding tightens |

### Touch Targets

All interactive elements meet WCAG AA at the ~36–40px height range. the primary button sits at ~36px with 20px horizontal padding. text inputs and textareas sit at ~40px. tab buttons rows in the install-method strip sit at ~32–36px depending on label length but extend to a full 44px tappable cell via inline padding. Footer links use 14px regular monospace caption (14px) but receive ~28px line-height (caption-md is 2.0) plus 8px vertical padding for a comfortable ~44px tappable row.

### Collapsing Strategy

- **Primary nav:** desktop horizontal cluster → tablet-narrow hamburger drawer at 768px. The dark "Download" CTA stays visible at all widths.
- **Hero TUI mockup:** maintains its full-bleed dark surface at every breakpoint; the ASCII wordmark scales proportionally and the keybinding-hint row may wrap to two lines on narrow screens.
- **Install snippet + tab strip:** desktop fixed-width pill → mobile full-width pill with horizontal scroll on the tab strip if labels overflow.
- **Footer:** 5-up horizontal link grid → 2-up at tablet → 1-up at mobile (each link becomes a full-width row).
- **`/enterprise` two-column layout:** desktop 50/50 → tablet stacks to single-column with the form below the text block.
- **Section padding:** 96px desktop, 64px tablet, 48px mobile.
- **Hero headline:** 38px bold monospace display at desktop, scaling to ~28px at mobile, line-height holding at 1.5.

### Image Behavior

There are no raster images in the system aside from the favicon and OG share image. Every visual element — wordmarks, charts, icons — is rendered as type or inline SVG and scales without aspect-ratio considerations.

## Iteration Guide

1. Focus on ONE component at a time. Pull its YAML entry and verify every property resolves.
2. Reference component names and visual traits directly, such as nearly-black ink, the hero TUI mockup, and 4px radius.
3. After edits, verify this file still points implementers to `src/routes/layout.css` for real color and theme values.
4. Add new variants as separate component entries (`-active`, `-disabled`) — do not bury them inside prose.
5. Default body to 16px regular monospace; reach for 16px medium monospace for emphasis; reserve 38px bold monospace display strictly for the page-top hero headline.
6. Keep dark terminal surface scarce — at most one full-bleed dark mockup per page. The dark surface is a narrative device, not a chrome treatment.
7. When introducing a new component, ask whether it can be expressed with the existing ASCII-bracket + 4px-radius + Berkeley-Mono vocabulary before adding new rules. The system's strength is that it almost never needs new ones.

## Known Gaps

- **Mobile screenshots not captured** — responsive behavior synthesizes OpenCode's mobile pattern (hamburger drawer, single-column, footer accordion) from desktop evidence and the breakpoint stack.
- **Hover states not documented** by system policy.
- **In-product TUI screenshots** beyond the marketing hero mockup are not in the captured set; the actual `opencode` terminal interface (full keybindings, panels, status bar) is not documented here.
- **`/go` page** not extracted — the marketing page for the Go SDK likely shares the same chrome but introduces code-sample blocks not documented above.
- **Form validation state styling** (success / error inline messages) not present in the captured surfaces.
