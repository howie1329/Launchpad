import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { env } from '$env/dynamic/private';
import { AI_GATEWAY_API_KEY } from '$env/static/private';
import { createGateway } from 'ai';
import { getIdeaAiModelById, isOpenRouterIdeaModel, type IdeaAiModelId } from '$lib/idea-ai-models';

const gateway = createGateway({
	apiKey: AI_GATEWAY_API_KEY
});

let openRouterSingleton: ReturnType<typeof createOpenRouter> | undefined;

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

export class OpenRouterNotConfiguredError extends Error {
	readonly name = 'OpenRouterNotConfiguredError';
	constructor() {
		super(
			'OpenRouter is not configured. Set OPENROUTER_API_KEY in the server environment to use OpenRouter models.'
		);
	}
}

/**
 * Returns the AI SDK language model for a catalog id (gateway vs OpenRouter).
 * @throws OpenRouterNotConfiguredError when an OpenRouter model is selected but the key is missing.
 */
export function resolveWorkspaceLanguageModel(modelId: IdeaAiModelId) {
	const entry = getIdeaAiModelById(modelId);
	if (!isOpenRouterIdeaModel(entry)) {
		return gateway(entry.id);
	}
	const openrouter = getOpenRouterOrNull();
	if (!openrouter) {
		throw new OpenRouterNotConfiguredError();
	}
	return openrouter.chat(entry.openRouterModel);
}
