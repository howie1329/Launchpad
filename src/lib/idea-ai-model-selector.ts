import {
	ideaAiModelProviderCopy,
	ideaAiModels,
	type IdeaAiModelProvider
} from '$lib/idea-ai-models';

export type IdeaAiModelLogoProvider = 'vercel' | 'openrouter' | 'groq' | 'nvidia';

export type IdeaAiModelProviderGroup = {
	provider: IdeaAiModelProvider;
	heading: string;
	logoProvider: IdeaAiModelLogoProvider;
};

const ideaAiModelProviderOrder: readonly IdeaAiModelProvider[] = [
	'gateway',
	'openrouter',
	'groq',
	'nim'
];

function logoProviderFor(provider: IdeaAiModelProvider): IdeaAiModelLogoProvider {
	if (provider === 'gateway') return 'vercel';
	if (provider === 'nim') return 'nvidia';
	return provider;
}

export const ideaAiModelProviderGroups: readonly IdeaAiModelProviderGroup[] =
	ideaAiModelProviderOrder
		.filter((provider) => ideaAiModels.some((model) => model.provider === provider))
		.map((provider) => ({
			provider,
			heading: ideaAiModelProviderCopy[provider],
			logoProvider: logoProviderFor(provider)
		}));
