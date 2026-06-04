import { createGateway } from 'ai';
import {
	getIdeaAiModelById,
	isIdeaAiModelId,
	type IdeaAiModelId
} from '../../src/lib/idea-ai-models.ts';

const DEFAULT_EVAL_MODEL_ID = 'openai/gpt-5.4-nano' satisfies IdeaAiModelId;

export function resolveEvalModelId(): IdeaAiModelId {
	const fromEnv = process.env.WORKSPACE_CHAT_EVAL_MODEL_ID?.trim();
	if (fromEnv && isIdeaAiModelId(fromEnv)) {
		return fromEnv;
	}
	return DEFAULT_EVAL_MODEL_ID;
}

export function resolveEvalLanguageModel(modelId?: IdeaAiModelId) {
	const id = modelId ?? resolveEvalModelId();
	const entry = getIdeaAiModelById(id);
	if (entry.provider !== 'gateway') {
		throw new Error(
			`Eval harness currently supports gateway models only. Got ${id} (${entry.provider}). Set WORKSPACE_CHAT_EVAL_MODEL_ID to a gateway catalog id.`
		);
	}

	const apiKey = process.env.AI_GATEWAY_API_KEY?.trim();
	if (!apiKey) {
		throw new Error('AI_GATEWAY_API_KEY is required to run workspace chat evals.');
	}

	const gateway = createGateway({ apiKey });
	return gateway(entry.id);
}
