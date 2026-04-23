# Account Management & Sidebar Deletion Plan

## Overview

This plan implements 3 features:
1. **Account Management** - Reset and Delete Account in Danger Zone
2. **Landing Page CTA** - Show "Go to Launchpad" when already signed in
3. **Sidebar Deletion Menus** - Three-dot menus for projects and threads

---

## Agreed Design Decisions

### 1. Account Management

- **Reset Account** (wipe data, keep account):
  - Click button → Dialog: "Are you sure? This is permanent." → Click confirm → Wipes all user data, keeps account → stays logged in

- **Delete Account** (wipe + delete account):
  - Click button → Dialog: "Are you sure? This is permanent." → Click confirm → Wipes all user data + deletes account → logs out → redirect to landing

- Re-registration with same email allowed after deletion

### 2. Landing Page

- Check active session
- If signed in → button says "Go to Launchpad" → redirects to /workspace

### 3. Sidebar Three-Dot Menus

- **Project menu** → "Delete project" → deletes project + cascade deletes all threads + artifacts
- **Thread menu** → "Delete thread" → deletes thread + its artifacts

---

## Implementation

### Feature 1: Account Management (Danger Zone)

#### 1.1 Backend - Convex Mutations

**Files to create:**
- `src/convex/accountManagement.ts` - Mutations for reset and delete

**Mutations:**

| Mutation | Description |
|----------|-------------|
| `resetAccount` | Wipe all user data (userSettings, projects, chatThreads, chatMessages, artifacts, threadArtifactLinks, artifactDraftChanges, aiUsageEvents, aiDailyUsage, activityEvents, memorySyncs). Keep users table entry. Return success. |
| `deleteAccount` | Same as reset + delete from users table. Log out + redirect to landing. |

**Queries needed:**
| Query | Description |
|-------|-------------|
| `isAccountDeletable` | Check if account can be deleted (always true for now) |

#### 1.2 Frontend - Settings Page

**File:** `src/routes/workspace/settings/+page.svelte`

**Add at bottom:**
- Separator
- "Danger Zone" section with two buttons in red/destructive style:
  - "Reset Account" button → opens ResetConfirmDialog
  - "Delete Account" button → opens DeleteConfirmDialog

**Dialogs:** Two dialog components (or single component with props):
- ResetConfirmDialog: Warning text + Cancel + Confirm button
- DeleteConfirmDialog: Warning text + Cancel + Confirm button

**State:**
- `resetDialogOpen: boolean`
- `deleteDialogOpen: boolean`
- `isResetting: boolean`
- `isDeleting: boolean`
- `resetError: string`
- `deleteError: string`

**Actions:**
- On Reset confirm → call `resetAccount` mutation → on success, invalidate queries (refetch data)
- On Delete confirm → call `deleteAccount` mutation → on success, sign out → redirect to /

---

### Feature 2: Landing Page CTA

#### 2.1 Frontend - Landing Page

**File:** `src/routes/+page.svelte`

**Current logic:**
- Uses `AuthControls` component which shows "Sign out" when authenticated

**Changes to AuthControls:**
- File: `src/lib/components/AuthControls.svelte`
- Add prop: `signedInCta?: string` (default: "Go to Launchpad")
- Add prop: `signedInHref?: string` (default: "/workspace")
- When `auth.isAuthenticated`: show link to `signedInHref` with label `signedInCta` instead of Sign out button

**OR** modify landing page directly to check auth state and show different button:

**Landing page changes:**
- Import auth state
- If authenticated: show Button with href="/workspace" and label "Go to Launchpad"
- If not authenticated: show "Sign in" button (current behavior)

---

### Feature 3: Sidebar Three-Dot Menus

#### 3.1 Backend - Convex Mutations

**File:** `src/convex/accountManagement.ts` (add to existing)

**Mutations:**

| Mutation | Description |
|----------|-------------|
| `deleteProject` | Delete project + cascade delete all linked threads + delete all artifacts (via projectId and via sourceThreadId for each thread's artifacts) |
| `deleteThread` | Delete thread + delete all linked messages + delete all linked artifacts + delete threadArtifactLinks |

**Note:** Since 1:1 assumption (artifacts belong to single thread), cascade is straightforward.

#### 3.2 Frontend - Sidebar

**File:** `src/routes/workspace/+layout.svelte`

**Add to project item:**
- Three-dot menu button (MoreHorizontal icon from Hugeicons)
- Dropdown menu with "Delete project" item
- On click → open confirmation dialog

**Add to thread item:**
- Three-dot menu button
- Dropdown menu with "Delete thread" item
- On click → open confirmation dialog

**Dialogs:**
- `projectDeleteDialogOpen: boolean`
- `projectToDelete: { id: string; name: string } | null`
- `threadDeleteDialogOpen: boolean`
- `threadToDelete: { id: string; title: string } | null`
- `isDeletingProject: boolean`
- `isDeletingThread: boolean`

**Styling:**
- Three-dot menu: use shadcn dropdown-menu or popover
- Destructive/red styling for delete actions

---

## File Summary

| File | Change | Description |
|------|--------|-------------|
| `src/convex/accountManagement.ts` | Create | Convex mutations for reset, delete, deleteProject, deleteThread |
| `src/routes/workspace/settings/+page.svelte` | Modify | Add Danger Zone section with reset/delete buttons and dialogs |
| `src/lib/components/AuthControls.svelte` | Modify | Add signedInCta prop for custom label when authenticated |
| `src/routes/+page.svelte` | Modify | Use AuthControls with signedInCta="Go to Launchpad" |
| `src/routes/workspace/+layout.svelte` | Modify | Add three-dot menus to projects and threads in sidebar |

---

## Acceptance Criteria

### Account Reset
- [ ] User clicks "Reset Account" in Danger Zone
- [ ] Confirmation dialog appears with warning text
- [ ] User clicks "Confirm reset"
- [ ] All user data is wiped (projects, threads, artifacts, messages, settings, usage, activity)
- [ ] User stays logged in
- [ ] Workspace reflects empty state

### Account Delete
- [ ] User clicks "Delete Account" in Danger Zone
- [ ] Confirmation dialog appears with warning text
- [ ] User clicks "Confirm delete"
- [ ] All user data is wiped
- [ ] User account is deleted
- [ ] User is logged out
- [ ] Redirected to landing page

### Landing Page CTA
- [ ] When user is already signed in and visits /
- [ ] Button shows "Go to Launchpad" (not "Sign out")
- [ ] Clicking button navigates to /workspace

### Project Deletion
- [ ] Projects show three-dot menu in sidebar
- [ ] Clicking menu shows "Delete project" option
- [ ] Clicking "Delete project" shows confirmation dialog
- [ ] On confirm, project + all threads + all artifacts are deleted
- [ ] Sidebar updates to reflect deletion

### Thread Deletion
- [ ] Threads show three-dot menu in sidebar
- [ ] Clicking menu shows "Delete thread" option
- [ ] Clicking "Delete thread" shows confirmation dialog
- [ ] On confirm, thread + messages + artifacts are deleted
- [ ] Sidebar updates to reflect deletion