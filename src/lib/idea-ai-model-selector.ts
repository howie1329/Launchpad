import {
	ideaAiModelProviderCopy,
	ideaAiModels,
	type IdeaAiModelProvider
} from '$lib/idea-ai-models';

export type IdeaAiModelLogoProvider = 'vercel' | 'openrouter';

export type IdeaAiModelProviderGroup = {
	provider: IdeaAiModelProvider;
	heading: string;
	logoProvider: IdeaAiModelLogoProvider;
};

const ideaAiModelProviderOrder: readonly IdeaAiModelProvider[] = ['gateway', 'openrouter'];

function logoProviderFor(): IdeaAiModelLogoProvider {
	return 'vercel';
}

export const ideaAiModelProviderGroups: readonly IdeaAiModelProviderGroup[] =
	ideaAiModelProviderOrder
		.filter((provider) => ideaAiModels.some((model) => model.provider === provider))
		.map((provider) => ({
			provider,
			heading: ideaAiModelProviderCopy[provider],
			logoProvider: logoProviderFor()
		}));
