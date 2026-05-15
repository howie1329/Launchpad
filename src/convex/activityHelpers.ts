import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { dateKeyForMs } from './dateKey';

export const DEFAULT_TIME_ZONE = 'UTC';

export async function getUserTimeZone(ctx: QueryCtx | MutationCtx, ownerId: Id<'users'>) {
	const settings = await ctx.db
		.query('userSettings')
		.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
		.unique();

	return settings?.timeZone || DEFAULT_TIME_ZONE;
}

export async function logActivityEvent(
	ctx: MutationCtx,
	params: {
		ownerId: Id<'users'>;
		eventType: string;
		metadata?: Record<string, unknown>;
		occurredAtMs?: number;
	}
) {
	const now = params.occurredAtMs ?? Date.now();
	const timeZone = await getUserTimeZone(ctx, params.ownerId);
	const dateKey = dateKeyForMs(now, timeZone);

	await ctx.db.insert('activityEvents', {
		ownerId: params.ownerId,
		eventType: params.eventType,
		dateKey,
		...(params.metadata ? { metadata: params.metadata } : {}),
		createdAt: now
	});
}
