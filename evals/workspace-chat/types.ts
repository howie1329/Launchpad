import type { AllowedComposioToolkit } from '../../src/lib/server/composio.ts';
import type { IdeaAiModelId } from '../../src/lib/idea-ai-models.ts';

export type WorkspaceChatEvalFixture = 'general' | 'project';

export type WorkspaceChatEvalInput = {
	userMessage: string;
	fixture: WorkspaceChatEvalFixture;
	modelId?: IdeaAiModelId;
	webSearchRequested?: boolean;
	composioToolkits?: AllowedComposioToolkit[];
	referencedBlock?: string;
	profileBlock?: string;
	memoryBlock?: string;
	userBehaviorMarkdown?: string;
};

export type WorkspaceChatEvalExpected = {
	mustCallTools?: string[];
	mustNotCallTools?: string[];
	expectProactiveDraft?: boolean;
};

export type WorkspaceChatEvalMetadata = {
	category: string;
};

export type WorkspaceChatToolCallRecord = {
	toolName: string;
	input: unknown;
};

export type WorkspaceChatEvalOutput = {
	text: string;
	toolCalls: WorkspaceChatToolCallRecord[];
};
