import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { getProjectQuery } from '$lib/projects';
import {
	createLaunchpadActionMutation,
	type LaunchpadActionProvider,
	type LaunchpadActionSourceKind
} from '$lib/launchpad-actions';
import {
	createComposioTriggerForLaunchpadAction,
	isComposioConfigured,
	listComposioTriggerTypesForLaunchpadActions,
	type LaunchpadActionToolkit
} from '$lib/server/composio';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { ConvexHttpClient } from 'convex/browser';
import type { Id } from '../../../../convex/_generated/dataModel';

const providers = ['github', 'linear'] as const;
const sourceKinds = ['github_repository', 'linear_project', 'linear_team'] as const;

export const GET: RequestHandler = async ({ request, url }) => {
	try {
		const token = bearerToken(request.headers.get('authorization'));
		if (!token) return json({ error: 'Authentication is required' }, { status: 401 });
		if (!isComposioConfigured()) {
			return json({ available: false, triggers: [] });
		}

		const provider = url.searchParams.get('provider');
		if (!isProvider(provider)) {
			return json({ error: 'Unsupported Launchpad Action provider' }, { status: 400 });
		}

		const result = await listComposioTriggerTypesForLaunchpadActions({ toolkit: provider });
		return json(result);
	} catch (error) {
		console.error(error);
		return json({ error: 'Could not load Launchpad Action triggers' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	let createdTriggerId = '';

	try {
		const token = bearerToken(request.headers.get('authorization'));
		if (!token) return json({ error: 'Authentication is required' }, { status: 401 });
		if (!isComposioConfigured()) {
			return json({ error: 'Composio is not configured' }, { status: 400 });
		}

		const body = await request.json().catch(() => null);
		const projectId = typeof body?.projectId === 'string' ? body.projectId.trim() : '';
		const provider = body?.provider;
		const sourceKind = body?.sourceKind;
		const sourceId = typeof body?.sourceId === 'string' ? body.sourceId.trim() : '';
		const sourceName = typeof body?.sourceName === 'string' ? body.sourceName.trim() : '';
		const triggerSlug = typeof body?.triggerSlug === 'string' ? body.triggerSlug.trim() : '';
		const triggerConfig = parseTriggerConfig(body?.triggerConfig);

		if (!projectId) return json({ error: 'Project id is required' }, { status: 400 });
		if (!isProvider(provider)) {
			return json({ error: 'Unsupported Launchpad Action provider' }, { status: 400 });
		}
		if (!isSourceKind(sourceKind)) {
			return json({ error: 'Unsupported Launchpad Action source' }, { status: 400 });
		}
		if (!sourceId || !sourceName) {
			return json({ error: 'Source id and name are required' }, { status: 400 });
		}
		if (!triggerSlug) {
			return json({ error: 'Composio trigger slug is required' }, { status: 400 });
		}
		if (!triggerConfig.ok) {
			return json({ error: triggerConfig.error }, { status: 400 });
		}

		const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);
		convex.setAuth(token);
		const project = await convex.query(getProjectQuery, {
			projectId: projectId as Id<'projects'>
		});
		if (!project) return json({ error: 'Project not found' }, { status: 404 });

		const trigger = await createComposioTriggerForLaunchpadAction({
			ownerId: String(project.ownerId),
			toolkit: provider,
			triggerSlug,
			triggerConfig: triggerConfig.value
		});
		createdTriggerId = trigger.triggerId;

		const result = await convex.mutation(createLaunchpadActionMutation, {
			projectId: project._id,
			provider,
			sourceKind,
			sourceId,
			sourceName,
			triggerSlug,
			triggerId: trigger.triggerId,
			connectedAccountId: trigger.connectedAccountId,
			...(Object.keys(triggerConfig.value).length > 0 ? { triggerConfig: triggerConfig.value } : {})
		});

		return json({ actionId: result.actionId });
	} catch (error) {
		if (createdTriggerId) {
			try {
				const { deleteComposioTrigger } = await import('$lib/server/composio');
				await deleteComposioTrigger(createdTriggerId);
			} catch (cleanupError) {
				console.error(
					'Could not clean up Composio trigger after action create failure',
					cleanupError
				);
			}
		}
		console.error(error);
		return json(
			{ error: errorMessage(error, 'Could not create Launchpad Action') },
			{ status: 500 }
		);
	}
};

function bearerToken(authorization: string | null) {
	if (!authorization?.startsWith('Bearer ')) return '';
	return authorization.slice('Bearer '.length).trim();
}

function isProvider(value: unknown): value is LaunchpadActionProvider & LaunchpadActionToolkit {
	return typeof value === 'string' && providers.includes(value as LaunchpadActionProvider);
}

function isSourceKind(value: unknown): value is LaunchpadActionSourceKind {
	return typeof value === 'string' && sourceKinds.includes(value as LaunchpadActionSourceKind);
}

function parseTriggerConfig(
	value: unknown
): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
	if (value === undefined || value === null || value === '') return { ok: true, value: {} };
	if (typeof value === 'object' && !Array.isArray(value)) {
		return { ok: true, value: value as Record<string, unknown> };
	}
	if (typeof value !== 'string') {
		return { ok: false, error: 'Trigger config must be a JSON object' };
	}

	try {
		const parsed = JSON.parse(value) as unknown;
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return { ok: false, error: 'Trigger config must be a JSON object' };
		}
		return { ok: true, value: parsed as Record<string, unknown> };
	} catch {
		return { ok: false, error: 'Trigger config must be valid JSON' };
	}
}

function errorMessage(error: unknown, fallback: string) {
	return error instanceof Error && error.message ? error.message : fallback;
}
