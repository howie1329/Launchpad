import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { getAccountResetCleanupTargetsQuery, resetAccountMutation } from '$lib/account-management';
import { deleteSupermemoryAccountData } from '$lib/server/memory';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { ConvexHttpClient } from 'convex/browser';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const token = bearerToken(request.headers.get('authorization'));
		if (!token) {
			return json({ ok: false, error: 'Authentication is required' }, { status: 401 });
		}

		const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);
		convex.setAuth(token);

		const targets = await convex.query(getAccountResetCleanupTargetsQuery, {});
		if (!targets) {
			return json({ ok: false, error: 'Authentication is required' }, { status: 401 });
		}

		const memoryDelete = await deleteSupermemoryAccountData({
			ownerId: targets.ownerId,
			projectIds: targets.projectIds,
			documentIds: targets.supermemoryDocumentIds
		});

		if (memoryDelete.status === 'failed') {
			return json(
				{
					ok: false,
					error: 'Could not clear remote memory. Your local data was not reset. Please try again.'
				},
				{ status: 502 }
			);
		}

		await convex.mutation(resetAccountMutation, {});
		return json({ ok: true });
	} catch (error) {
		console.error(error);
		return json({ ok: false, error: 'Could not reset account data' }, { status: 500 });
	}
};

function bearerToken(authorization: string | null) {
	if (!authorization?.startsWith('Bearer ')) return '';
	return authorization.slice('Bearer '.length).trim();
}
