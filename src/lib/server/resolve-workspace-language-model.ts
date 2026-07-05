import { AI_GATEWAY_API_KEY } from '$env/static/private';
import { createGateway } from 'ai';
import { getIdeaAiModelById, isOpenRouterIdeaModel, type IdeaAiModelId } from '$lib/idea-ai-models';

const gateway = createGateway({
	apiKey: AI_GATEWAY_API_KEY
});

/**
 * Returns the AI SDK language model for a catalog id.
 */
export function resolveWorkspaceLanguageModel(modelId: IdeaAiModelId) {
	const entry = getIdeaAiModelById(modelId);
	if (!isOpenRouterIdeaModel(entry)) {
		return gateway(entry.id);
	}
	return gateway(entry.openRouterModel);
}
