import { makeFunctionReference } from 'convex/server';
import type { Id } from '../convex/_generated/dataModel';

export type Viewer = {
	ownerId: Id<'users'>;
};

export const getMyViewerQuery = makeFunctionReference<'query', Record<string, never>, Viewer>(
	'viewer:getMine'
);
