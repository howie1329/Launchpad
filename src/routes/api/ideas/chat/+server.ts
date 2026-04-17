import { AI_GATEWAY_API_KEY } from '$env/static/private';
import { isIdeaAiModelId } from '$lib/idea-ai-models';
import { normalizeStructuredPatch, updateIdeaStructuredInputSchema } from '$lib/idea-structured';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import {
	convertToModelMessages,
	createGateway,
	safeValidateUIMessages,
	stepCountIs,
	streamText,
	tool,
	zodSchema,
	type UIMessage
} from 'ai';

const gateway = createGateway({
	apiKey: AI_GATEWAY_API_KEY
});

const structuredIdeaTool = tool({
	description: `Update Launchpad's structured idea snapshot for this conversation's idea. Call this whenever you extract or refine: a one-line hook, the core problem, who it is for, an optional source, and/or a lightweight score (pain, urgency, monetization, distribution, build effort, founder fit) plus a short summary. Omit fields you are not changing. After updating, reply briefly in normal text (what changed or what to explore next).`,
	inputSchema: zodSchema(updateIdeaStructuredInputSchema),
	execute: async (input) => normalizeStructuredPatch(input)
});

const system = `You are Launchpad's idea intake partner. Help the user turn a rough product idea into a clearer problem, audience, and next step through conversation.

Be concise, practical, and collaborative. Ask one or two sharp follow-up questions when context is missing.

Whenever you have enough signal to refine the structured snapshot, call the updateIdeaStructured tool with only the fields you are updating (partial updates are encouraged). Do not stuff long prose into structured fields—keep them short and scannable. Still include a brief natural-language reply after tool use when it helps the user.`;

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
			messages: await convertToModelMessages(messages),
			tools: {
				updateIdeaStructured: structuredIdeaTool
			},
			stopWhen: stepCountIs(12)
		});

		return result.toUIMessageStreamResponse({ originalMessages: messages });
	} catch (error) {
		console.error(error);
		return json({ error: 'Error generating idea chat response' }, { status: 500 });
	}
};
