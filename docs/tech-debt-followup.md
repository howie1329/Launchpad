# Follow-up: tech debt (optional)

Paste into a GitHub issue when ready. Not blocking the surgical cleanup PR.

## Unused UI primitives

- Audit imports under `$lib/components/ui/form` — no app-level consumers found; confirm with `npm run check` before removing.
- Audit `$lib/components/ui/empty` — appears unused; confirm before deleting.

## Layout deduplication

- If a second authenticated shell is added later, extract shared sidebar provider / nav / sign-out from `src/routes/workspace/+layout.svelte` into a shared layout or component to avoid duplication.

## Dependency cleanup

- Optional: run knip or similar to find unused npm dependencies (e.g. packages only referenced transitively).
