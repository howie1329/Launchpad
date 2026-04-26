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

export function workspaceThreadViewHref(args: {
	threadId: string;
	withContext?: boolean;
}) {
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
