import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createGateway } from 'ai';
import {
	getIdeaAiModelById,
	isIdeaAiModelId,
	isOpenRouterIdeaModel,
	type IdeaAiModelId
} from '../../src/lib/idea-ai-models.ts';

export type WorkspaceChatEvalProvider = 'gateway' | 'openrouter';

const DEFAULT_GATEWAY_MODEL_ID = 'openai/gpt-5.4-nano' satisfies IdeaAiModelId;
const DEFAULT_OPENROUTER_MODEL_ID = 'or:openai/gpt-5.4-nano' satisfies IdeaAiModelId;

/** Which LLM backend evals use (`gateway` default). */
export function resolveWorkspaceChatEvalProvider(): WorkspaceChatEvalProvider {
	const raw = process.env.WORKSPACE_CHAT_EVAL_PROVIDER?.trim().toLowerCase();
	if (raw === 'openrouter') return 'openrouter';
	return 'gateway';
}

export function defaultEvalModelIdForProvider(provider: WorkspaceChatEvalProvider): IdeaAiModelId {
	return provider === 'openrouter' ? DEFAULT_OPENROUTER_MODEL_ID : DEFAULT_GATEWAY_MODEL_ID;
}

export function resolveEvalModelId(provider?: WorkspaceChatEvalProvider): IdeaAiModelId {
	const activeProvider = provider ?? resolveWorkspaceChatEvalProvider();
	const fromEnv = process.env.WORKSPACE_CHAT_EVAL_MODEL_ID?.trim();

	if (fromEnv) {
		if (!isIdeaAiModelId(fromEnv)) {
			throw new Error(`WORKSPACE_CHAT_EVAL_MODEL_ID is not a known catalog id: ${fromEnv}`);
		}
		const entry = getIdeaAiModelById(fromEnv);
		if (entry.provider !== activeProvider) {
			throw new Error(
				`WORKSPACE_CHAT_EVAL_MODEL_ID "${fromEnv}" uses provider "${entry.provider}" but WORKSPACE_CHAT_EVAL_PROVIDER is "${activeProvider}".`
			);
		}
		return fromEnv;
	}

	return defaultEvalModelIdForProvider(activeProvider);
}

export function resolveEvalLanguageModel(modelId?: IdeaAiModelId) {
	const provider = resolveWorkspaceChatEvalProvider();
	const id = modelId ?? resolveEvalModelId(provider);
	const entry = getIdeaAiModelById(id);

	if (entry.provider !== provider) {
		throw new Error(
			`Model "${id}" uses provider "${entry.provider}" but WORKSPACE_CHAT_EVAL_PROVIDER is "${provider}".`
		);
	}

	if (provider === 'gateway') {
		const apiKey = process.env.AI_GATEWAY_API_KEY?.trim();
		if (!apiKey) {
			throw new Error(
				'AI_GATEWAY_API_KEY is required for workspace chat evals when WORKSPACE_CHAT_EVAL_PROVIDER=gateway.'
			);
		}
		const gateway = createGateway({ apiKey });
		return gateway(entry.id);
	}

	const apiKey = process.env.OPENROUTER_API_KEY?.trim();
	if (!apiKey) {
		throw new Error(
			'OPENROUTER_API_KEY is required for workspace chat evals when WORKSPACE_CHAT_EVAL_PROVIDER=openrouter.'
		);
	}

	if (!isOpenRouterIdeaModel(entry)) {
		throw new Error(`Expected an OpenRouter catalog model for "${id}".`);
	}

	const openrouter = createOpenRouter({
		apiKey,
		appName: 'Launchpad'
	});
	return openrouter.chat(entry.openRouterModel);
}

/** Judge scorer model; uses same provider, optional WORKSPACE_CHAT_EVAL_JUDGE_MODEL catalog id. */
export function resolveEvalJudgeLanguageModel() {
	const judgeId = process.env.WORKSPACE_CHAT_EVAL_JUDGE_MODEL?.trim();
	if (judgeId && isIdeaAiModelId(judgeId)) {
		return resolveEvalLanguageModel(judgeId);
	}
	return resolveEvalLanguageModel();
}
