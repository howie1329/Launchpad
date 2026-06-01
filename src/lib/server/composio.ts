import { env } from '$env/dynamic/private';
import { setThreadComposioSessionIdMutation, type SavedChatThread } from '$lib/chat';
import { Composio } from '@composio/core';
import { VercelProvider } from '@composio/vercel';
import type { ToolSet } from 'ai';
import type { ConvexHttpClient } from 'convex/browser';
import type { Id } from '../../convex/_generated/dataModel';

export const ALLOWED_COMPOSIO_TOOLKITS = ['github', 'linear', 'slack', 'gmail'] as const;

export type AllowedComposioToolkit = (typeof ALLOWED_COMPOSIO_TOOLKITS)[number];

export type ComposioToolkitStatus = {
	slug: AllowedComposioToolkit;
	name: string;
	logo?: string;
	connected: boolean;
	connectionStatus?: string;
};

type ComposioClient = InstanceType<typeof Composio>;
type ComposioSession = Awaited<ReturnType<ComposioClient['create']>>;

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

function getComposioClient(): ComposioClient | null {
	const apiKey = composioApiKey();
	if (!apiKey) return null;

	if (!client || clientApiKey !== apiKey) {
		client = new Composio({ apiKey, provider: new VercelProvider() });
		clientApiKey = apiKey;
	}

	return client;
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
	return slug === 'github' ? 'GitHub' : slug.charAt(0).toUpperCase() + slug.slice(1);
}
