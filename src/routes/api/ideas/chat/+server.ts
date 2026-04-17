import { AI_GATEWAY_API_KEY } from '$env/static/private';
import { isIdeaAiModelId } from '$lib/idea-ai-models';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import {
	convertToModelMessages,
	createGateway,
	safeValidateUIMessages,
	streamText,
	type UIMessage
} from 'ai';

const gateway = createGateway({
	apiKey: AI_GATEWAY_API_KEY
});

const system = `You are Launchpad's idea intake partner. Help the user turn a rough product idea into a clearer problem, audience, and next step through conversation.

Be concise, practical, and collaborative. Ask one or two sharp follow-up questions when context is missing. Do not produce a full PRD unless the user explicitly asks for one. Do not invent structured database fields.`;

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const ideaId = typeof body.ideaId === 'string' ? body.ideaId : '';
		const validation = await safeValidateUIMessages<UIMessage>({ messages: body.messages });

		if (!ideaId) {
			return json({ error: 'Idea id is required' }, { status: 400 });
		}

		if (!isIdeaAiModelId(body.modelId)) {
			return json({ error: 'Unsupported model' }, { status: 400 });
		}

		if (!validation.success) {
			return json({ error: 'Invalid chat messages' }, { status: 400 });
		}

		const messages = validation.data;
		const result = streamText({
			model: gateway(body.modelId),
			system,
			messages: await convertToModelMessages(messages)
		});

		return result.toUIMessageStreamResponse({ originalMessages: messages });
	} catch (error) {
		console.error(error);
		return json({ error: 'Error generating idea chat response' }, { status: 500 });
	}
};
