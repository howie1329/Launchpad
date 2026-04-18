export const ideaAiModels = [
	{ id: 'openai/gpt-5.4-nano', label: 'GPT-5.4 Nano', maxContextTokens: 400000 },
	{ id: 'openai/gpt-5.4-mini', label: 'GPT-5.4 Mini', maxContextTokens: 400000 },
	{ id: 'openai/gpt-5.4', label: 'GPT-5.4', maxContextTokens: 1000000 }
] as const;

export type IdeaAiModelId = (typeof ideaAiModels)[number]['id'];

export const defaultIdeaAiModelId = ideaAiModels[0].id;

export function isIdeaAiModelId(value: unknown): value is IdeaAiModelId {
	return typeof value === 'string' && ideaAiModels.some((model) => model.id === value);
}
