import type { Id } from '../convex/_generated/dataModel'
import type { WorkspaceTabTarget } from './workspaceTabs'
import {
	workspaceArtifactHref,
	workspaceProjectHref,
	workspaceRootHref,
	workspaceSettingsHref,
	workspaceThreadHref
} from '$lib/workspace-nav'
import type { SavedChatThread } from '$lib/chat'
import type { SavedProject } from '$lib/projects'
import type { SavedArtifact } from '$lib/artifacts'
import { formatThreadTitleForDisplay } from '$lib/thread-title'

/** Parse current URL to a tab target. Ignores `context` and other non-identity search params. */
export function urlToWorkspaceTarget(url: URL): WorkspaceTabTarget | null {
	const path = url.pathname
	if (path === '/workspace/settings') {
		return { kind: 'settings' }
	}
	const artifactMatch = /^\/workspace\/artifacts\/([^/]+)\/?$/.exec(path)
	if (artifactMatch?.[1]) {
		return { kind: 'artifact', artifactId: artifactMatch[1] as Id<'artifacts'> }
	}
	if (path !== '/workspace' && path !== '/workspace/') {
		return null
	}
	const project = url.searchParams.get('project')?.trim() ?? ''
	const thread = url.searchParams.get('thread')?.trim() ?? ''
	if (thread) {
		return {
			kind: 'thread',
			threadId: thread as Id<'chatThreads'>,
			...(project ? { projectId: project as Id<'projects'> } : {})
		}
	}
	if (project) {
		return { kind: 'project', projectId: project as Id<'projects'> }
	}
	return { kind: 'home' }
}

export function hrefForWorkspaceTarget(target: WorkspaceTabTarget): string {
	switch (target.kind) {
		case 'home':
			return workspaceRootHref()
		case 'settings':
			return workspaceSettingsHref()
		case 'project':
			return workspaceProjectHref(target.projectId)
		case 'artifact':
			return workspaceArtifactHref(target.artifactId)
		case 'thread': {
			const thread: Pick<SavedChatThread, '_id' | 'projectId'> = {
				_id: target.threadId,
				...(target.projectId ? { projectId: target.projectId } : {})
			}
			return workspaceThreadHref(thread)
		}
	}
}

export function getWorkspaceTabLabel(
	target: WorkspaceTabTarget,
	data: {
		projects: SavedProject[] | undefined
		threads: SavedChatThread[] | undefined
		artifacts: SavedArtifact[] | undefined
	}
): { label: string; missing: boolean } {
	switch (target.kind) {
		case 'home':
			return { label: 'New chat', missing: false }
		case 'settings':
			return { label: 'Settings', missing: false }
		case 'project': {
			const p = data.projects?.find((x) => x._id === target.projectId)
			return p ? { label: p.name, missing: false } : { label: 'Project', missing: true }
		}
		case 'thread': {
			const th = data.threads?.find((x) => x._id === target.threadId)
			return th
				? { label: formatThreadTitleForDisplay(th.title), missing: false }
				: { label: 'Chat', missing: true }
		}
		case 'artifact': {
			const a = data.artifacts?.find((x) => x._id === target.artifactId)
			return a ? { label: a.title, missing: false } : { label: 'Artifact', missing: true }
		}
	}
}

export function workspaceTargetsEqual(a: WorkspaceTabTarget, b: WorkspaceTabTarget): boolean {
	if (a.kind !== b.kind) return false
	if (a.kind === 'home' && b.kind === 'home') return true
	if (a.kind === 'settings' && b.kind === 'settings') return true
	if (a.kind === 'project' && b.kind === 'project') return a.projectId === b.projectId
	if (a.kind === 'artifact' && b.kind === 'artifact') return a.artifactId === b.artifactId
	if (a.kind === 'thread' && b.kind === 'thread') {
		return a.threadId === b.threadId && a.projectId === b.projectId
	}
	return false
}
