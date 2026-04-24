import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { getOptionalAuthUserId, requireAuthUserId } from './authHelpers';
import { workspaceTabTarget } from './workspaceTabValidators';

export const MAX_WORKSPACE_TABS = 20;

export type WorkspaceTabTarget =
	| { kind: 'home' }
	| { kind: 'settings' }
	| { kind: 'project'; projectId: Id<'projects'> }
	| { kind: 'thread'; threadId: Id<'chatThreads'>; projectId?: Id<'projects'> }
	| { kind: 'artifact'; artifactId: Id<'artifacts'> };

function newTabId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function workspaceTabTargetsEqual(a: WorkspaceTabTarget, b: WorkspaceTabTarget): boolean {
	if (a.kind !== b.kind) return false;
	if (a.kind === 'home' && b.kind === 'home') return true;
	if (a.kind === 'settings' && b.kind === 'settings') return true;
	if (a.kind === 'project' && b.kind === 'project') return a.projectId === b.projectId;
	if (a.kind === 'artifact' && b.kind === 'artifact') return a.artifactId === b.artifactId;
	if (a.kind === 'thread' && b.kind === 'thread') {
		return a.threadId === b.threadId && a.projectId === b.projectId;
	}
	return false;
}

async function assertTargetAccess(
	ctx: MutationCtx,
	ownerId: Id<'users'>,
	target: WorkspaceTabTarget
) {
	if (target.kind === 'home' || target.kind === 'settings') return;
	if (target.kind === 'project') {
		const p = await ctx.db.get(target.projectId);
		if (!p || p.ownerId !== ownerId) {
			throw new Error('Project not found');
		}
		return;
	}
	if (target.kind === 'thread') {
		const t = (await ctx.db.get(target.threadId)) as {
			ownerId: string;
			projectId?: Id<'projects'>;
		} | null;
		if (!t || t.ownerId !== ownerId) {
			throw new Error('Thread not found');
		}
		if (target.projectId) {
			if (t.projectId !== target.projectId) {
				throw new Error('Thread does not match project');
			}
		} else if (t.projectId) {
			throw new Error('Thread is project-scoped; project id required');
		}
		return;
	}
	if (target.kind === 'artifact') {
		const a = await ctx.db.get(target.artifactId);
		if (!a || a.ownerId !== ownerId) {
			throw new Error('Artifact not found');
		}
	}
}

export const getMine = query({
	args: {},
	handler: async (ctx) => {
		const ownerId = await getOptionalAuthUserId(ctx);
		if (!ownerId) return null;
		return await ctx.db
			.query('workspaceTabStrip')
			.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
			.unique();
	}
});

export const addOrActivate = mutation({
	args: { target: workspaceTabTarget },
	handler: async (ctx, { target }): Promise<{ tabId: string }> => {
		const ownerId = await requireAuthUserId(ctx);
		await assertTargetAccess(ctx, ownerId, target as WorkspaceTabTarget);

		const now = Date.now();
		const existing = await ctx.db
			.query('workspaceTabStrip')
			.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
			.unique();

		if (!existing) {
			const tabId = newTabId();
			await ctx.db.insert('workspaceTabStrip', {
				ownerId,
				tabs: [{ id: tabId, target: target as WorkspaceTabTarget }],
				activeTabId: tabId,
				createdAt: now,
				updatedAt: now
			});
			return { tabId };
		}

		const idx = existing.tabs.findIndex((t) =>
			workspaceTabTargetsEqual(t.target as WorkspaceTabTarget, target as WorkspaceTabTarget)
		);
		if (idx >= 0) {
			const tabId = existing.tabs[idx].id;
			if (existing.activeTabId !== tabId) {
				await ctx.db.patch(existing._id, { activeTabId: tabId, updatedAt: now });
			}
			return { tabId };
		}

		if (existing.tabs.length >= MAX_WORKSPACE_TABS) {
			throw new Error(`At most ${MAX_WORKSPACE_TABS} workspace tabs.`);
		}

		const tabId = newTabId();
		const tabs = [...existing.tabs, { id: tabId, target: target as WorkspaceTabTarget }];
		await ctx.db.patch(existing._id, {
			tabs,
			activeTabId: tabId,
			updatedAt: now
		});
		return { tabId };
	}
});

export const removeTab = mutation({
	args: { tabId: v.string() },
	handler: async (ctx, { tabId }) => {
		const ownerId = await requireAuthUserId(ctx);
		const now = Date.now();
		const doc = await ctx.db
			.query('workspaceTabStrip')
			.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
			.unique();
		if (!doc) return { removed: false as const, activeTarget: null };

		const i = doc.tabs.findIndex((t) => t.id === tabId);
		if (i < 0) return { removed: false as const, activeTarget: null };

		const wasActive = doc.activeTabId === tabId;
		let tabs = doc.tabs.filter((t) => t.id !== tabId);
		let activeTabId = doc.activeTabId;
		if (wasActive) {
			const newIdx = Math.min(i, Math.max(0, tabs.length - 1));
			if (tabs.length === 0) {
				const hId = newTabId();
				tabs = [{ id: hId, target: { kind: 'home' } }];
				activeTabId = hId;
			} else {
				activeTabId = tabs[newIdx]!.id;
			}
		}
		await ctx.db.patch(doc._id, { tabs, activeTabId, updatedAt: now });
		if (!wasActive) {
			return { removed: true as const, activeTarget: null };
		}
		const active = tabs.find((t) => t.id === activeTabId);
		return {
			removed: true as const,
			activeTarget: (active?.target as WorkspaceTabTarget) ?? { kind: 'home' as const }
		};
	}
});
