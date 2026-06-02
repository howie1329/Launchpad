import { PUBLIC_CONVEX_URL } from '$env/static/public';
import {
	createComposioConnectLinkForUser,
	isComposioConfigured,
	parseComposioToolkits
} from '$lib/server/composio';
import { getMyViewerQuery } from '$lib/viewer';
import { ConvexHttpClient } from 'convex/browser';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, url }) => {
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
		const callbackUrl = `${url.origin}/workspace/settings?externalApps=1&app=${encodeURIComponent(toolkit)}`;

		const result = await createComposioConnectLinkForUser({
			ownerId: String(viewer.ownerId),
			toolkit,
			callbackUrl
		});
		return json(result);
	} catch (error) {
		console.error(error);
		return json({ error: 'Could not start external app connection.' }, { status: 500 });
	}
};

function bearerToken(authorization: string | null) {
	if (!authorization?.startsWith('Bearer ')) return '';
	return authorization.slice('Bearer '.length).trim();
}
