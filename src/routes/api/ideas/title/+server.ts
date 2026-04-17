import { AI_GATEWAY_API_KEY } from '$env/static/private';
import { isIdeaAiModelId } from '$lib/idea-ai-models';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { createGateway, generateText, safeValidateUIMessages, type UIMessage } from 'ai';

const gateway = createGateway({
	apiKey: AI_GATEWAY_API_KEY
});

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

		const transcript = validation.data
			.slice(0, 6)
			.map((message) => `${message.role}: ${extractText(message)}`)
			.filter((line) => !line.endsWith(': '))
			.join('\n')
			.slice(0, 4000);

		const { text } = await generateText({
			model: gateway(body.modelId),
			prompt: `Create a short sidebar title for this product idea conversation.

Rules:
- 3 to 7 words
- No quotation marks
- Title case is okay
- Be specific, not generic

Conversation:
${transcript}`
		});

		return json({ title: cleanTitle(text) });
	} catch (error) {
		console.error(error);
		return json({ error: 'Error generating idea title' }, { status: 500 });
	}
};

function extractText(message: UIMessage) {
	return message.parts
		.filter((part) => part.type === 'text')
		.map((part) => part.text)
		.join('\n')
		.trim();
}

function cleanTitle(value: string) {
	const title = value
		.trim()
		.replace(/^['\"]+|['\"]+$/g, '')
		.replace(/\s+/g, ' ');

	return title.length > 80 ? `${title.slice(0, 77)}...` : title || 'Untitled idea';
}
