import { makeFunctionReference } from 'convex/server';
import type { Id } from '../convex/_generated/dataModel';

export type NotificationType =
	| 'external_context_import'
	| 'ai_chat_activity'
	| 'external_project_activity';
export type NotificationState = 'activity' | 'success' | 'failed' | 'in_progress';
export type NotificationStatus = 'unread' | 'read' | 'dismissed' | 'deleted';
export type NotificationTargetKind =
	| 'externalContextImportDraft'
	| 'chatThread'
	| 'artifact'
	| 'project';

export type SavedNotification = {
	_id: Id<'notifications'>;
	_creationTime: number;
	ownerId: Id<'users'>;
	type: NotificationType;
	state: NotificationState;
	status: NotificationStatus;
	title: string;
	body?: string;
	targetKind: NotificationTargetKind;
	targetId: string;
	metadata?: Record<string, unknown>;
	createdAt: number;
	updatedAt: number;
	readAt?: number;
	dismissedAt?: number;
	deletedAt?: number;
};

export type CreateNotificationArgs = {
	type: NotificationType;
	state: NotificationState;
	title: string;
	body?: string;
	targetKind: NotificationTargetKind;
	targetId: string;
	metadata?: Record<string, unknown>;
	createdAt?: number;
};

export const createNotificationMutation = makeFunctionReference<
	'mutation',
	CreateNotificationArgs,
	{ notificationId: Id<'notifications'> }
>('notifications:createNotification');

export const listNotificationsQuery = makeFunctionReference<
	'query',
	{ limit?: number },
	SavedNotification[]
>('notifications:listNotifications');

export const countUnreadNotificationsQuery = makeFunctionReference<
	'query',
	Record<string, never>,
	{ count: number }
>('notifications:countUnreadNotifications');

export const markNotificationReadMutation = makeFunctionReference<
	'mutation',
	{ notificationId: Id<'notifications'> },
	{ ok: true }
>('notifications:markNotificationRead');

export const markAllNotificationsReadMutation = makeFunctionReference<
	'mutation',
	Record<string, never>,
	{ ok: true; updated: number }
>('notifications:markAllNotificationsRead');

export const dismissNotificationMutation = makeFunctionReference<
	'mutation',
	{ notificationId: Id<'notifications'> },
	{ ok: true }
>('notifications:dismissNotification');

export const deleteNotificationMutation = makeFunctionReference<
	'mutation',
	{ notificationId: Id<'notifications'> },
	{ ok: true }
>('notifications:deleteNotification');
