import { v } from 'convex/values';
import { requireAuthUserId } from './authHelpers';
import { createNotificationForOwner } from './notifications';
import { mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

const providerValue = v.union(v.literal('github'), v.literal('linear'));
const sourceKindValue = v.union(
	v.literal('github_repository'),
	v.literal('linear_project'),
	v.literal('linear_team')
);
const statusValue = v.union(
	v.literal('active'),
	v.literal('disabled'),
	v.literal('needs_attention')
);
const triggerConfigValue = v.record(v.string(), v.any());

export const listForProject = query({
	args: {
		projectId: v.id('projects')
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		await getOwnedProject(ctx, args.projectId, ownerId);

		return await ctx.db
			.query('launchpadActions')
			.withIndex('by_projectId_and_createdAt', (q) => q.eq('projectId', args.projectId))
			.order('desc')
			.collect();
	}
});

export const listProjectActivity = query({
	args: {
		projectId: v.id('projects'),
		limit: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		await getOwnedProject(ctx, args.projectId, ownerId);
		const limit = Math.max(1, Math.min(100, Math.floor(args.limit ?? 25)));

		return await ctx.db
			.query('projectActivityEvents')
			.withIndex('by_projectId_and_createdAt', (q) => q.eq('projectId', args.projectId))
			.order('desc')
			.take(limit);
	}
});

export const getAction = query({
	args: {
		actionId: v.id('launchpadActions')
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const action = await ctx.db.get(args.actionId);
		if (!action || action.ownerId !== ownerId) return null;
		return action;
	}
});

export const createAction = mutation({
	args: {
		projectId: v.id('projects'),
		provider: providerValue,
		sourceKind: sourceKindValue,
		sourceId: v.string(),
		sourceName: v.string(),
		triggerSlug: v.string(),
		triggerId: v.string(),
		connectedAccountId: v.optional(v.string()),
		triggerConfig: v.optional(triggerConfigValue)
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		await getOwnedProject(ctx, args.projectId, ownerId);

		const sourceId = args.sourceId.trim();
		const sourceName = args.sourceName.trim();
		const triggerSlug = args.triggerSlug.trim();
		const triggerId = args.triggerId.trim();

		if (!sourceId) throw new Error('Source id is required');
		if (!sourceName) throw new Error('Source name is required');
		if (!triggerSlug) throw new Error('Trigger slug is required');
		if (!triggerId) throw new Error('Composio trigger id is required');

		const now = Date.now();
		const actionId = await ctx.db.insert('launchpadActions', {
			ownerId,
			projectId: args.projectId,
			provider: args.provider,
			sourceKind: args.sourceKind,
			sourceId,
			sourceName,
			triggerSlug,
			triggerId,
			...(args.connectedAccountId?.trim()
				? { connectedAccountId: args.connectedAccountId.trim() }
				: {}),
			...(args.triggerConfig ? { triggerConfig: args.triggerConfig } : {}),
			status: 'active',
			createdAt: now,
			updatedAt: now
		});

		return { actionId };
	}
});

export const setActionStatus = mutation({
	args: {
		actionId: v.id('launchpadActions'),
		status: statusValue,
		statusReason: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const action = await getOwnedAction(ctx, args.actionId, ownerId);
		const now = Date.now();
		const statusReason = args.statusReason?.trim();

		await ctx.db.patch(action._id, {
			status: args.status,
			...(statusReason ? { statusReason } : { statusReason: undefined }),
			...(args.status === 'disabled' ? { disabledAt: now } : { disabledAt: undefined }),
			updatedAt: now
		});

		return { ok: true as const };
	}
});

export const deleteAction = mutation({
	args: {
		actionId: v.id('launchpadActions')
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const action = await getOwnedAction(ctx, args.actionId, ownerId);
		await ctx.db.delete(action._id);
		return { ok: true as const };
	}
});

export const recordWebhookActivity = mutation({
	args: {
		webhookSecret: v.string(),
		triggerId: v.string(),
		externalEventId: v.string(),
		eventType: v.string(),
		actor: v.optional(v.string()),
		title: v.string(),
		externalUrl: v.optional(v.string()),
		summary: v.optional(v.string()),
		metadata: v.optional(v.record(v.string(), v.any())),
		createdAt: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		requireWebhookSecret(args.webhookSecret);
		const triggerId = args.triggerId.trim();
		const externalEventId = args.externalEventId.trim();
		if (!triggerId || !externalEventId) return { status: 'ignored' as const };

		const action = await ctx.db
			.query('launchpadActions')
			.withIndex('by_triggerId', (q) => q.eq('triggerId', triggerId))
			.first();
		if (!action || action.status !== 'active') return { status: 'ignored' as const };

		const existing = await ctx.db
			.query('projectActivityEvents')
			.withIndex('by_actionId_and_externalEventId', (q) =>
				q.eq('actionId', action._id).eq('externalEventId', externalEventId)
			)
			.first();
		if (existing) return { status: 'duplicate' as const, activityEventId: existing._id };

		const eventType = args.eventType.trim() || action.triggerSlug;
		const title = args.title.trim() || `${providerLabel(action.provider)} activity`;
		const actor = args.actor?.trim();
		const externalUrl = args.externalUrl?.trim();
		const summary = args.summary?.trim();
		const now = args.createdAt ?? Date.now();

		const activityEventId = await ctx.db.insert('projectActivityEvents', {
			ownerId: action.ownerId,
			projectId: action.projectId,
			actionId: action._id,
			provider: action.provider,
			externalEventId,
			eventType,
			...(actor ? { actor } : {}),
			title,
			...(externalUrl ? { externalUrl } : {}),
			...(summary ? { summary } : {}),
			...(args.metadata ? { metadata: args.metadata } : {}),
			createdAt: now
		});

		await createNotificationForOwner(ctx, {
			ownerId: action.ownerId as Id<'users'>,
			type: 'external_project_activity',
			state: 'activity',
			title: `${providerLabel(action.provider)}: ${title}`,
			body: summary || `${eventType} captured for ${action.sourceName}`,
			targetKind: 'project',
			targetId: action.projectId,
			metadata: {
				provider: action.provider,
				eventType,
				externalUrl,
				activityEventId,
				actionId: action._id
			},
			createdAt: now
		});

		return { status: 'recorded' as const, activityEventId };
	}
});

export const markActionNeedsAttentionByTrigger = mutation({
	args: {
		webhookSecret: v.string(),
		triggerId: v.string(),
		reason: v.string()
	},
	handler: async (ctx, args) => {
		requireWebhookSecret(args.webhookSecret);
		const triggerId = args.triggerId.trim();
		if (!triggerId) return { status: 'ignored' as const };

		const action = await ctx.db
			.query('launchpadActions')
			.withIndex('by_triggerId', (q) => q.eq('triggerId', triggerId))
			.first();
		if (!action) return { status: 'ignored' as const };

		const now = Date.now();
		const reason = args.reason.trim() || 'This Launchpad Action needs attention.';
		await ctx.db.patch(action._id, {
			status: 'needs_attention',
			statusReason: reason,
			updatedAt: now
		});

		await createNotificationForOwner(ctx, {
			ownerId: action.ownerId as Id<'users'>,
			type: 'external_project_activity',
			state: 'failed',
			title: `${providerLabel(action.provider)} action needs attention`,
			body: reason,
			targetKind: 'project',
			targetId: action.projectId,
			metadata: {
				provider: action.provider,
				actionId: action._id,
				triggerId
			},
			createdAt: now
		});

		return { status: 'updated' as const, actionId: action._id };
	}
});

async function getOwnedProject(
	ctx: QueryCtx | MutationCtx,
	projectId: Id<'projects'>,
	ownerId: string
) {
	const project = await ctx.db.get(projectId);
	if (!project || project.ownerId !== ownerId) {
		throw new Error('Project not found');
	}
	return project;
}

async function getOwnedAction(ctx: MutationCtx, actionId: Id<'launchpadActions'>, ownerId: string) {
	const action = await ctx.db.get(actionId);
	if (!action || action.ownerId !== ownerId) {
		throw new Error('Launchpad Action not found');
	}
	return action;
}

function providerLabel(provider: 'github' | 'linear') {
	return provider === 'github' ? 'GitHub' : 'Linear';
}

function requireWebhookSecret(value: string) {
	const expected = process.env.COMPOSIO_WEBHOOK_SECRET?.trim() ?? '';
	if (!expected || value !== expected) {
		throw new Error('Invalid webhook secret');
	}
}
