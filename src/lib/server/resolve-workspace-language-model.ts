import { createGroq } from '@ai-sdk/groq';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { env } from '$env/dynamic/private';
import { AI_GATEWAY_API_KEY } from '$env/static/private';
import { createGateway } from 'ai';
import {
	getIdeaAiModelById,
	isGroqIdeaModel,
	isOpenRouterIdeaModel,
	type IdeaAiModelId
} from '$lib/idea-ai-models';

const gateway = createGateway({
	apiKey: AI_GATEWAY_API_KEY
});

let openRouterSingleton: ReturnType<typeof createOpenRouter> | undefined;
let groqSingleton: ReturnType<typeof createGroq> | undefined;

function getOpenRouterOrNull() {
	const key = env.OPENROUTER_API_KEY?.trim();
	if (!key) return null;
	if (!openRouterSingleton) {
		openRouterSingleton = createOpenRouter({
			apiKey: key,
			appName: 'Launchpad'
		});
	}
	return openRouterSingleton;
}

function getGroqOrNull() {
	const key = env.GROQ_API_KEY?.trim();
	if (!key) return null;
	if (!groqSingleton) {
		groqSingleton = createGroq({ apiKey: key });
	}
	return groqSingleton;
}

export class OpenRouterNotConfiguredError extends Error {
	readonly name = 'OpenRouterNotConfiguredError';
	constructor() {
		super(
			'OpenRouter is not configured. Set OPENROUTER_API_KEY in the server environment to use OpenRouter models.'
		);
	}
}

export class GroqNotConfiguredError extends Error {
	readonly name = 'GroqNotConfiguredError';
	constructor() {
		super('Groq is not configured. Set GROQ_API_KEY in the server environment to use Groq models.');
	}
}

/**
 * Returns the AI SDK language model for a catalog id (gateway vs OpenRouter vs Groq).
 * @throws OpenRouterNotConfiguredError when an OpenRouter model is selected but the key is missing.
 * @throws GroqNotConfiguredError when a Groq model is selected but the key is missing.
 */
export function resolveWorkspaceLanguageModel(modelId: IdeaAiModelId) {
	const entry = getIdeaAiModelById(modelId);
	if (!isOpenRouterIdeaModel(entry) && !isGroqIdeaModel(entry)) {
		return gateway(entry.id);
	}
	if (isOpenRouterIdeaModel(entry)) {
		const openrouter = getOpenRouterOrNull();
		if (!openrouter) {
			throw new OpenRouterNotConfiguredError();
		}
		return openrouter.chat(entry.openRouterModel);
	}
	const groq = getGroqOrNull();
	if (!groq) {
		throw new GroqNotConfiguredError();
	}
	return groq(entry.groqModel);
}
