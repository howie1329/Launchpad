import { makeFunctionReference } from 'convex/server';
import type { Id } from '../convex/_generated/dataModel';

export type ActivityEvent = {
	_id: Id<'activityEvents'>;
	_creationTime: number;
	ownerId: Id<'users'>;
	eventType: string;
	dateKey: string;
	metadata?: Record<string, unknown>;
	createdAt: number;
};

export const listMyActivityEventsQuery = makeFunctionReference<
	'query',
	{ limit?: number },
	ActivityEvent[]
>('activity:listMine');
