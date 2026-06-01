import { env } from '$env/dynamic/private';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import {
	markLaunchpadActionNeedsAttentionByTriggerMutation,
	recordLaunchpadActionWebhookActivityMutation
} from '$lib/launchpad-actions';
import { verifyComposioWebhook } from '$lib/server/composio';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { ConvexHttpClient } from 'convex/browser';

type NormalizedWebhookPayload = {
	id?: string;
	triggerSlug?: string;
	toolkitSlug?: string;
	payload?: unknown;
	originalPayload?: unknown;
	metadata?: {
		id?: string;
		triggerSlug?: string;
		toolkitSlug?: string;
		connectedAccount?: {
			id?: string;
			userId?: string;
		};
	};
};

export const POST: RequestHandler = async ({ request }) => {
	const rawBody = await request.text();
	const webhookId = request.headers.get('webhook-id')?.trim() ?? '';
	const webhookTimestamp = request.headers.get('webhook-timestamp')?.trim() ?? '';
	const signature = request.headers.get('webhook-signature')?.trim() ?? '';

	try {
		if (!webhookId || !webhookTimestamp || !signature) {
			return json({ error: 'Invalid webhook signature' }, { status: 401 });
		}

		const verified = await verifyComposioWebhook({
			payload: rawBody,
			signature,
			webhookId,
			webhookTimestamp
		});
		const incoming = verified.payload as NormalizedWebhookPayload;
		const raw = safeJson(rawBody);
		const eventType =
			rawString(raw, ['type']) || incoming.triggerSlug || 'composio.trigger.message';
		const triggerId = triggerIdFromPayload(incoming, raw);

		if (!isAcceptedEventType(eventType)) {
			return json({ ok: true, status: 'ignored' });
		}

		const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);

		if (
			eventType === 'composio.connected_account.expired' ||
			eventType === 'composio.trigger.disabled'
		) {
			if (!triggerId) return json({ ok: true, status: 'ignored' });
			const result = await convex.mutation(markLaunchpadActionNeedsAttentionByTriggerMutation, {
				webhookSecret: composioWebhookSecret(),
				triggerId,
				reason:
					eventType === 'composio.connected_account.expired'
						? 'The connected Composio account expired. Reconnect the app to resume this action.'
						: 'Composio disabled this trigger. Review the action configuration to resume capture.'
			});
			return json({ ok: true, ...result });
		}

		if (!triggerId) {
			return json({ ok: true, status: 'ignored' });
		}

		const normalized = normalizeActivity(incoming, raw, webhookId);
		const result = await convex.mutation(recordLaunchpadActionWebhookActivityMutation, {
			webhookSecret: composioWebhookSecret(),
			triggerId,
			externalEventId: normalized.externalEventId,
			eventType: normalized.eventType,
			title: normalized.title,
			...(normalized.actor ? { actor: normalized.actor } : {}),
			...(normalized.externalUrl ? { externalUrl: normalized.externalUrl } : {}),
			...(normalized.summary ? { summary: normalized.summary } : {}),
			metadata: {
				webhookId,
				triggerSlug: incoming.triggerSlug,
				toolkitSlug: incoming.toolkitSlug,
				receivedEventType: eventType
			},
			createdAt: Date.now()
		});

		return json({ ok: true, ...result });
	} catch (error) {
		console.error('Composio webhook failed', error);
		return json({ error: 'Invalid webhook signature' }, { status: 401 });
	}
};

function isAcceptedEventType(eventType: string) {
	return (
		eventType === 'composio.trigger.message' ||
		eventType === 'composio.connected_account.expired' ||
		eventType === 'composio.trigger.disabled'
	);
}

function composioWebhookSecret() {
	const secret = env.COMPOSIO_WEBHOOK_SECRET?.trim() ?? '';
	if (!secret) throw new Error('Composio webhook secret is not configured');
	return secret;
}

function triggerIdFromPayload(incoming: NormalizedWebhookPayload, raw: unknown) {
	return (
		incoming.metadata?.id ||
		incoming.id ||
		rawString(raw, ['metadata', 'trigger_id']) ||
		rawString(raw, ['data', 'trigger_nano_id']) ||
		rawString(raw, ['data', 'trigger_id'])
	);
}

function normalizeActivity(incoming: NormalizedWebhookPayload, raw: unknown, webhookId: string) {
	const payload = isRecord(incoming.payload) ? incoming.payload : isRecord(raw) ? raw : {};
	const eventType =
		rawString(payload, ['action']) ||
		rawString(payload, ['event_type']) ||
		rawString(payload, ['type']) ||
		incoming.triggerSlug ||
		'External activity';
	const title =
		rawString(payload, ['title']) ||
		rawString(payload, ['name']) ||
		rawString(payload, ['pull_request', 'title']) ||
		rawString(payload, ['issue', 'title']) ||
		rawString(payload, ['data', 'title']) ||
		formatEventType(eventType);
	const actor =
		rawString(payload, ['sender', 'login']) ||
		rawString(payload, ['actor', 'login']) ||
		rawString(payload, ['user', 'name']) ||
		rawString(payload, ['creator', 'name']);
	const externalUrl =
		rawString(payload, ['html_url']) ||
		rawString(payload, ['url']) ||
		rawString(payload, ['pull_request', 'html_url']) ||
		rawString(payload, ['issue', 'html_url']) ||
		rawString(payload, ['data', 'url']);
	const summary =
		rawString(payload, ['body']) ||
		rawString(payload, ['comment', 'body']) ||
		rawString(payload, ['description']) ||
		rawString(payload, ['data', 'description']);

	return {
		externalEventId: rawString(raw, ['id']) || webhookId,
		eventType: formatEventType(eventType),
		title,
		actor,
		externalUrl,
		summary: summary ? summary.slice(0, 500) : ''
	};
}

function formatEventType(value: string) {
	return value
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function safeJson(value: string): unknown {
	try {
		return JSON.parse(value) as unknown;
	} catch {
		return null;
	}
}

function rawString(value: unknown, path: string[]) {
	let current = value;
	for (const key of path) {
		if (!isRecord(current)) return '';
		current = current[key];
	}
	return typeof current === 'string' ? current.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
