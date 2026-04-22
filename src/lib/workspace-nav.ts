import { resolve } from '$app/paths';
import type { Id } from '../convex/_generated/dataModel';
import type { SavedChatThread } from '$lib/chat';

export function workspaceRootHref() {
	return resolve('/workspace');
}

export function workspaceSettingsHref() {
	return resolve('/workspace/settings');
}

export function workspaceProjectHref(projectId: string | Id<'projects'>) {
	return resolve(
		`/workspace?project=${encodeURIComponent(String(projectId))}` as '/workspace?${string}'
	);
}

/**
 * Resolves a thread the same way as the workspace sidebar: project-scoped threads
 * include `project` + `thread`; general threads are `thread` only.
 */
export function workspaceThreadHref(thread: Pick<SavedChatThread, '_id' | 'projectId'>) {
	if (thread.projectId) {
		return resolve(
			`/workspace?project=${encodeURIComponent(String(thread.projectId))}&thread=${encodeURIComponent(String(thread._id))}` as '/workspace?${string}'
		);
	}
	return resolve(
		`/workspace?thread=${encodeURIComponent(String(thread._id))}` as '/workspace?${string}'
	);
}

/** `thread` + optional `context=1` for the thread context panel (see workspace layout). */
export function workspaceThreadViewHref(args: {
	threadId: string;
	projectId?: string | null;
	withContext?: boolean;
}) {
	const p = new URLSearchParams();
	if (args.projectId) p.set('project', String(args.projectId));
	p.set('thread', args.threadId);
	if (args.withContext) p.set('context', '1');
	return resolve(`/workspace?${p.toString()}` as '/workspace?${string}');
}

export function workspaceArtifactHref(artifactId: string | Id<'artifacts'>) {
	return resolve(
		`/workspace/artifacts/${encodeURIComponent(String(artifactId))}` as `/workspace/artifacts/${string}`
	);
}
