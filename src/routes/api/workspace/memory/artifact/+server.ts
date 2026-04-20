import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { syncArtifactMemory } from '$lib/server/launchpad-memory';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { ConvexHttpClient } from 'convex/browser';
import type { Id } from '../../../../../convex/_generated/dataModel';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const artifactId = typeof body.artifactId === 'string' ? body.artifactId : '';

		if (!artifactId) {
			return json({ error: 'Artifact id is required' }, { status: 400 });
		}

		const token = bearerToken(request.headers.get('authorization'));
		if (!token) {
			return json({ error: 'Authentication is required' }, { status: 401 });
		}

		const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);
		convex.setAuth(token);

		await syncArtifactMemory(convex, artifactId as Id<'artifacts'>);
		return json({ ok: true });
	} catch (error) {
		console.info('Artifact memory sync skipped', error);
		return json({ ok: true });
	}
};

function bearerToken(authorization: string | null) {
	if (!authorization?.startsWith('Bearer ')) return '';
	return authorization.slice('Bearer '.length).trim();
}
