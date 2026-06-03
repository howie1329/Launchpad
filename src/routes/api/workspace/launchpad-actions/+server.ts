import { PUBLIC_CONVEX_URL } from '$env/static/public';
import {
	findLaunchpadActionEvent,
	findLaunchpadActionPreset,
	type LaunchpadActionEvent
} from '$lib/launchpad-action-presets';
import {
	createLaunchpadActionMutation,
	type LaunchpadActionProvider
} from '$lib/launchpad-actions';
import { getProjectQuery } from '$lib/projects';
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
		const sourceValue = typeof body?.sourceValue === 'string' ? body.sourceValue.trim() : '';
		const sourceNameValue =
			typeof body?.sourceName === 'string' ? body.sourceName.trim() : sourceValue;
		const teamId = typeof body?.teamId === 'string' ? body.teamId.trim() : '';
		const branch = typeof body?.branch === 'string' ? body.branch.trim() : '';
		const preset = findLaunchpadActionPreset(body?.presetId);
		const event = preset ? findLaunchpadActionEvent(preset, body?.eventId) : undefined;

		if (!projectId) return json({ error: 'Project id is required' }, { status: 400 });
		if (!preset) return json({ error: 'Unsupported Launchpad Action preset' }, { status: 400 });
		if (!event) return json({ error: 'Unsupported Launchpad Action event' }, { status: 400 });

		const source = buildPresetSource(
			preset.provider,
			preset.sourceKind,
			sourceValue,
			sourceNameValue
		);
		if (!source.ok) return json({ error: source.error }, { status: 400 });

		const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);
		convex.setAuth(token);
		const project = await convex.query(getProjectQuery, {
			projectId: projectId as Id<'projects'>
		});
		if (!project) return json({ error: 'Project not found' }, { status: 404 });

		const triggerTypes = await listComposioTriggerTypesForLaunchpadActions({
			toolkit: preset.provider
		});
		if (!triggerTypes.available) {
			return json({ error: 'Launchpad Action triggers are unavailable' }, { status: 400 });
		}

		const triggerType = findMatchingTriggerType(triggerTypes.triggers, event);
		if (!triggerType) {
			return json(
				{ error: 'Selected event is not available for this connected app' },
				{ status: 400 }
			);
		}
		if (
			preset.sourceKind === 'linear_project' &&
			triggerRequiresConfigKey(triggerType, 'team_id')
		) {
			if (!teamId) {
				return json({ error: 'Linear team id is required for this event' }, { status: 400 });
			}
			source.triggerConfig.team_id = teamId;
		}
		if (
			preset.sourceKind === 'github_repository' &&
			triggerRequiresConfigKey(triggerType, 'branch')
		) {
			if (!branch) {
				return json({ error: 'Branch is required for this event' }, { status: 400 });
			}
			source.triggerConfig.branch = branch;
		}
		const missingKeys = missingRequiredConfigKeys(triggerType, source.triggerConfig);
		if (missingKeys.length > 0) {
			return json(
				{ error: `Selected event requires unsupported config: ${missingKeys.join(', ')}` },
				{ status: 400 }
			);
		}

		const trigger = await createComposioTriggerForLaunchpadAction({
			ownerId: String(project.ownerId),
			toolkit: preset.provider,
			triggerSlug: triggerType.slug,
			triggerConfig: source.triggerConfig
		});
		createdTriggerId = trigger.triggerId;

		const result = await convex.mutation(createLaunchpadActionMutation, {
			projectId: project._id,
			provider: preset.provider,
			sourceKind: preset.sourceKind,
			sourceId: source.sourceId,
			sourceName: source.sourceName,
			triggerSlug: triggerType.slug,
			triggerId: trigger.triggerId,
			connectedAccountId: trigger.connectedAccountId,
			triggerConfig: {
				...source.triggerConfig,
				launchpadPresetId: preset.id,
				launchpadEventId: event.id,
				launchpadEventLabel: event.label
			}
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

function buildPresetSource(
	provider: LaunchpadActionProvider,
	sourceKind: 'github_repository' | 'linear_project' | 'linear_team',
	sourceValue: string,
	sourceNameValue: string
):
	| {
			ok: true;
			sourceId: string;
			sourceName: string;
			triggerConfig: Record<string, unknown>;
	  }
	| { ok: false; error: string } {
	if (!sourceValue) {
		return {
			ok: false,
			error: provider === 'github' ? 'Repository is required' : 'Source id is required'
		};
	}

	if (sourceKind === 'github_repository') {
		const [owner, repo, extra] = sourceValue.split('/').map((part) => part.trim());
		if (!owner || !repo || extra) {
			return { ok: false, error: 'Repository must use owner/repo format' };
		}
		const repository = `${owner}/${repo}`;
		return {
			ok: true,
			sourceId: repository,
			sourceName: repository,
			triggerConfig: { owner, repo }
		};
	}

	const sourceId = sourceValue;
	const sourceName = sourceNameValue || sourceValue;
	return {
		ok: true,
		sourceId,
		sourceName,
		triggerConfig: sourceKind === 'linear_team' ? { team_id: sourceId } : { project_id: sourceId }
	};
}

function findMatchingTriggerType(
	triggers: {
		slug: string;
		name: string;
		description?: string;
		config?: Record<string, unknown>;
	}[],
	event: LaunchpadActionEvent
) {
	return triggers.find((trigger) => triggerMatchesEvent(trigger, event));
}

function triggerMatchesEvent(
	trigger: { slug: string; name: string; description?: string },
	event: LaunchpadActionEvent
) {
	const haystack = triggerText(trigger);
	return (
		event.matchAll.every((term) => haystack.includes(normalizeTriggerTerm(term))) &&
		(!event.matchAny ||
			event.matchAny.some((term) => haystack.includes(normalizeTriggerTerm(term))))
	);
}

function triggerText(trigger: { slug: string; name: string; description?: string }) {
	return normalizeTriggerTerm(`${trigger.slug} ${trigger.name} ${trigger.description ?? ''}`);
}

function triggerRequiresConfigKey(trigger: { config?: Record<string, unknown> }, key: string) {
	const required = trigger.config?.required;
	return Array.isArray(required) && required.includes(key);
}

function missingRequiredConfigKeys(
	trigger: { config?: Record<string, unknown> },
	triggerConfig: Record<string, unknown>
) {
	const required = trigger.config?.required;
	if (!Array.isArray(required)) return [];
	return required.filter(
		(key): key is string => typeof key === 'string' && !(key in triggerConfig)
	);
}

function normalizeTriggerTerm(value: string) {
	return value.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function errorMessage(error: unknown, fallback: string) {
	return error instanceof Error && error.message ? error.message : fallback;
}
