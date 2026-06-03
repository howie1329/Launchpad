import { PUBLIC_CONVEX_URL } from '$env/static/public';
import {
	deleteComposioConnectedAccountsForUser,
	getComposioAppStatusesForUser,
	isComposioConfigured,
	parseComposioToolkits
} from '$lib/server/composio';
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

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const token = bearerToken(request.headers.get('authorization'));
		if (!token) {
			return json({ error: 'Authentication is required' }, { status: 401 });
		}

		if (!isComposioConfigured()) {
			return json({ error: 'External app tools are not configured.' }, { status: 400 });
		}

		const body = (await request.json().catch(() => null)) as { toolkit?: unknown } | null;
		const [toolkit] = parseComposioToolkits(body ? [body.toolkit] : []);
		if (!toolkit) {
			return json({ error: 'Unsupported external app toolkit.' }, { status: 400 });
		}

		const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);
		convex.setAuth(token);
		const viewer = await convex.query(getMyViewerQuery, {});

		const result = await deleteComposioConnectedAccountsForUser({
			ownerId: String(viewer.ownerId),
			toolkit
		});
		return json({ ok: true, ...result });
	} catch (error) {
		console.error(error);
		return json({ error: 'Could not disconnect external app.' }, { status: 500 });
	}
};

function bearerToken(authorization: string | null) {
	if (!authorization?.startsWith('Bearer ')) return '';
	return authorization.slice('Bearer '.length).trim();
}
