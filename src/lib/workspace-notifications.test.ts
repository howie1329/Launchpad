import { describe, expect, it } from 'vitest';

import type { SavedNotification } from './notifications';
import {
	missingNotificationTargetMessage,
	notificationHref,
	notificationStateClasses,
	notificationStateLabel,
	primaryNotificationActionLabel
} from './workspace-notifications';

function notification(overrides: Partial<SavedNotification>): SavedNotification {
	return {
		_id: 'notification1',
		_creationTime: 1,
		ownerId: 'user1',
		type: 'ai_chat_activity',
		state: 'activity',
		status: 'unread',
		title: 'Update',
		targetKind: 'chatThread',
		targetId: 'thread1',
		createdAt: 1,
		updatedAt: 1,
		...overrides
	} as SavedNotification;
}

describe('workspace notification helpers', () => {
	it('builds hrefs only for available workspace targets', () => {
		expect(
			notificationHref(notification({ targetKind: 'chatThread', targetId: 'thread1' }), {
				threadIds: new Set(['thread1'])
			})
		).toBe('/workspace/thread/thread1');
		expect(
			notificationHref(notification({ targetKind: 'chatThread', targetId: 'missing' }), {
				threadIds: new Set(['thread1'])
			})
		).toBeNull();
		expect(
			notificationHref(notification({ targetKind: 'project', targetId: 'project1' }), {
				projectIds: new Set(['project1'])
			})
		).toBe('/workspace/project/project1');
		expect(
			notificationHref(notification({ targetKind: 'artifact', targetId: 'artifact1' }), {
				artifactIds: new Set(['artifact1'])
			})
		).toBe('/workspace/artifacts/artifact1');
	});

	it('keeps import draft notifications routable without local list membership', () => {
		expect(
			notificationHref(
				notification({
					type: 'external_context_import',
					targetKind: 'externalContextImportDraft',
					targetId: 'draft1'
				})
			)
		).toBe('/workspace/imports/external-context/draft1');
	});

	it('returns action labels for external import states and workspace targets', () => {
		expect(
			primaryNotificationActionLabel(
				notification({ type: 'external_context_import', state: 'success' })
			)
		).toBe('Review');
		expect(
			primaryNotificationActionLabel(
				notification({ type: 'external_context_import', state: 'failed' })
			)
		).toBe('Retry');
		expect(primaryNotificationActionLabel(notification({ targetKind: 'artifact' }))).toBe(
			'Open artifact'
		);
	});

	it('returns state labels and classes used by the shell', () => {
		expect(notificationStateLabel('success')).toBe('Ready');
		expect(notificationStateLabel('in_progress')).toBe('Working');
		expect(notificationStateClasses('failed')).toContain('text-destructive');
		expect(notificationStateClasses('activity')).toContain('text-muted-foreground');
	});

	it('explains missing targets', () => {
		expect(missingNotificationTargetMessage(notification({ targetKind: 'chatThread' }))).toBe(
			'That notification target is no longer available.'
		);
		expect(
			missingNotificationTargetMessage(notification({ targetKind: 'externalContextImportDraft' }))
		).toBe('That import draft is no longer available.');
	});
});
