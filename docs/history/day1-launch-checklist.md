# Day-1 launch checklist (manual)

Run `npm run check` and `npm run lint` before sign-off. Then walk each flow in **light and dark** theme and at **~390px width** where applicable.

## Auth and deep links

- [ ] Open `/workspace?thread=<valid>` while signed out → sign in → land on same URL (thread + `project` / `context` preserved when present).
- [ ] Malicious `redirectTo` in URL is ignored after auth (you land on `/` or `/workspace`, not an external site).

## Core workspace

- [ ] Sidebar loads projects, inbox chats, artifacts; on simulated failure, error banner + **Try again** refetches.
- [ ] Footer **AI today** shows usage or a clear error + **Retry**.

## Chat → idea → PRD (happy path)

- [ ] New chat from landing → thread loads; send messages; model selector works.
- [ ] `@` mention list opens; arrow keys move selection; Enter picks; Escape closes.
- [ ] Composer has a visible **focus ring** when tabbing to it.

## Promote to project

- [ ] From a **general** (non-project) thread, **Create project from chat** appears in header → dialog → creates project → URL updates with `project` + same `thread`.
- [ ] Button **hidden** when thread already belongs to a project or on settings / full-page artifact routes.

## Artifact reader and drafts

- [ ] Open artifact from thread context; edit; save; draft compare / apply / discard still behave.

## Settings and limits

- [ ] `/workspace/settings` loads preferences and usage; errors show **Try again** / **Retry** where implemented.
- [ ] Save preferences succeeds; validation errors show for bad cap.

## Failure UX

- [ ] Invalid or other-user `thread` id in URL → **Could not load this thread** (not infinite loading) with **Try again** / **Back to workspace**.
- [ ] If message save fails, copy is honest and **Retry sync** appears.

## Pass / fail log

| Area                | Tester | Date | Pass |
| ------------------- | ------ | ---- | ---- |
| Auth + deep link    |        |      |      |
| Workspace lists     |        |      |      |
| Thread + mentions   |        |      |      |
| Promote             |        |      |      |
| Artifacts + drafts  |        |      |      |
| Settings            |        |      |      |
| Mobile width sanity |        |      |      |
