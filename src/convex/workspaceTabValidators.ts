import { v } from 'convex/values';

/** Canonical workspace destination; matches URL routing in `src/lib/workspace-route-contract.ts`. */
export const workspaceTabTarget = v.union(
	v.object({ kind: v.literal('home') }),
	v.object({ kind: v.literal('settings') }),
	v.object({ kind: v.literal('project'), projectId: v.id('projects') }),
	v.object({ kind: v.literal('thread'), threadId: v.id('chatThreads') }),
	v.object({ kind: v.literal('artifact'), artifactId: v.id('artifacts') })
);

export const workspaceTabEntry = v.object({
	id: v.string(),
	target: workspaceTabTarget
});
