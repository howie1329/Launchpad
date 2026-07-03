import type { NotificationState, SavedNotification } from '$lib/notifications';
import {
	workspaceArtifactHref,
	workspaceProjectHref,
	workspaceThreadHref
} from '$lib/workspace-route-contract';

type NotificationTargetAvailability = {
	threadIds?: Set<string>;
	projectIds?: Set<string>;
	artifactIds?: Set<string>;
};

export function notificationHref(
	notification: SavedNotification,
	availability: NotificationTargetAvailability = {}
) {
	switch (notification.targetKind) {
		case 'chatThread':
			if (availability.threadIds && !availability.threadIds.has(notification.targetId)) return null;
			return workspaceThreadHref(notification.targetId);
		case 'project':
			if (availability.projectIds && !availability.projectIds.has(notification.targetId))
				return null;
			return workspaceProjectHref(notification.targetId);
		case 'artifact':
			if (availability.artifactIds && !availability.artifactIds.has(notification.targetId)) {
				return null;
			}
			return workspaceArtifactHref(notification.targetId);
		case 'externalContextImportDraft':
			return `/workspace/imports/external-context/${notification.targetId}`;
	}
}

export function primaryNotificationActionLabel(notification: SavedNotification) {
	if (notification.type === 'external_context_import') {
		switch (notification.state) {
			case 'success':
				return 'Review';
			case 'failed':
				return 'Retry';
			case 'in_progress':
				return 'View progress';
			case 'activity':
				return 'Open';
		}
	}

	switch (notification.targetKind) {
		case 'artifact':
			return 'Open artifact';
		case 'project':
			return 'Open project';
		case 'chatThread':
			return 'Open chat';
		case 'externalContextImportDraft':
			return 'Open';
	}
}

export function missingNotificationTargetMessage(notification: SavedNotification) {
	if (notification.targetKind === 'externalContextImportDraft') {
		return 'That import draft is no longer available.';
	}
	return 'That notification target is no longer available.';
}

export function notificationStateClasses(state: NotificationState) {
	switch (state) {
		case 'success':
			return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
		case 'failed':
			return 'border-destructive/30 bg-destructive/10 text-destructive';
		case 'in_progress':
			return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
		case 'activity':
			return 'border-border bg-muted/40 text-muted-foreground';
	}
}

export function notificationStateLabel(state: NotificationState) {
	switch (state) {
		case 'success':
			return 'Ready';
		case 'failed':
			return 'Failed';
		case 'in_progress':
			return 'Working';
		case 'activity':
			return 'Update';
	}
}

export function formatNotificationTime(createdAt: number) {
	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	}).format(new Date(createdAt));
}
