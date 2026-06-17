import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

import {
	deleteLaunchpadActionMutation,
	markLaunchpadActionNeedsAttentionMutation,
	setLaunchpadActionStatusMutation
} from '$lib/launchpad-actions';
import { deleteComposioTrigger, setComposioTriggerEnabled } from '$lib/server/composio';

const { convexClients, convexMockState } = vi.hoisted(() => ({
	convexClients: [] as Array<{
		setAuth: ReturnType<typeof vi.fn>;
		query: ReturnType<typeof vi.fn>;
		mutation: ReturnType<typeof vi.fn>;
	}>,
	convexMockState: {
		queryResult: undefined as unknown,
		mutationImplementation: undefined as
			| ((mutation: unknown, args: unknown) => Promise<unknown>)
			| undefined
	}
}));

vi.mock('$env/static/public', () => ({
	PUBLIC_CONVEX_URL: 'https://convex.example'
}));

vi.mock('convex/browser', () => ({
	ConvexHttpClient: vi.fn().mockImplementation(function () {
		const client = {
			setAuth: vi.fn(),
			query: vi.fn().mockImplementation(async () => convexMockState.queryResult),
			mutation: vi
				.fn()
				.mockImplementation(async (mutation, args) =>
					convexMockState.mutationImplementation
						? convexMockState.mutationImplementation(mutation, args)
						: { ok: true }
				)
		};
		convexClients.push(client);
		return client;
	})
}));

vi.mock('$lib/server/composio', () => ({
	deleteComposioTrigger: vi.fn(),
	setComposioTriggerEnabled: vi.fn()
}));

describe('Launchpad Action route', () => {
	beforeEach(() => {
		convexClients.length = 0;
		convexMockState.queryResult = action;
		convexMockState.mutationImplementation = undefined;
		vi.mocked(deleteComposioTrigger).mockReset();
		vi.mocked(setComposioTriggerEnabled).mockReset();
	});

	it('toggles Composio and updates Convex status on PATCH success', async () => {
		vi.mocked(setComposioTriggerEnabled).mockResolvedValue(undefined);
		const { PATCH } = await import('./+server');

		const response = await PATCH(requestEvent({ method: 'PATCH', body: { enabled: false } }));
		const client = latestConvexClient();

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(setComposioTriggerEnabled).toHaveBeenCalledWith('trigger_123', false);
		expect(client.mutation).toHaveBeenCalledWith(setLaunchpadActionStatusMutation, {
			actionId: action._id,
			status: 'disabled'
		});
	});

	it('does not mutate Convex status when PATCH Composio toggle fails', async () => {
		vi.mocked(setComposioTriggerEnabled).mockRejectedValue(new Error('Composio unavailable'));
		const { PATCH } = await import('./+server');

		const response = await PATCH(requestEvent({ method: 'PATCH', body: { enabled: true } }));
		const client = latestConvexClient();

		expect(response.status).toBe(500);
		expect(client.mutation).not.toHaveBeenCalled();
	});

	it('marks needs_attention when PATCH Convex status update fails after Composio succeeds', async () => {
		convexMockState.mutationImplementation = async (mutation) => {
			if (mutation === setLaunchpadActionStatusMutation) {
				throw new Error('Convex write failed');
			}
			return { ok: true };
		};
		vi.mocked(setComposioTriggerEnabled).mockResolvedValue(undefined);
		const { PATCH } = await import('./+server');

		const response = await PATCH(requestEvent({ method: 'PATCH', body: { enabled: true } }));
		const client = latestConvexClient();

		expect(response.status).toBe(500);
		expect(client.mutation).toHaveBeenCalledWith(markLaunchpadActionNeedsAttentionMutation, {
			actionId: action._id,
			reason: 'External trigger state changed, but Launchpad could not save the new status.'
		});
	});

	it('deletes Composio and then deletes the Convex action on DELETE success', async () => {
		vi.mocked(deleteComposioTrigger).mockResolvedValue(undefined);
		const { DELETE } = await import('./+server');

		const response = await DELETE(requestEvent({ method: 'DELETE' }));
		const client = latestConvexClient();

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(deleteComposioTrigger).toHaveBeenCalledWith('trigger_123');
		expect(client.mutation).toHaveBeenCalledWith(deleteLaunchpadActionMutation, {
			actionId: action._id
		});
	});

	it('does not mutate Convex when DELETE Composio removal fails', async () => {
		vi.mocked(deleteComposioTrigger).mockRejectedValue(new Error('Composio delete failed'));
		const { DELETE } = await import('./+server');

		const response = await DELETE(requestEvent({ method: 'DELETE' }));
		const client = latestConvexClient();

		expect(response.status).toBe(500);
		expect(client.mutation).not.toHaveBeenCalled();
	});

	it('marks needs_attention when DELETE Convex removal fails after Composio succeeds', async () => {
		convexMockState.mutationImplementation = async (mutation) => {
			if (mutation === deleteLaunchpadActionMutation) {
				throw new Error('Convex delete failed');
			}
			return { ok: true };
		};
		vi.mocked(deleteComposioTrigger).mockResolvedValue(undefined);
		const { DELETE } = await import('./+server');

		const response = await DELETE(requestEvent({ method: 'DELETE' }));
		const client = latestConvexClient();

		expect(response.status).toBe(500);
		expect(client.mutation).toHaveBeenCalledWith(markLaunchpadActionNeedsAttentionMutation, {
			actionId: action._id,
			reason: 'External trigger was deleted, but Launchpad could not remove the local action.'
		});
	});
});

function latestConvexClient() {
	return convexClients[convexClients.length - 1];
}

function requestEvent({
	method,
	body
}: {
	method: 'PATCH' | 'DELETE';
	body?: Record<string, unknown>;
}) {
	return {
		params: { actionId: action._id },
		request: new Request(`https://launchpad.test/api/workspace/launchpad-actions/${action._id}`, {
			method,
			headers: {
				authorization: 'Bearer test-token',
				...(body ? { 'content-type': 'application/json' } : {})
			},
			body: body ? JSON.stringify(body) : undefined
		})
	} as RequestEvent;
}

const action = {
	_id: 'action_123',
	_creationTime: 1,
	ownerId: 'user_123',
	projectId: 'project_123',
	provider: 'github',
	sourceKind: 'github_repository',
	sourceId: 'acme/app',
	sourceName: 'acme/app',
	triggerSlug: 'github_pr',
	triggerId: 'trigger_123',
	status: 'active',
	createdAt: 1,
	updatedAt: 1
};
