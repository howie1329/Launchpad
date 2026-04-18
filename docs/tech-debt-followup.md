# Follow-up: tech debt (optional)

Paste into a GitHub issue when ready. Not blocking the surgical cleanup PR.

## Unused UI primitives

- Audit imports under `$lib/components/ui/form` — no app-level consumers found; confirm with `npm run check` before removing.
- Audit `$lib/components/ui/empty` — appears unused; confirm before deleting.

## Layout deduplication

- Extract a shared authenticated shell (sidebar provider, nav structure, sign-out) from `src/routes/workspace/+layout.svelte` and `src/routes/dashboard/+layout.svelte` to reduce duplicated sidebar wiring. Do this only when touching those files for a feature, to keep diffs reviewable.

## Dependency cleanup

- Optional: run knip or similar to find unused npm dependencies (e.g. packages only referenced transitively).
