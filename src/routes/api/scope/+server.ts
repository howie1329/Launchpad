import { AI_GATEWAY_API_KEY } from '$env/static/private';
import { createGateway, generateText, Output } from 'ai';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { z } from 'zod';

const gateway = createGateway({
	apiKey: AI_GATEWAY_API_KEY
});

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const idea = body.idea;
		const appType = typeof body.appType === 'string' ? body.appType.trim() : '';
		const projectType = typeof body.projectType === 'string' ? body.projectType.trim() : '';
		const preferredStack =
			typeof body.preferredStack === 'string' ? body.preferredStack.trim() : '';

		if (typeof idea !== 'string') {
			return json({ error: 'Idea is required' }, { status: 400 });
		}

		const trimmedIdea = idea.trim();

		if (!trimmedIdea) {
			return json({ error: 'Idea is required' }, { status: 400 });
		}

		const { output } = await generateText({
			model: gateway('openai/gpt-5.4-nano'),
			output: Output.object({
				schema: z.object({
					problemStatement: z.string(),
					targetUser: z.string(),
					mustHaveFeatures: z.array(z.string()),
					outOfScope: z.array(z.string()),
					suggestedStack: z.string(),
					fullMVPPlan: z.string(),
					projectType: z.string()
				})
			}),
			prompt: `Generate a focused MVP PRD for this idea.

Idea:
${trimmedIdea}

Project type:
${projectType || 'Not specified'}

App type:
${appType || 'Not specified'}

Preferred stack:
${preferredStack || 'Not specified'}

Return a practical first-version scope for a solo developer. Keep the must-have features small, put nonessential ideas out of scope, and make the one-week build plan concrete.`
		});

		return json(output);
	} catch (error) {
		console.error(error);
		return json({ error: 'Error generating PRD' }, { status: 500 });
	}
};
