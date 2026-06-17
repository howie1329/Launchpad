import { describe, expect, it } from 'vitest';

import {
	isAcceptedEventType,
	normalizeActivity,
	triggerIdFromPayload
} from '$lib/composio-webhook-normalization';

describe('triggerIdFromPayload', () => {
	it('finds trigger ids from normalized metadata id and uuid', () => {
		expect(triggerIdFromPayload({ metadata: { id: 'trigger-id' } }, {})).toBe('trigger-id');
		expect(triggerIdFromPayload({ metadata: { uuid: 'trigger-uuid' } }, {})).toBe('trigger-uuid');
	});

	it('finds trigger ids from raw metadata trigger_id', () => {
		expect(triggerIdFromPayload({}, { metadata: { trigger_id: 'raw-trigger-id' } })).toBe(
			'raw-trigger-id'
		);
	});
});

describe('isAcceptedEventType', () => {
	it('accepts expired and disabled events without a trigger id for caller policy handling', () => {
		expect(isAcceptedEventType('composio.connected_account.expired', '')).toBe(true);
		expect(isAcceptedEventType('composio.trigger.disabled', '')).toBe(true);
	});

	it('ignores unknown events without a trigger id', () => {
		expect(isAcceptedEventType('other.event', '')).toBe(false);
		expect(isAcceptedEventType('other.event', 'trigger-id')).toBe(true);
	});
});

describe('normalizeActivity', () => {
	it('derives title, actor, externalUrl, and summary from GitHub-like payloads', () => {
		const normalized = normalizeActivity(
			{
				payload: {
					action: 'pull_request.opened',
					pull_request: {
						title: 'Add billing guardrails',
						html_url: 'https://github.com/acme/app/pull/1'
					},
					sender: { login: 'octocat' },
					body: 'PR body'
				}
			},
			{ id: 'event-123' },
			'webhook-123'
		);

		expect(normalized).toEqual({
			externalEventId: 'event-123',
			eventType: 'Pull Request.Opened',
			title: 'Add billing guardrails',
			actor: 'octocat',
			externalUrl: 'https://github.com/acme/app/pull/1',
			summary: 'PR body'
		});
	});

	it('truncates summaries to 500 characters', () => {
		const normalized = normalizeActivity(
			{ payload: { type: 'issue_comment', comment: { body: 'a'.repeat(501) } } },
			{},
			'webhook-123'
		);

		expect(normalized.summary).toHaveLength(500);
	});
});
