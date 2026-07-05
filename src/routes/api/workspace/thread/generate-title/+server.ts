import { AI_GATEWAY_API_KEY } from '$env/static/private';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { getThreadQuery, listMessagesQuery, setThreadGeneratedTitleMutation } from '$lib/chat';
import { utilityAiModelId } from '$lib/idea-ai-models';
import { normalizeGeneratedThreadTitle, PLACEHOLDER_THREAD_TITLE } from '$lib/thread-title';
import {
	recordAiRunMutation,
	releaseAiBudgetReservationMutation,
	reserveAiBudgetMutation
} from '$lib/usage';
import { ConvexHttpClient } from 'convex/browser';
import { createGateway, generateText } from 'ai';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import type { Id } from '../../../../../convex/_generated/dataModel';

const TITLE_MODEL_ID = utilityAiModelId;

const gateway = createGateway({
	apiKey: AI_GATEWAY_API_KEY
});

export const POST: RequestHandler = async ({ request }) => {
	try {
		const token = bearerToken(request.headers.get('authorization'));
		if (!token) {
			return json({ error: 'Authentication is required' }, { status: 401 });
		}

		let body: { threadId?: string };
		try {
			body = await request.json();
		} catch {
			return json({ error: 'Invalid JSON' }, { status: 400 });
		}

		const threadId = typeof body.threadId === 'string' ? body.threadId.trim() : '';
		if (!threadId) {
			return json({ error: 'Thread id is required' }, { status: 400 });
		}

		const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);
		convex.setAuth(token);

		const thread = await convex.query(getThreadQuery, {
			threadId: threadId as Id<'chatThreads'>
		});

		if (!thread) {
			return json({ error: 'Thread not found' }, { status: 404 });
		}

		if (thread.titleGeneratedAt !== undefined) {
			return json({ ok: true, skipped: 'already_generated' });
		}
		if (thread.title !== PLACEHOLDER_THREAD_TITLE) {
			return json({ ok: true, skipped: 'not_placeholder' });
		}

		const messages = await convex.query(listMessagesQuery, {
			threadId: threadId as Id<'chatThreads'>
		});

		const hasAssistant = messages.some((m) => m.role === 'assistant');
		if (!hasAssistant) {
			return json({ ok: true, skipped: 'no_assistant' });
		}

		const lines: string[] = [];
		for (const m of messages.slice(0, 8)) {
			const preview = m.text.trim().slice(0, 500);
			if (!preview) continue;
			lines.push(`${m.role}: ${preview}`);
		}
		const transcript = lines.join('\n\n');

		const prompt = `Based on this short chat transcript, propose a concise thread title for a sidebar list (max 8 words, no quotation marks, no trailing period, describe the topic — not the word "Chat").

${transcript}

Reply with ONLY the title, nothing else.`;

		const reservation = await convex.mutation(reserveAiBudgetMutation, {
			sourceKind: 'chatThread',
			sourceId: thread._id,
			modelId: TITLE_MODEL_ID
		});
		if (!reservation.ok) {
			return json(
				{
					error: 'Daily AI limit reached',
					capUsd: reservation.budget.capUsd,
					spentUsd: reservation.budget.spentUsd,
					dateKey: reservation.budget.dateKey
				},
				{ status: 429 }
			);
		}

		try {
			const result = await generateText({
				model: gateway(TITLE_MODEL_ID),
				prompt,
				maxOutputTokens: 64,
				temperature: 0.3
			});

			const normalized = normalizeGeneratedThreadTitle(result.text);
			if (!normalized) {
				await convex.mutation(releaseAiBudgetReservationMutation, {
					reservationId: reservation.reservationId
				});
				return json({ error: 'Could not produce a title' }, { status: 422 });
			}

			const occurredAt = Date.now();
			const patchResult = await convex.mutation(setThreadGeneratedTitleMutation, {
				threadId: threadId as Id<'chatThreads'>,
				title: normalized,
				titleGeneratedAt: occurredAt
			});

			if (!patchResult.updated) {
				await convex.mutation(releaseAiBudgetReservationMutation, {
					reservationId: reservation.reservationId
				});
				return json({ ok: true, skipped: 'race_or_guard' });
			}

			const usage = result.usage;
			const reasoningTokens = usage.outputTokenDetails?.reasoningTokens;
			const cachedInputTokens = usage.inputTokenDetails?.cacheReadTokens;
			if (
				usage &&
				((usage.inputTokens ?? 0) > 0 ||
					(usage.outputTokens ?? 0) > 0 ||
					(reasoningTokens ?? 0) > 0 ||
					(cachedInputTokens ?? 0) > 0)
			) {
				await convex.mutation(recordAiRunMutation, {
					threadId: threadId as Id<'chatThreads'>,
					modelId: TITLE_MODEL_ID,
					occurredAt,
					usage: {
						inputTokens: usage.inputTokens,
						outputTokens: usage.outputTokens,
						reasoningTokens,
						cachedInputTokens
					},
					reservationId: reservation.reservationId
				});
			} else {
				await convex.mutation(releaseAiBudgetReservationMutation, {
					reservationId: reservation.reservationId
				});
			}

			return json({ ok: true, title: normalized });
		} catch (error) {
			await convex.mutation(releaseAiBudgetReservationMutation, {
				reservationId: reservation.reservationId
			});
			throw error;
		}
	} catch (error) {
		console.error(error);
		return json({ error: 'Error generating thread title' }, { status: 500 });
	}
};

function bearerToken(authorization: string | null) {
	if (!authorization?.startsWith('Bearer ')) return '';
	return authorization.slice('Bearer '.length).trim();
}
