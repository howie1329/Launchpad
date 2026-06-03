import { env } from '$env/dynamic/private';
import { setThreadComposioSessionIdMutation, type SavedChatThread } from '$lib/chat';
import { Composio } from '@composio/core';
import type { VerifyWebhookResult } from '@composio/core';
import { VercelProvider } from '@composio/vercel';
import type { ToolSet } from 'ai';
import type { ConvexHttpClient } from 'convex/browser';
import type { Id } from '../../convex/_generated/dataModel';

export const ALLOWED_COMPOSIO_TOOLKITS = [
	'github',
	'linear',
	'slack',
	'gmail',
	'notion',
	'googledrive',
	'googledocs',
	'googlecalendar',
	'googlesheets'
] as const;

export type AllowedComposioToolkit = (typeof ALLOWED_COMPOSIO_TOOLKITS)[number];
export type LaunchpadActionToolkit = Extract<AllowedComposioToolkit, 'github' | 'linear'>;

export type ComposioToolkitStatus = {
	slug: AllowedComposioToolkit;
	name: string;
	logo?: string;
	connected: boolean;
	connectionStatus?: string;
};

export type ComposioAppStatus = {
	slug: AllowedComposioToolkit;
	name: string;
	logo?: string;
	connected: boolean;
	status:
		| 'ACTIVE'
		| 'FAILED'
		| 'EXPIRED'
		| 'INACTIVE'
		| 'REVOKED'
		| 'INITIATED'
		| 'INITIALIZING'
		| 'NOT_CONNECTED'
		| 'UNAVAILABLE';
	statusReason?: string;
	updatedAt?: string;
	connectable: boolean;
};

type ComposioClient = InstanceType<typeof Composio>;
type ComposioSession = Awaited<ReturnType<ComposioClient['create']>>;
type ConnectedAccountListItem = Awaited<
	ReturnType<ComposioClient['connectedAccounts']['list']>
>['items'][number];

let client: ComposioClient | null = null;
let clientApiKey = '';

export function isComposioConfigured() {
	return Boolean(composioApiKey());
}

export function parseComposioToolkits(value: unknown): AllowedComposioToolkit[] {
	if (!Array.isArray(value)) return [];

	const selected: AllowedComposioToolkit[] = [];
	for (const item of value) {
		if (!isAllowedComposioToolkit(item)) continue;
		if (!selected.includes(item)) selected.push(item);
	}

	return selected;
}

export async function getComposioToolkitStatusesForThread({
	convex,
	thread
}: {
	convex: ConvexHttpClient;
	thread: SavedChatThread;
}): Promise<
	{ available: false; toolkits: [] } | { available: true; toolkits: ComposioToolkitStatus[] }
> {
	const session = await getOrCreateThreadSession({
		convex,
		thread,
		toolkits: [...ALLOWED_COMPOSIO_TOOLKITS]
	});
	if (!session) return { available: false, toolkits: [] };

	await session.update({ toolkits: [...ALLOWED_COMPOSIO_TOOLKITS] });
	const result = await session.toolkits({ limit: 20, toolkits: [...ALLOWED_COMPOSIO_TOOLKITS] });
	const bySlug = new Map<string, (typeof result.items)[number]>(
		result.items.map((item) => [item.slug.toLowerCase(), item])
	);

	return {
		available: true,
		toolkits: ALLOWED_COMPOSIO_TOOLKITS.map((slug) => {
			const item = bySlug.get(slug);
			return {
				slug,
				name: item?.name ?? fallbackToolkitName(slug),
				...(item?.logo ? { logo: item.logo } : {}),
				connected: item?.connection?.isActive === true,
				...(item?.connection?.connectedAccount?.status
					? { connectionStatus: item.connection.connectedAccount.status }
					: {})
			};
		})
	};
}

export async function getComposioToolsForChatRun({
	convex,
	thread,
	toolkits
}: {
	convex: ConvexHttpClient;
	thread: SavedChatThread;
	toolkits: AllowedComposioToolkit[];
}): Promise<ToolSet> {
	const activeToolkits = toolkits.length > 0 ? toolkits : [...ALLOWED_COMPOSIO_TOOLKITS];
	const session = await getOrCreateThreadSession({ convex, thread, toolkits: activeToolkits });
	if (!session) return {};

	await session.update({ toolkits: activeToolkits });
	return (await session.tools()) as ToolSet;
}

export async function getComposioAppStatusesForUser({
	ownerId
}: {
	ownerId: string;
}): Promise<
	{ available: false; apps: ComposioAppStatus[] } | { available: true; apps: ComposioAppStatus[] }
> {
	const composio = getComposioClient();
	if (!composio) {
		return { available: false, apps: unavailableComposioApps() };
	}

	const accounts = await composio.connectedAccounts.list({
		userIds: [ownerId],
		toolkitSlugs: [...ALLOWED_COMPOSIO_TOOLKITS],
		accountType: 'ALL',
		limit: 100,
		orderBy: 'updated_at'
	});

	const byToolkit = new Map<AllowedComposioToolkit, ConnectedAccountListItem>();
	for (const account of accounts.items) {
		if (!isAllowedComposioToolkit(account.toolkit.slug)) continue;
		const slug = account.toolkit.slug.toLowerCase() as AllowedComposioToolkit;
		const current = byToolkit.get(slug);
		if (!current || Date.parse(account.updatedAt) > Date.parse(current.updatedAt)) {
			byToolkit.set(slug, account);
		}
	}

	return {
		available: true,
		apps: ALLOWED_COMPOSIO_TOOLKITS.map((slug) => {
			const account = byToolkit.get(slug);
			if (!account) {
				return {
					slug,
					name: fallbackToolkitName(slug),
					connected: false,
					status: 'NOT_CONNECTED',
					connectable: true
				};
			}

			const connected = account.status === 'ACTIVE' && !account.isDisabled;
			const connectable =
				!connected &&
				(account.isDisabled ||
					account.status === 'FAILED' ||
					account.status === 'EXPIRED' ||
					account.status === 'INACTIVE' ||
					account.status === 'REVOKED');

			return {
				slug,
				name: fallbackToolkitName(slug),
				connected,
				status: account.isDisabled ? 'INACTIVE' : account.status,
				...(account.statusReason ? { statusReason: account.statusReason } : {}),
				updatedAt: account.updatedAt,
				connectable
			};
		})
	};
}

export async function createComposioConnectLinkForUser({
	ownerId,
	toolkit,
	callbackUrl
}: {
	ownerId: string;
	toolkit: AllowedComposioToolkit;
	callbackUrl: string;
}): Promise<{ connected: true } | { redirectUrl: string }> {
	const composio = getComposioClient();
	if (!composio) {
		throw new Error('Composio is not configured');
	}

	const activeAccounts = await composio.connectedAccounts.list({
		userIds: [ownerId],
		toolkitSlugs: [toolkit],
		statuses: ['ACTIVE'],
		accountType: 'ALL',
		limit: 1
	});
	if (activeAccounts.items.some((account) => !account.isDisabled)) {
		return { connected: true };
	}

	const authConfigId = await resolveAuthConfigId(composio, toolkit);
	const request = await composio.connectedAccounts.link(ownerId, authConfigId, {
		callbackUrl,
		allowMultiple: false
	});

	if (!request.redirectUrl) {
		throw new Error('Composio did not return a connect link');
	}

	return { redirectUrl: request.redirectUrl };
}

export async function deleteComposioConnectedAccountsForUser({
	ownerId,
	toolkit
}: {
	ownerId: string;
	toolkit: AllowedComposioToolkit;
}): Promise<{ deleted: number }> {
	const composio = getComposioClient();
	if (!composio) {
		throw new Error('Composio is not configured');
	}

	const accounts = await composio.connectedAccounts.list({
		userIds: [ownerId],
		toolkitSlugs: [toolkit],
		accountType: 'ALL',
		limit: 100
	});

	for (const account of accounts.items) {
		await composio.connectedAccounts.delete(account.id);
	}

	return { deleted: accounts.items.length };
}

export async function listComposioTriggerTypesForLaunchpadActions({
	toolkit
}: {
	toolkit: LaunchpadActionToolkit;
}): Promise<
	{ available: false; triggers: [] } | { available: true; triggers: ComposioTriggerTypeSummary[] }
> {
	const composio = getComposioClient();
	if (!composio) return { available: false, triggers: [] };

	const result = await composio.triggers.listTypes({ toolkits: [toolkit], limit: 100 });
	return {
		available: true,
		triggers: result.items.map((item) => ({
			slug: item.slug,
			name: item.name,
			description: item.description,
			config: item.config
		}))
	};
}

export async function createComposioTriggerForLaunchpadAction({
	ownerId,
	toolkit,
	triggerSlug,
	triggerConfig
}: {
	ownerId: string;
	toolkit: LaunchpadActionToolkit;
	triggerSlug: string;
	triggerConfig: Record<string, unknown>;
}) {
	const composio = getComposioClient();
	if (!composio) {
		throw new Error('Composio is not configured');
	}

	const account = await getActiveConnectedAccountForUser(composio, ownerId, toolkit);
	if (!account) {
		throw new Error(`${fallbackToolkitName(toolkit)} is not connected`);
	}

	const result = await composio.triggers.create(ownerId, triggerSlug, {
		connectedAccountId: account.id,
		triggerConfig
	});

	return {
		triggerId: result.triggerId,
		connectedAccountId: account.id
	};
}

export async function setComposioTriggerEnabled(triggerId: string, enabled: boolean) {
	const composio = getComposioClient();
	if (!composio) {
		throw new Error('Composio is not configured');
	}

	if (enabled) {
		await composio.triggers.enable(triggerId);
	} else {
		await composio.triggers.disable(triggerId);
	}
}

export async function deleteComposioTrigger(triggerId: string) {
	const composio = getComposioClient();
	if (!composio) {
		throw new Error('Composio is not configured');
	}

	await composio.triggers.delete(triggerId);
}

export async function verifyComposioWebhook({
	payload,
	signature,
	webhookId,
	webhookTimestamp
}: {
	payload: string;
	signature: string;
	webhookId: string;
	webhookTimestamp: string;
}): Promise<VerifyWebhookResult> {
	const composio = getComposioClient();
	if (!composio) {
		throw new Error('Composio is not configured');
	}

	const secret = env.COMPOSIO_WEBHOOK_SECRET?.trim() ?? '';
	if (!secret) {
		throw new Error('Composio webhook secret is not configured');
	}

	return await composio.triggers.verifyWebhook({
		payload,
		signature,
		id: webhookId,
		timestamp: webhookTimestamp,
		secret
	});
}

async function getOrCreateThreadSession({
	convex,
	thread,
	toolkits
}: {
	convex: ConvexHttpClient;
	thread: SavedChatThread;
	toolkits: AllowedComposioToolkit[];
}): Promise<ComposioSession | null> {
	const composio = getComposioClient();
	if (!composio) return null;

	if (thread.composioSessionId) {
		return await composio.use(thread.composioSessionId);
	}

	const session = await composio.create(String(thread.ownerId), { toolkits });
	await convex.mutation(setThreadComposioSessionIdMutation, {
		threadId: thread._id as Id<'chatThreads'>,
		composioSessionId: session.sessionId
	});
	thread.composioSessionId = session.sessionId;

	return session;
}

async function getActiveConnectedAccountForUser(
	composio: ComposioClient,
	ownerId: string,
	toolkit: LaunchpadActionToolkit
) {
	const accounts = await composio.connectedAccounts.list({
		userIds: [ownerId],
		toolkitSlugs: [toolkit],
		statuses: ['ACTIVE'],
		accountType: 'ALL',
		limit: 10,
		orderBy: 'updated_at'
	});

	return accounts.items.find((account) => !account.isDisabled) ?? null;
}

function getComposioClient(): ComposioClient | null {
	const apiKey = composioApiKey();
	if (!apiKey) return null;

	if (!client || clientApiKey !== apiKey) {
		client = new Composio({ apiKey, provider: new VercelProvider() });
		clientApiKey = apiKey;
	}

	return client;
}

async function resolveAuthConfigId(composio: ComposioClient, toolkit: AllowedComposioToolkit) {
	const existing = await composio.authConfigs.list({ toolkit, limit: 20 });
	const enabled = existing.items.find((config) => config.status === 'ENABLED');
	if (enabled) return enabled.id;

	const created = await composio.authConfigs.create(toolkit, {
		type: 'use_composio_managed_auth',
		name: `${fallbackToolkitName(toolkit)} Auth Config`
	});
	return created.id;
}

function composioApiKey() {
	return env.COMPOSIO_API_KEY?.trim() ?? '';
}

function isAllowedComposioToolkit(value: unknown): value is AllowedComposioToolkit {
	return (
		typeof value === 'string' &&
		ALLOWED_COMPOSIO_TOOLKITS.includes(value.toLowerCase() as AllowedComposioToolkit)
	);
}

function fallbackToolkitName(slug: AllowedComposioToolkit) {
	const names: Record<AllowedComposioToolkit, string> = {
		github: 'GitHub',
		linear: 'Linear',
		slack: 'Slack',
		gmail: 'Gmail',
		notion: 'Notion',
		googledrive: 'Google Drive',
		googledocs: 'Google Docs',
		googlecalendar: 'Google Calendar',
		googlesheets: 'Google Sheets'
	};
	return names[slug];
}

function unavailableComposioApps(): ComposioAppStatus[] {
	return ALLOWED_COMPOSIO_TOOLKITS.map((slug) => ({
		slug,
		name: fallbackToolkitName(slug),
		connected: false,
		status: 'UNAVAILABLE',
		connectable: false
	}));
}

type ComposioTriggerTypeSummary = {
	slug: string;
	name: string;
	description?: string;
	config: Record<string, unknown>;
};
