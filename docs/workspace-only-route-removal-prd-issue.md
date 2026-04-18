# PRD: Workspace-only routing and legacy shell removal

_Paste this into a new GitHub issue._

## Problem Statement

Launchpad currently maintains two authenticated shells (legacy dashboard and workspace), redirect chains (`/ideas` → `/dashboard/ideas`, etc.), unreachable route components, and APIs/components that only exist to support the old Ideas/Scope/Settings flows. The database still carries Convex tables and indexes that only served those flows. That increases maintenance cost, confuses redirects and auth defaults, leaves dead schema surface area, and blocks a single clear “app” URL (`/workspace`) with a matching data model.

## Solution

Retire the legacy dashboard and the standalone Ideas, Scope, and Settings **routes and UIs** so the signed-in product is **only** the workspace experience at `/workspace`. Update auth, marketing entry points, and feature-flag behavior so nothing depends on `/dashboard` or the removed flows. Remove dead code (components, search-param schemas, and server handlers) that become unused after the cut. **Remove Convex schema and backend functions** that existed only for Ideas and Scope: delete the associated tables and validators, and remove the corresponding Convex modules and client wrappers. **No data migration is required** (no users; tables empty).

## User Stories

1. As a signed-in user, I land in `/workspace` after sign-in or signup, so I never see a deprecated dashboard.
2. As a user, there is no `/dashboard` route; the app surface is `/workspace` only (no legacy dashboard URLs to support).
3. As a visitor on the marketing home page, CTAs and nav point to `/workspace`, so I reach the app consistently.
4. As a developer, there is no `PUBLIC_FEATURE_WORKSPACE` split that sends users to a removed `/dashboard`, so local and production behavior match.
5. As a user, the workspace sidebar does not link to a removed settings URL, so I do not hit broken navigation.
6. As a user, `/ideas`, `/scope`, and `/settings` are not registered routes (404), so there are no legacy redirects.
7. As a user, invalid or unknown `redirectTo` values on `/auth` still send me to a safe default (`/workspace`), so I cannot be sent to arbitrary paths.
8. As a developer, the Convex schema contains no tables or indexes that only served the removed dashboard Ideas/Scope flows, so generated types and mental model stay minimal.
9. As a developer, Convex function modules and client wrappers for legacy ideas and standalone PRDs are removed alongside the schema.
10. As a user signing in from the marketing page, default auth controls send me toward `/workspace`.
11. As an operator deploying the app, schema pushes succeed without multi-phase migrations because legacy tables are empty.
12. As a developer running `npm run build`, the SvelteKit app builds without references to removed routes or modules.

## Implementation Decisions

- **Routing:** Remove the full legacy dashboard UI; do not register `/dashboard` routes. Do not register `/ideas`, `/scope`, or `/settings` (those URLs 404). Auth sends non-home `redirectTo` values to `/workspace`.
- **Workspace as default:** Default post-auth destination is `/workspace`; remove dependency on the legacy shell for fallback navigation.
- **Feature flags:** Removed the workspace feature flag; `/workspace` is always the authenticated app surface.
- **UI removal:** Removed Ideas, Scope, and Settings page components that only served those flows; removed the workspace sidebar Settings link that pointed at legacy URLs.
- **HTTP APIs:** Removed server endpoints that existed only for removed chat/scope/idea UIs (`/api/ideas/*`, `/api/scope`).
- **Shared client modules:** Removed search-param schemas that only supported the dashboard shell; workspace continues to use workspace search params.
- **Convex schema and functions — removed:** Tables `ideas`, `ideaChatMessages`, `prds`, `prdGenerations`, and validators used only by those tables. Convex modules `ideas` and `prds`. Client modules that wrapped those APIs.
- **Convex schema — retained:** `projects`, `chatThreads`, `chatMessages`, `artifacts`, `threadArtifactLinks`, `artifactDraftChanges`, and auth tables. Workspace chat tooling UI still uses a small client-side schema for structured “update idea outline” tool display in `idea-chat-assistant-parts` (no Convex `ideas` table).
- **Structured idea tool types:** Moved to a dedicated `structured-idea-tool` module so workspace thread UI does not depend on removed `ideas` Convex types.

## Testing Decisions

- **Good tests** assert **observable behavior**: HTTP redirects, allowed `redirectTo` values on auth, and critical workspace loads—not internal module graphs.
- **Modules to test:** Routing load functions for redirects; auth redirect allowlist; after schema removal, verify workspace flows still read/write expected tables and that no client code references removed APIs.
- **Prior art:** Follow existing SvelteKit or project test layout for route tests, if present.

## Out of Scope

- Rebuilding Ideas/Scope/Settings **inside** `/workspace` (unless you add a separate initiative).
- Broad documentation rewrites beyond what is required for accurate README/env behavior.

## Further Notes

- **Precondition:** There are no production users and legacy tables are empty, so removal can be aggressive (no export or phased migration).
- Product direction docs (e.g. chat-first PRD) describe **product**; this issue tracks **engineering cleanup** for workspace-only routing.
- Tech-debt notes about extracting a shared shell from dashboard and workspace are **obsolete** (only the workspace shell remains).
