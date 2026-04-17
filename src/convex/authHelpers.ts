import { getAuthUserId } from '@convex-dev/auth/server';
import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

/**
 * Stable per-user key for ownership (`users` document id). Do not use
 * `getUserIdentity().tokenIdentifier` for app data — it includes session id.
 */
export async function getOptionalAuthUserId(
	ctx: QueryCtx | MutationCtx
): Promise<Id<'users'> | null> {
	return await getAuthUserId(ctx);
}

export async function requireAuthUserId(ctx: MutationCtx): Promise<Id<'users'>> {
	const userId = await getAuthUserId(ctx);
	if (!userId) throw new Error('Authentication required');
	return userId;
}
