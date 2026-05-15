import { makeFunctionReference } from 'convex/server';
import type { Id } from '../convex/_generated/dataModel';

export const resetAccountMutation = makeFunctionReference<
	'mutation',
	Record<string, never>,
	{ ok: true }
>('accountManagement:resetAccount');

export const deleteAccountMutation = makeFunctionReference<
	'mutation',
	Record<string, never>,
	{ ok: true }
>('accountManagement:deleteAccount');

export const deleteProjectMutation = makeFunctionReference<
	'mutation',
	{ projectId: Id<'projects'> },
	{ ok: true }
>('accountManagement:deleteProject');

export const deleteThreadMutation = makeFunctionReference<
	'mutation',
	{ threadId: Id<'chatThreads'> },
	{ ok: true }
>('accountManagement:deleteThread');

export const isAccountDeletableQuery = makeFunctionReference<
	'query',
	Record<string, never>,
	{ deletable: boolean }
>('accountManagement:isAccountDeletable');
