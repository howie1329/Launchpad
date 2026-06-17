export type NormalizedWebhookPayload = {
	id?: string;
	uuid?: string;
	triggerSlug?: string;
	toolkitSlug?: string;
	payload?: unknown;
	originalPayload?: unknown;
	metadata?: {
		id?: string;
		uuid?: string;
		triggerSlug?: string;
		toolkitSlug?: string;
		connectedAccount?: {
			id?: string;
			userId?: string;
		};
	};
};

export function isAcceptedEventType(eventType: string, triggerId: string) {
	return (
		eventType === 'composio.trigger.message' ||
		eventType === 'composio.connected_account.expired' ||
		eventType === 'composio.trigger.disabled' ||
		Boolean(triggerId)
	);
}

export function triggerIdFromPayload(incoming: NormalizedWebhookPayload, raw: unknown) {
	return (
		incoming.metadata?.id ||
		incoming.metadata?.uuid ||
		incoming.id ||
		incoming.uuid ||
		rawString(raw, ['metadata', 'trigger_id']) ||
		rawString(raw, ['metadata', 'trigger_nano_id']) ||
		rawString(raw, ['data', 'trigger_nano_id']) ||
		rawString(raw, ['data', 'trigger_id'])
	);
}

export function normalizeActivity(
	incoming: NormalizedWebhookPayload,
	raw: unknown,
	webhookId: string
) {
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

export function safeJson(value: string): unknown {
	try {
		return JSON.parse(value) as unknown;
	} catch {
		return null;
	}
}

function formatEventType(value: string) {
	return value
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function rawString(value: unknown, path: string[]) {
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
