import { makeFunctionReference } from 'convex/server';
import type { Doc } from '../convex/_generated/dataModel';
import type { WorkspaceTabTarget } from '../convex/workspaceTabs';

export type { WorkspaceTabTarget } from '../convex/workspaceTabs';

export type WorkspaceTabStripDoc = Doc<'workspaceTabStrip'>;

export const getWorkspaceTabStripQuery = makeFunctionReference<
	'query',
	Record<string, never>,
	WorkspaceTabStripDoc | null
>('workspaceTabs:getMine');

export const addOrActivateWorkspaceTabMutation = makeFunctionReference<
	'mutation',
	{ target: WorkspaceTabTarget },
	{ tabId: string }
>('workspaceTabs:addOrActivate');

export const removeWorkspaceTabMutation = makeFunctionReference<
	'mutation',
	{ tabId: string },
	{ removed: boolean; activeTarget: WorkspaceTabTarget | null }
>('workspaceTabs:removeTab');
