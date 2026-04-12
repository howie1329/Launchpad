// This is a api route that will be used to generate a MVP PPD plan based on the users input.
import { AI_GATEWAY_API_KEY } from '$env/static/private';
import { generateText, Output, createGateway } from 'ai';
import { z } from 'zod';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

const gateway = createGateway({
    apiKey: AI_GATEWAY_API_KEY,
})

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { idea } = await request.json();
        const trimmedIdea = idea.trim();
        if (!trimmedIdea || trimmedIdea.length === 0) {
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
                })
            }),
            prompt: `Generate a PRD for the following idea: ${trimmedIdea}`
        })

        return json(output);


    } catch (error) {
        console.error(error);
        return json({ error: 'Error generating PRD' }, { status: 500 });
    }
}
