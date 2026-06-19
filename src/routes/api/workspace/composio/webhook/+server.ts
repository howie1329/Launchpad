import { env } from '$env/dynamic/private';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import {
	isAcceptedEventType,
	normalizeActivity,
	rawString,
	safeJson,
	triggerIdFromPayload,
	type NormalizedWebhookPayload
} from '$lib/composio-webhook-normalization';
import {
	markLaunchpadActionNeedsAttentionByTriggerMutation,
	recordLaunchpadActionWebhookActivityMutation
} from '$lib/launchpad-actions';
import { verifyComposioWebhook } from '$lib/server/composio';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { ConvexHttpClient } from 'convex/browser';

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

		if (!isAcceptedEventType(eventType, triggerId)) {
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

function composioWebhookSecret() {
	const secret = env.COMPOSIO_WEBHOOK_SECRET?.trim() ?? '';
	if (!secret) throw new Error('Composio webhook secret is not configured');
	return secret;
}
