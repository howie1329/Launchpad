import { createGroq } from '@ai-sdk/groq';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { env } from '$env/dynamic/private';
import { AI_GATEWAY_API_KEY } from '$env/static/private';
import { createGateway } from 'ai';
import {
	getIdeaAiModelById,
	isGroqIdeaModel,
	isNimIdeaModel,
	isOpenRouterIdeaModel,
	type IdeaAiModelId
} from '$lib/idea-ai-models';

const gateway = createGateway({
	apiKey: AI_GATEWAY_API_KEY
});

let openRouterSingleton: ReturnType<typeof createOpenRouter> | undefined;
let groqSingleton: ReturnType<typeof createGroq> | undefined;
let nimSingleton: ReturnType<typeof createOpenAICompatible> | undefined;

function getSingletonProviderOrNull<T>(params: {
	key: string;
	getSingleton: () => T | undefined;
	setSingleton: (provider: T) => void;
	create: () => T;
}) {
	if (!params.key) return null;
	const existing = params.getSingleton();
	if (existing) {
		return existing;
	}
	const created = params.create();
	params.setSingleton(created);
	return created;
}

function getOpenRouterOrNull() {
	const key = env.OPENROUTER_API_KEY?.trim() ?? '';
	return getSingletonProviderOrNull({
		key,
		getSingleton: () => openRouterSingleton,
		setSingleton: (provider) => {
			openRouterSingleton = provider;
		},
		create: () =>
			createOpenRouter({
				apiKey: key,
				appName: 'Launchpad'
			})
	});
}

function getGroqOrNull() {
	const key = env.GROQ_API_KEY?.trim() ?? '';
	return getSingletonProviderOrNull({
		key,
		getSingleton: () => groqSingleton,
		setSingleton: (provider) => {
			groqSingleton = provider;
		},
		create: () => createGroq({ apiKey: key })
	});
}

function getNimOrNull() {
	const key = env.NIM_API_KEY?.trim() ?? '';
	return getSingletonProviderOrNull({
		key,
		getSingleton: () => nimSingleton,
		setSingleton: (provider) => {
			nimSingleton = provider;
		},
		create: () =>
			createOpenAICompatible({
				name: 'nim',
				baseURL: 'https://integrate.api.nvidia.com/v1',
				apiKey: key
			})
	});
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

export class NIMNotConfiguredError extends Error {
	readonly name = 'NIMNotConfiguredError';
	constructor() {
		super(
			'NVIDIA NIM is not configured. Set NIM_API_KEY in the server environment to use NIM models.'
		);
	}
}

/**
 * Returns the AI SDK language model for a catalog id (gateway vs OpenRouter vs Groq).
 * @throws OpenRouterNotConfiguredError when an OpenRouter model is selected but the key is missing.
 * @throws GroqNotConfiguredError when a Groq model is selected but the key is missing.
 * @throws NIMNotConfiguredError when a NIM model is selected but the key is missing.
 */
export function resolveWorkspaceLanguageModel(modelId: IdeaAiModelId) {
	const entry = getIdeaAiModelById(modelId);
	if (!isOpenRouterIdeaModel(entry) && !isGroqIdeaModel(entry) && !isNimIdeaModel(entry)) {
		return gateway(entry.id);
	}
	if (isOpenRouterIdeaModel(entry)) {
		const openrouter = getOpenRouterOrNull();
		if (!openrouter) {
			throw new OpenRouterNotConfiguredError();
		}
		return openrouter.chat(entry.openRouterModel);
	}
	if (isNimIdeaModel(entry)) {
		const nim = getNimOrNull();
		if (!nim) {
			throw new NIMNotConfiguredError();
		}
		return nim.chatModel(entry.nimModel);
	}
	const groq = getGroqOrNull();
	if (!groq) {
		throw new GroqNotConfiguredError();
	}
	return groq(entry.groqModel);
}
