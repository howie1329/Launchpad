import { makeFunctionReference } from 'convex/server';
import type { Id } from '../convex/_generated/dataModel';

export type LaunchpadActionProvider = 'github' | 'linear';
export type LaunchpadActionSourceKind = 'github_repository' | 'linear_project' | 'linear_team';
export type LaunchpadActionStatus = 'active' | 'disabled' | 'needs_attention';

export type LaunchpadAction = {
	_id: Id<'launchpadActions'>;
	_creationTime: number;
	ownerId: Id<'users'>;
	projectId: Id<'projects'>;
	provider: LaunchpadActionProvider;
	sourceKind: LaunchpadActionSourceKind;
	sourceId: string;
	sourceName: string;
	triggerSlug: string;
	triggerId?: string;
	connectedAccountId?: string;
	triggerConfig?: Record<string, unknown>;
	status: LaunchpadActionStatus;
	statusReason?: string;
	createdAt: number;
	updatedAt: number;
	disabledAt?: number;
};

export type ProjectActivityEvent = {
	_id: Id<'projectActivityEvents'>;
	_creationTime: number;
	ownerId: Id<'users'>;
	projectId: Id<'projects'>;
	actionId?: Id<'launchpadActions'>;
	provider: LaunchpadActionProvider;
	externalEventId: string;
	eventType: string;
	actor?: string;
	title: string;
	externalUrl?: string;
	summary?: string;
	metadata?: Record<string, unknown>;
	createdAt: number;
};

export const listLaunchpadActionsForProjectQuery = makeFunctionReference<
	'query',
	{ projectId: Id<'projects'> },
	LaunchpadAction[]
>('launchpadActions:listForProject');

export const listProjectActivityEventsQuery = makeFunctionReference<
	'query',
	{ projectId: Id<'projects'>; limit?: number },
	ProjectActivityEvent[]
>('launchpadActions:listProjectActivity');

export const getLaunchpadActionQuery = makeFunctionReference<
	'query',
	{ actionId: Id<'launchpadActions'> },
	LaunchpadAction | null
>('launchpadActions:getAction');

export const createLaunchpadActionMutation = makeFunctionReference<
	'mutation',
	{
		projectId: Id<'projects'>;
		provider: LaunchpadActionProvider;
		sourceKind: LaunchpadActionSourceKind;
		sourceId: string;
		sourceName: string;
		triggerSlug: string;
		triggerId: string;
		connectedAccountId?: string;
		triggerConfig?: Record<string, unknown>;
	},
	{ actionId: Id<'launchpadActions'> }
>('launchpadActions:createAction');

export const setLaunchpadActionStatusMutation = makeFunctionReference<
	'mutation',
	{
		actionId: Id<'launchpadActions'>;
		status: LaunchpadActionStatus;
		statusReason?: string;
	},
	{ ok: true }
>('launchpadActions:setActionStatus');

export const markLaunchpadActionNeedsAttentionMutation = makeFunctionReference<
	'mutation',
	{ actionId: Id<'launchpadActions'>; reason: string },
	{ ok: true }
>('launchpadActions:markActionNeedsAttention');

export const deleteLaunchpadActionMutation = makeFunctionReference<
	'mutation',
	{ actionId: Id<'launchpadActions'> },
	{ ok: true }
>('launchpadActions:deleteAction');

export const recordLaunchpadActionWebhookActivityMutation = makeFunctionReference<
	'mutation',
	{
		webhookSecret: string;
		triggerId: string;
		externalEventId: string;
		eventType: string;
		actor?: string;
		title: string;
		externalUrl?: string;
		summary?: string;
		metadata?: Record<string, unknown>;
		createdAt?: number;
	},
	{ status: 'recorded' | 'duplicate' | 'ignored'; activityEventId?: Id<'projectActivityEvents'> }
>('launchpadActions:recordWebhookActivity');

export const markLaunchpadActionNeedsAttentionByTriggerMutation = makeFunctionReference<
	'mutation',
	{ webhookSecret: string; triggerId: string; reason: string },
	{ status: 'updated' | 'ignored'; actionId?: Id<'launchpadActions'> }
>('launchpadActions:markActionNeedsAttentionByTrigger');
