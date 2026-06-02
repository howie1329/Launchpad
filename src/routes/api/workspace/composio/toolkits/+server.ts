import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { getThreadQuery } from '$lib/chat';
import { getComposioToolkitStatusesForThread, isComposioConfigured } from '$lib/server/composio';
import { ConvexHttpClient } from 'convex/browser';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import type { Id } from '../../../../../convex/_generated/dataModel';

export const GET: RequestHandler = async ({ request, url }) => {
	try {
		const token = bearerToken(request.headers.get('authorization'));
		if (!token) {
			return json({ error: 'Authentication is required' }, { status: 401 });
		}

		const threadId = url.searchParams.get('threadId')?.trim() ?? '';
		if (!threadId) {
			return json({ error: 'Thread id is required' }, { status: 400 });
		}

		if (!isComposioConfigured()) {
			return json({ available: false, toolkits: [] });
		}

		const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);
		convex.setAuth(token);

		const thread = await convex.query(getThreadQuery, {
			threadId: threadId as Id<'chatThreads'>
		});

		if (!thread) {
			return json({ error: 'Thread not found' }, { status: 404 });
		}

		const result = await getComposioToolkitStatusesForThread({ convex, thread });
		return json(result);
	} catch (error) {
		console.error(error);
		return json(
			{ available: false, toolkits: [], error: 'External app tools are unavailable.' },
			{ status: 200 }
		);
	}
};

function bearerToken(authorization: string | null) {
	if (!authorization?.startsWith('Bearer ')) return '';
	return authorization.slice('Bearer '.length).trim();
}
