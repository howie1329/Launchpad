export type IdeaAiModelProvider = 'gateway' | 'openrouter' | 'groq';

type BaseIdeaModel = {
	label: string;
	maxContextTokens: number;
	/** USD per 1M tokens (approximate; used for cap estimation). */
	inputCostPerMillionTokens: number;
	outputCostPerMillionTokens: number;
};

type GatewayIdeaModel = BaseIdeaModel & {
	provider: 'gateway';
	id: string;
	/** If set, cache reads are billed at this $/M rate in UI estimates (see context ring). */
	cachedInputCostPerMillionTokens?: number;
};

type OpenRouterIdeaModel = BaseIdeaModel & {
	provider: 'openrouter';
	/** Stable catalog id; avoids collisions with gateway `openai/...` slugs. */
	id: `or:${string}`;
	/** OpenRouter API model slug (e.g. anthropic/claude-3.5-haiku). */
	openRouterModel: string;
};

type GroqIdeaModel = BaseIdeaModel & {
	provider: 'groq';
	/** Stable catalog id; avoids collisions with gateway model ids. */
	id: `gq:${string}`;
	/** Groq API model slug (e.g. llama-3.3-70b-versatile). */
	groqModel: string;
};

export type IdeaAiModel = GatewayIdeaModel | OpenRouterIdeaModel | GroqIdeaModel;

export const ideaAiModels: readonly IdeaAiModel[] = [
	{
		id: 'openai/gpt-5.4-nano',
		label: 'GPT-5.4 Nano',
		provider: 'gateway',
		maxContextTokens: 400_000,
		inputCostPerMillionTokens: 0.2,
		outputCostPerMillionTokens: 1.25,
		cachedInputCostPerMillionTokens: 0.02
	},
	{
		id: 'openai/gpt-5.4-mini',
		label: 'GPT-5.4 Mini',
		provider: 'gateway',
		maxContextTokens: 400_000,
		inputCostPerMillionTokens: 0.75,
		outputCostPerMillionTokens: 4.5,
		cachedInputCostPerMillionTokens: 0.075
	},
	{
		id: 'openai/gpt-5.4',
		label: 'GPT-5.4',
		provider: 'gateway',
		maxContextTokens: 1_000_000,
		inputCostPerMillionTokens: 2.5,
		outputCostPerMillionTokens: 15,
		cachedInputCostPerMillionTokens: 0.25
	},
	{
		id: 'or:arcee-ai/trinity-mini',
		label: 'Trinity Mini',
		provider: 'openrouter',
		openRouterModel: 'arcee-ai/trinity-mini',
		maxContextTokens: 131_000,
		inputCostPerMillionTokens: 0.045,
		outputCostPerMillionTokens: 0.15
	},
	{
		id: 'or:openai/gpt-4o-mini',
		label: 'GPT-4o mini',
		provider: 'openrouter',
		openRouterModel: 'openai/gpt-4o-mini',
		maxContextTokens: 128_000,
		inputCostPerMillionTokens: 0.15,
		outputCostPerMillionTokens: 0.6
	},
	{
		id: 'or:anthropic/claude-3.5-haiku',
		label: 'Claude 3.5 Haiku',
		provider: 'openrouter',
		openRouterModel: 'anthropic/claude-3.5-haiku',
		maxContextTokens: 200_000,
		inputCostPerMillionTokens: 0.8,
		outputCostPerMillionTokens: 4
	},
	{
		id: 'or:minimax/minimax-m2.5:free',
		label: 'Minimax M2.5',
		provider: 'openrouter',
		openRouterModel: 'minimax/minimax-m2.5:free',
		maxContextTokens: 196_000,
		inputCostPerMillionTokens: 0.0,
		outputCostPerMillionTokens: 0.0
	},
	{
		id: 'gq:llama-3.3-70b-versatile',
		label: 'Llama 3.3 70B',
		provider: 'groq',
		groqModel: 'llama-3.3-70b-versatile',
		maxContextTokens: 128_000,
		inputCostPerMillionTokens: 0.59,
		outputCostPerMillionTokens: 0.79
	},
	{
		id: 'gq:llama-3.1-8b-instant',
		label: 'Llama 3.1 8B Instant',
		provider: 'groq',
		groqModel: 'llama-3.1-8b-instant',
		maxContextTokens: 128_000,
		inputCostPerMillionTokens: 0.05,
		outputCostPerMillionTokens: 0.08
	}

] as const satisfies readonly IdeaAiModel[];

export type IdeaAiModelId = (typeof ideaAiModels)[number]['id'];

export const defaultIdeaAiModelId: IdeaAiModelId = ideaAiModels[0].id;

export function isIdeaAiModelId(value: unknown): value is IdeaAiModelId {
	return typeof value === 'string' && ideaAiModels.some((model) => model.id === value);
}

export function getIdeaAiModelById(id: IdeaAiModelId): IdeaAiModel {
	const model = ideaAiModels.find((m) => m.id === id);
	if (!model) {
		throw new Error(`Unknown idea AI model: ${id}`);
	}
	return model;
}

export function isOpenRouterIdeaModel(model: IdeaAiModel): model is OpenRouterIdeaModel {
	return model.provider === 'openrouter';
}

export function isGroqIdeaModel(model: IdeaAiModel): model is GroqIdeaModel {
	return model.provider === 'groq';
}

export function getModelSelectorLogoProvider(model: IdeaAiModel): 'vercel' | 'openrouter' | 'groq' {
	if (model.provider === 'openrouter') return 'openrouter';
	if (model.provider === 'groq') return 'groq';
	return 'vercel';
}

/** For UI: section lists and labels. */
export const ideaAiModelProviderCopy: Record<IdeaAiModelProvider, string> = {
	gateway: 'Vercel AI Gateway',
	openrouter: 'OpenRouter',
	groq: 'Groq'
};

export function listIdeaModelsByProvider(provider: IdeaAiModelProvider): readonly IdeaAiModel[] {
	return ideaAiModels.filter((m) => m.provider === provider);
}

/** Client context ring: per-model $/M input/output (+ optional cache read). */
export function getClientModelCostTable(): Record<
	string,
	{ input: number; output: number; cacheRead?: number; reasoning?: number }
> {
	const out: Record<
		string,
		{ input: number; output: number; cacheRead?: number; reasoning?: number }
	> = {};
	for (const m of ideaAiModels) {
		const base = {
			input: m.inputCostPerMillionTokens,
			output: m.outputCostPerMillionTokens,
			reasoning: m.outputCostPerMillionTokens
		};
		if (m.provider === 'gateway' && m.cachedInputCostPerMillionTokens != null) {
			out[m.id] = { ...base, cacheRead: m.cachedInputCostPerMillionTokens };
		} else {
			out[m.id] = { ...base };
		}
	}
	return out;
}
