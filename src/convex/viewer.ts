import { query } from './_generated/server';
import { requireAuthUserId } from './authHelpers';

export const getMine = query({
	args: {},
	handler: async (ctx) => {
		const ownerId = await requireAuthUserId(ctx);
		return { ownerId };
	}
});
