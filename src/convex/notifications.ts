import { v } from 'convex/values';
import { getOptionalAuthUserId, requireAuthUserId } from './authHelpers';
import { mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';

const notificationTypeValue = v.union(
	v.literal('external_context_import'),
	v.literal('ai_chat_activity')
);
const notificationStateValue = v.union(
	v.literal('activity'),
	v.literal('success'),
	v.literal('failed'),
	v.literal('in_progress')
);
const notificationTargetKindValue = v.union(
	v.literal('externalContextImportDraft'),
	v.literal('chatThread'),
	v.literal('artifact'),
	v.literal('project')
);
const notificationMetadataValue = v.record(v.string(), v.any());

type CreateNotificationForOwnerArgs = {
	ownerId: Id<'users'>;
	type: 'external_context_import' | 'ai_chat_activity';
	state: 'activity' | 'success' | 'failed' | 'in_progress';
	title: string;
	body?: string;
	targetKind: 'externalContextImportDraft' | 'chatThread' | 'artifact' | 'project';
	targetId: string;
	metadata?: Record<string, unknown>;
	createdAt?: number;
};

export const createNotification = mutation({
	args: {
		type: notificationTypeValue,
		state: notificationStateValue,
		title: v.string(),
		body: v.optional(v.string()),
		targetKind: notificationTargetKindValue,
		targetId: v.string(),
		metadata: v.optional(notificationMetadataValue),
		createdAt: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const notificationId = await createNotificationForOwner(ctx, {
			ownerId,
			type: args.type,
			state: args.state,
			title: args.title,
			body: args.body,
			targetKind: args.targetKind,
			targetId: args.targetId,
			metadata: args.metadata,
			createdAt: args.createdAt
		});

		return { notificationId };
	}
});

export const listNotifications = query({
	args: {
		limit: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const ownerId = await getOptionalAuthUserId(ctx);
		if (!ownerId) return [];

		const limit = Math.max(1, Math.min(50, Math.floor(args.limit ?? 20)));
		const rows = await ctx.db
			.query('notifications')
			.withIndex('by_ownerId_and_createdAt', (q) => q.eq('ownerId', ownerId))
			.order('desc')
			.take(limit * 3);

		return rows
			.filter((row) => row.status !== 'dismissed' && row.status !== 'deleted')
			.slice(0, limit);
	}
});

export const countUnreadNotifications = query({
	args: {},
	handler: async (ctx) => {
		const ownerId = await getOptionalAuthUserId(ctx);
		if (!ownerId) return { count: 0 };

		const rows = await ctx.db
			.query('notifications')
			.withIndex('by_ownerId_and_status_and_createdAt', (q) =>
				q.eq('ownerId', ownerId).eq('status', 'unread')
			)
			.collect();

		return { count: rows.length };
	}
});

export const markNotificationRead = mutation({
	args: {
		notificationId: v.id('notifications')
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const notification = await getOwnedNotification(ctx, args.notificationId, ownerId);
		if (notification.status !== 'unread') return { ok: true };

		const now = Date.now();
		await ctx.db.patch(notification._id, {
			status: 'read',
			readAt: now,
			updatedAt: now
		});

		return { ok: true };
	}
});

export const markAllNotificationsRead = mutation({
	args: {},
	handler: async (ctx) => {
		const ownerId = await requireAuthUserId(ctx);
		const rows = await ctx.db
			.query('notifications')
			.withIndex('by_ownerId_and_status_and_createdAt', (q) =>
				q.eq('ownerId', ownerId).eq('status', 'unread')
			)
			.collect();
		const now = Date.now();

		for (const row of rows) {
			await ctx.db.patch(row._id, {
				status: 'read',
				readAt: row.readAt ?? now,
				updatedAt: now
			});
		}

		return { ok: true, updated: rows.length };
	}
});

export const dismissNotification = mutation({
	args: {
		notificationId: v.id('notifications')
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const notification = await getOwnedNotification(ctx, args.notificationId, ownerId);
		const now = Date.now();

		await ctx.db.patch(notification._id, {
			status: 'dismissed',
			dismissedAt: now,
			...(notification.readAt ? {} : { readAt: now }),
			updatedAt: now
		});

		return { ok: true };
	}
});

export const deleteNotification = mutation({
	args: {
		notificationId: v.id('notifications')
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const notification = await getOwnedNotification(ctx, args.notificationId, ownerId);
		const now = Date.now();

		await ctx.db.patch(notification._id, {
			status: 'deleted',
			deletedAt: now,
			...(notification.readAt ? {} : { readAt: now }),
			updatedAt: now
		});

		return { ok: true };
	}
});

export async function createNotificationForOwner(
	ctx: MutationCtx,
	args: CreateNotificationForOwnerArgs
) {
	const title = args.title.trim();
	const body = args.body?.trim();
	const targetId = args.targetId.trim();

	if (!title) throw new Error('Notification title is required');
	if (!targetId) throw new Error('Notification target is required');

	const now = args.createdAt ?? Date.now();
	return await ctx.db.insert('notifications', {
		ownerId: args.ownerId,
		type: args.type,
		state: args.state,
		status: 'unread',
		title,
		...(body ? { body } : {}),
		targetKind: args.targetKind,
		targetId,
		...(args.metadata ? { metadata: args.metadata } : {}),
		createdAt: now,
		updatedAt: now
	});
}

async function getOwnedNotification(
	ctx: MutationCtx,
	notificationId: Id<'notifications'>,
	ownerId: Id<'users'>
) {
	const notification = await ctx.db.get(notificationId);
	if (!notification || notification.ownerId !== ownerId) {
		throw new Error('Notification not found');
	}
	return notification;
}
