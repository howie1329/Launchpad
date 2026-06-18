import { PUBLIC_CONVEX_URL } from '$env/static/public';
import {
	deleteLaunchpadActionMutation,
	getLaunchpadActionQuery,
	markLaunchpadActionNeedsAttentionMutation,
	setLaunchpadActionStatusMutation
} from '$lib/launchpad-actions';
import { deleteComposioTrigger, setComposioTriggerEnabled } from '$lib/server/composio';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { ConvexHttpClient } from 'convex/browser';
import type { Id } from '../../../../../convex/_generated/dataModel';

export const PATCH: RequestHandler = async ({ request, params }) => {
	try {
		const token = bearerToken(request.headers.get('authorization'));
		if (!token) return json({ error: 'Authentication is required' }, { status: 401 });

		const actionId = params.actionId?.trim() ?? '';
		const body = await request.json().catch(() => null);
		const enabled = body?.enabled;
		if (!actionId) return json({ error: 'Launchpad Action id is required' }, { status: 400 });
		if (typeof enabled !== 'boolean') {
			return json({ error: 'Enabled must be true or false' }, { status: 400 });
		}

		const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);
		convex.setAuth(token);
		const action = await convex.query(getLaunchpadActionQuery, {
			actionId: actionId as Id<'launchpadActions'>
		});
		if (!action) return json({ error: 'Launchpad Action not found' }, { status: 404 });

		if (action.triggerId) {
			await setComposioTriggerEnabled(action.triggerId, enabled);
		}

		try {
			await convex.mutation(setLaunchpadActionStatusMutation, {
				actionId: action._id,
				status: enabled ? 'active' : 'disabled'
			});
		} catch (statusError) {
			await markNeedsAttention(convex, action._id, PATCH_DRIFT_REASON);
			console.error(statusError);
			return json({ error: 'Launchpad could not save the updated action status' }, { status: 500 });
		}

		return json({ ok: true });
	} catch (error) {
		console.error(error);
		return json(
			{ error: errorMessage(error, 'Could not update Launchpad Action') },
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ request, params }) => {
	try {
		const token = bearerToken(request.headers.get('authorization'));
		if (!token) return json({ error: 'Authentication is required' }, { status: 401 });

		const actionId = params.actionId?.trim() ?? '';
		if (!actionId) return json({ error: 'Launchpad Action id is required' }, { status: 400 });

		const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);
		convex.setAuth(token);
		const action = await convex.query(getLaunchpadActionQuery, {
			actionId: actionId as Id<'launchpadActions'>
		});
		if (!action) return json({ error: 'Launchpad Action not found' }, { status: 404 });

		if (action.triggerId) {
			await deleteComposioTrigger(action.triggerId);
		}

		try {
			await convex.mutation(deleteLaunchpadActionMutation, {
				actionId: action._id
			});
		} catch (deleteError) {
			await markNeedsAttention(convex, action._id, DELETE_DRIFT_REASON);
			console.error(deleteError);
			return json({ error: 'Launchpad could not remove the local action' }, { status: 500 });
		}

		return json({ ok: true });
	} catch (error) {
		console.error(error);
		return json(
			{ error: errorMessage(error, 'Could not delete Launchpad Action') },
			{ status: 500 }
		);
	}
};

function bearerToken(authorization: string | null) {
	if (!authorization?.startsWith('Bearer ')) return '';
	return authorization.slice('Bearer '.length).trim();
}

function errorMessage(error: unknown, fallback: string) {
	return error instanceof Error && error.message ? error.message : fallback;
}

async function markNeedsAttention(
	convex: ConvexHttpClient,
	actionId: Id<'launchpadActions'>,
	reason: string
) {
	try {
		await convex.mutation(markLaunchpadActionNeedsAttentionMutation, {
			actionId,
			reason
		});
	} catch (error) {
		console.error('Could not mark Launchpad Action as needing attention', error);
	}
}

const PATCH_DRIFT_REASON =
	'External trigger state changed, but Launchpad could not save the new status.';
const DELETE_DRIFT_REASON =
	'External trigger was deleted, but Launchpad could not remove the local action.';
