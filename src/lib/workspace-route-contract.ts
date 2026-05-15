import { resolve } from '$app/paths';
import type { SavedArtifact } from '$lib/artifacts';
import type { SavedChatThread } from '$lib/chat';
import type { SavedProject } from '$lib/projects';
import { formatThreadTitleForDisplay } from '$lib/thread-title';
import type { Id } from '../convex/_generated/dataModel';
import type { WorkspaceTabTarget } from './workspaceTabs';

export function workspaceRootHref() {
	return resolve('/workspace');
}

export function workspaceSettingsHref() {
	return resolve('/workspace/settings');
}

export function workspaceProjectHref(projectId: string | Id<'projects'>) {
	return resolve(
		`/workspace/project/${encodeURIComponent(String(projectId))}` as `/workspace/project/${string}`
	);
}

export function workspaceThreadHref(
	thread: string | Id<'chatThreads'> | Pick<SavedChatThread, '_id'>
) {
	const threadId = typeof thread === 'string' ? thread : String(thread._id);
	return resolve(
		`/workspace/thread/${encodeURIComponent(threadId)}` as `/workspace/thread/${string}`
	);
}

export function workspaceThreadViewHref(args: { threadId: string; withContext?: boolean }) {
	const p = new URLSearchParams();
	if (args.withContext) p.set('context', '1');
	const query = p.toString();
	const base = workspaceThreadHref(args.threadId);
	return query ? resolve(`${base}?${query}` as `/workspace/thread/${string}?${string}`) : base;
}

export function workspaceArtifactHref(artifactId: string | Id<'artifacts'>) {
	return resolve(
		`/workspace/artifacts/${encodeURIComponent(String(artifactId))}` as `/workspace/artifacts/${string}`
	);
}

/** Parse current URL to a tab target. Ignores `context` and other non-identity search params. */
export function urlToWorkspaceTarget(url: URL): WorkspaceTabTarget | null {
	const path = url.pathname;
	if (path === '/workspace/settings') {
		return { kind: 'settings' };
	}
	const projectMatch = /^\/workspace\/project\/([^/]+)\/?$/.exec(path);
	if (projectMatch?.[1]) {
		return { kind: 'project', projectId: projectMatch[1] as Id<'projects'> };
	}
	const threadMatch = /^\/workspace\/thread\/([^/]+)\/?$/.exec(path);
	if (threadMatch?.[1]) {
		return { kind: 'thread', threadId: threadMatch[1] as Id<'chatThreads'> };
	}
	const artifactMatch = /^\/workspace\/artifacts\/([^/]+)\/?$/.exec(path);
	if (artifactMatch?.[1]) {
		return { kind: 'artifact', artifactId: artifactMatch[1] as Id<'artifacts'> };
	}
	if (path !== '/workspace' && path !== '/workspace/') {
		return null;
	}
	return { kind: 'home' };
}

export function hrefForWorkspaceTarget(target: WorkspaceTabTarget): string {
	switch (target.kind) {
		case 'home':
			return workspaceRootHref();
		case 'settings':
			return workspaceSettingsHref();
		case 'project':
			return workspaceProjectHref(target.projectId);
		case 'artifact':
			return workspaceArtifactHref(target.artifactId);
		case 'thread': {
			const thread: Pick<SavedChatThread, '_id'> = { _id: target.threadId };
			return workspaceThreadHref(thread);
		}
	}
}

export function getWorkspaceTabLabel(
	target: WorkspaceTabTarget,
	data: {
		projects: SavedProject[] | undefined;
		threads: SavedChatThread[] | undefined;
		artifacts: SavedArtifact[] | undefined;
	}
): { label: string; missing: boolean } {
	switch (target.kind) {
		case 'home':
			return { label: 'New chat', missing: false };
		case 'settings':
			return { label: 'Settings', missing: false };
		case 'project': {
			const p = data.projects?.find((x) => x._id === target.projectId);
			return p ? { label: p.name, missing: false } : { label: 'Project', missing: true };
		}
		case 'thread': {
			const th = data.threads?.find((x) => x._id === target.threadId);
			return th
				? { label: formatThreadTitleForDisplay(th.title), missing: false }
				: { label: 'Chat', missing: true };
		}
		case 'artifact': {
			const a = data.artifacts?.find((x) => x._id === target.artifactId);
			return a ? { label: a.title, missing: false } : { label: 'Artifact', missing: true };
		}
	}
}

export function workspaceTargetsEqual(a: WorkspaceTabTarget, b: WorkspaceTabTarget): boolean {
	if (a.kind !== b.kind) return false;
	if (a.kind === 'home' && b.kind === 'home') return true;
	if (a.kind === 'settings' && b.kind === 'settings') return true;
	if (a.kind === 'project' && b.kind === 'project') return a.projectId === b.projectId;
	if (a.kind === 'artifact' && b.kind === 'artifact') return a.artifactId === b.artifactId;
	if (a.kind === 'thread' && b.kind === 'thread') {
		return a.threadId === b.threadId;
	}
	return false;
}
