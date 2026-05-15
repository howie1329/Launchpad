import { v } from 'convex/values';
import { getOptionalAuthUserId, requireAuthUserId } from './authHelpers';
import { mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import type { WorkspaceTabTarget } from './workspaceTabs';

function tabTargetMatchesDeletedEntity(
	target: WorkspaceTabTarget,
	deleted: {
		projectId?: Id<'projects'>;
		threadId?: Id<'chatThreads'>;
		artifactId?: Id<'artifacts'>;
	}
) {
	if (target.kind === 'project') return target.projectId === deleted.projectId;
	if (target.kind === 'thread') {
		return target.threadId === deleted.threadId;
	}
	if (target.kind === 'artifact') return target.artifactId === deleted.artifactId;
	return false;
}

async function removeWorkspaceTabsForDeletedEntity(
	ctx: MutationCtx,
	ownerId: Id<'users'>,
	deleted: {
		projectId?: Id<'projects'>;
		threadId?: Id<'chatThreads'>;
		artifactId?: Id<'artifacts'>;
	}
) {
	const strip = await ctx.db
		.query('workspaceTabStrip')
		.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
		.unique();
	if (!strip) return;

	const tabs = strip.tabs.filter(
		(tab) => !tabTargetMatchesDeletedEntity(tab.target as WorkspaceTabTarget, deleted)
	);
	if (tabs.length === strip.tabs.length) return;

	if (tabs.length === 0) {
		await ctx.db.delete(strip._id);
		return;
	}

	const activeTabStillExists = tabs.some((tab) => tab.id === strip.activeTabId);
	await ctx.db.patch(strip._id, {
		tabs,
		activeTabId: activeTabStillExists ? strip.activeTabId : tabs[0]!.id,
		updatedAt: Date.now()
	});
}

/** Delete a single artifact: versions, memory sync, links, then artifact. */
async function deleteArtifactAndEdges(
	ctx: MutationCtx,
	ownerId: Id<'users'>,
	artifactId: Id<'artifacts'>
) {
	const art = await ctx.db.get(artifactId);
	if (!art || art.ownerId !== ownerId) return;

	const versions = await ctx.db
		.query('artifactVersions')
		.withIndex('by_artifactId_and_versionNumber', (q) => q.eq('artifactId', artifactId))
		.collect();
	for (const version of versions) {
		await ctx.db.delete(version._id);
	}

	const mem = await ctx.db
		.query('memorySyncs')
		.withIndex('by_sourceType_and_sourceId', (q) =>
			q.eq('sourceType', 'artifact').eq('sourceId', artifactId as string)
		)
		.unique();
	if (mem) {
		await ctx.db.delete(mem._id);
	}

	const links = await ctx.db
		.query('threadArtifactLinks')
		.withIndex('by_artifactId_and_updatedAt', (q) => q.eq('artifactId', artifactId))
		.collect();
	for (const l of links) {
		if (l.ownerId === ownerId) await ctx.db.delete(l._id);
	}

	await ctx.db.delete(artifactId);
	await removeWorkspaceTabsForDeletedEntity(ctx, ownerId, { artifactId });
}

/**
 * Remove thread, messages, usage, links, and artifacts for this thread.
 * Does not remove the project row if project-scoped.
 */
async function deleteThreadCascade(
	ctx: MutationCtx,
	ownerId: Id<'users'>,
	threadId: Id<'chatThreads'>
) {
	const thread = await ctx.db.get(threadId);
	if (!thread || thread.ownerId !== ownerId) {
		throw new Error('Thread not found');
	}

	const linkDocs = await ctx.db
		.query('threadArtifactLinks')
		.withIndex('by_threadId_and_updatedAt', (q) => q.eq('threadId', threadId))
		.collect();
	const artifactIds = new Set<Id<'artifacts'>>();
	for (const l of linkDocs) {
		artifactIds.add(l.artifactId);
	}
	const fromSource = await ctx.db
		.query('artifacts')
		.withIndex('by_sourceThreadId_and_updatedAt', (q) => q.eq('sourceThreadId', threadId))
		.collect();
	for (const a of fromSource) {
		artifactIds.add(a._id);
	}

	for (const l of linkDocs) {
		if (l.ownerId === ownerId) await ctx.db.delete(l._id);
	}

	for (const aid of artifactIds) {
		await deleteArtifactAndEdges(ctx, ownerId, aid);
	}

	const messages = await ctx.db
		.query('chatMessages')
		.withIndex('by_threadId_and_sequence', (q) => q.eq('threadId', threadId))
		.collect();
	for (const m of messages) {
		await ctx.db.delete(m._id);
	}

	const usage = await ctx.db
		.query('aiUsageEvents')
		.withIndex('by_ownerId_and_createdAt', (q) => q.eq('ownerId', ownerId))
		.filter((q) => q.eq(q.field('threadId'), threadId))
		.collect();
	for (const u of usage) {
		await ctx.db.delete(u._id);
	}

	await ctx.db.delete(threadId);
	await removeWorkspaceTabsForDeletedEntity(ctx, ownerId, { threadId });
}

async function wipeAllAppDataForUser(ctx: MutationCtx, ownerId: Id<'users'>) {
	const threads = await ctx.db
		.query('chatThreads')
		.withIndex('by_ownerId_and_updatedAt', (q) => q.eq('ownerId', ownerId))
		.collect();
	for (const t of threads) {
		// Re-fetch ownership is redundant but keeps semantics clear
		await deleteThreadCascade(ctx, ownerId, t._id);
	}

	const projects = await ctx.db
		.query('projects')
		.withIndex('by_ownerId_and_updatedAt', (q) => q.eq('ownerId', ownerId))
		.collect();
	for (const p of projects) {
		await ctx.db.delete(p._id);
	}

	const looseArtifacts = await ctx.db
		.query('artifacts')
		.withIndex('by_ownerId_and_updatedAt', (q) => q.eq('ownerId', ownerId))
		.collect();
	for (const a of looseArtifacts) {
		await deleteArtifactAndEdges(ctx, ownerId, a._id);
	}

	const userSettings = await ctx.db
		.query('userSettings')
		.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
		.unique();
	if (userSettings) {
		await ctx.db.delete(userSettings._id);
	}

	const workspaceTabStrip = await ctx.db
		.query('workspaceTabStrip')
		.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
		.unique();
	if (workspaceTabStrip) {
		await ctx.db.delete(workspaceTabStrip._id);
	}

	const events = await ctx.db
		.query('activityEvents')
		.withIndex('by_ownerId_and_createdAt', (q) => q.eq('ownerId', ownerId))
		.collect();
	for (const e of events) {
		await ctx.db.delete(e._id);
	}

	const daily = await ctx.db
		.query('aiDailyUsage')
		.withIndex('by_ownerId_and_dateKey', (q) => q.eq('ownerId', ownerId))
		.collect();
	for (const d of daily) {
		await ctx.db.delete(d._id);
	}

	const anyUsage = await ctx.db
		.query('aiUsageEvents')
		.withIndex('by_ownerId_and_createdAt', (q) => q.eq('ownerId', ownerId))
		.collect();
	for (const u of anyUsage) {
		await ctx.db.delete(u._id);
	}

	const anyVersions = await ctx.db
		.query('artifactVersions')
		.withIndex('by_ownerId_and_updatedAt', (q) => q.eq('ownerId', ownerId))
		.collect();
	for (const version of anyVersions) {
		await ctx.db.delete(version._id);
	}

	const anyMem = await ctx.db
		.query('memorySyncs')
		.withIndex('by_ownerId_and_updatedAt', (q) => q.eq('ownerId', ownerId))
		.collect();
	for (const m of anyMem) {
		await ctx.db.delete(m._id);
	}

	const anyLinks = await ctx.db
		.query('threadArtifactLinks')
		.filter((q) => q.eq(q.field('ownerId'), ownerId))
		.collect();
	for (const l of anyLinks) {
		await ctx.db.delete(l._id);
	}
}

async function deleteAuthIdentityForUser(ctx: MutationCtx, userId: Id<'users'>) {
	const user = await ctx.db.get(userId);
	if (!user) {
		return;
	}

	const sessions = await ctx.db
		.query('authSessions')
		.withIndex('userId', (q) => q.eq('userId', userId))
		.collect();

	for (const session of sessions) {
		const refreshTokens = await ctx.db
			.query('authRefreshTokens')
			.withIndex('sessionId', (q) => q.eq('sessionId', session._id))
			.collect();
		for (const rt of refreshTokens) {
			await ctx.db.delete(rt._id);
		}
		const verifiers = await ctx.db
			.query('authVerifiers')
			.filter((q) => q.eq(q.field('sessionId'), session._id))
			.collect();
		for (const ver of verifiers) {
			await ctx.db.delete(ver._id);
		}
		await ctx.db.delete(session._id);
	}

	const accounts = await ctx.db
		.query('authAccounts')
		.withIndex('userIdAndProvider', (q) => q.eq('userId', userId))
		.collect();
	for (const acc of accounts) {
		const codes = await ctx.db
			.query('authVerificationCodes')
			.withIndex('accountId', (q) => q.eq('accountId', acc._id))
			.collect();
		for (const c of codes) {
			await ctx.db.delete(c._id);
		}
		await ctx.db.delete(acc._id);
	}

	if (user.email) {
		const rl = await ctx.db
			.query('authRateLimits')
			.withIndex('identifier', (q) => q.eq('identifier', user.email!))
			.first();
		if (rl) await ctx.db.delete(rl._id);
	}
	if (user.phone) {
		const rl = await ctx.db
			.query('authRateLimits')
			.withIndex('identifier', (q) => q.eq('identifier', user.phone!))
			.first();
		if (rl) await ctx.db.delete(rl._id);
	}

	await ctx.db.delete(userId);
}

export const resetAccount = mutation({
	args: {},
	handler: async (ctx) => {
		const ownerId = await requireAuthUserId(ctx);
		await wipeAllAppDataForUser(ctx, ownerId);
		return { ok: true as const };
	}
});

export const deleteAccount = mutation({
	args: {},
	handler: async (ctx) => {
		const ownerId = await requireAuthUserId(ctx);
		await wipeAllAppDataForUser(ctx, ownerId);
		await deleteAuthIdentityForUser(ctx, ownerId);
		return { ok: true as const };
	}
});

export const deleteThread = mutation({
	args: {
		threadId: v.id('chatThreads')
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		await deleteThreadCascade(ctx, ownerId, args.threadId);
		return { ok: true as const };
	}
});

export const deleteProject = mutation({
	args: {
		projectId: v.id('projects')
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const project = await ctx.db.get(args.projectId);
		if (!project || project.ownerId !== ownerId) {
			throw new Error('Project not found');
		}

		const threads = await ctx.db
			.query('chatThreads')
			.withIndex('by_projectId_and_updatedAt', (q) => q.eq('projectId', args.projectId))
			.collect();
		for (const t of threads) {
			await deleteThreadCascade(ctx, ownerId, t._id);
		}

		const projectArtifacts = await ctx.db
			.query('artifacts')
			.withIndex('by_projectId_and_updatedAt', (q) => q.eq('projectId', args.projectId))
			.collect();
		for (const a of projectArtifacts) {
			await deleteArtifactAndEdges(ctx, ownerId, a._id);
		}

		await ctx.db.delete(args.projectId);
		await removeWorkspaceTabsForDeletedEntity(ctx, ownerId, { projectId: args.projectId });
		return { ok: true as const };
	}
});

export const isAccountDeletable = query({
	args: {},
	handler: async (ctx) => {
		const ownerId = await getOptionalAuthUserId(ctx);
		if (!ownerId) return { deletable: false as const };
		return { deletable: true as const };
	}
});
