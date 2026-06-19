import type { AllowedComposioToolkit } from '../../src/lib/composio-toolkits.ts';
import type { IdeaAiModelId } from '../../src/lib/idea-ai-models.ts';

export type WorkspaceChatEvalFixture = 'general' | 'project';

export type WorkspaceChatEvalMessage = {
	role: 'user' | 'assistant';
	content: string;
};

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
	priorMessages?: WorkspaceChatEvalMessage[];
};

export type WorkspaceChatEvalExpected = {
	mustCallTools?: string[];
	mustNotCallTools?: string[];
	mustRenderOpenUIChoice?: boolean;
	mustNotRenderOpenUIChoice?: boolean;
	expectProactiveDraft?: boolean;
	expectCasualConversation?: boolean;
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
