import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { getComposioAppStatusesForUser, isComposioConfigured } from '$lib/server/composio';
import { getMyViewerQuery } from '$lib/viewer';
import { ConvexHttpClient } from 'convex/browser';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ request }) => {
	try {
		const token = bearerToken(request.headers.get('authorization'));
		if (!token) {
			return json({ error: 'Authentication is required' }, { status: 401 });
		}

		if (!isComposioConfigured()) {
			const result = await getComposioAppStatusesForUser({ ownerId: '' });
			return json({ ...result, error: 'External app tools are not configured.' });
		}

		const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);
		convex.setAuth(token);
		const viewer = await convex.query(getMyViewerQuery, {});

		const result = await getComposioAppStatusesForUser({ ownerId: String(viewer.ownerId) });
		return json(result);
	} catch (error) {
		console.error(error);
		return json(
			{ available: false, apps: [], error: 'External app tools are unavailable.' },
			{ status: 200 }
		);
	}
};

function bearerToken(authorization: string | null) {
	if (!authorization?.startsWith('Bearer ')) return '';
	return authorization.slice('Bearer '.length).trim();
}
