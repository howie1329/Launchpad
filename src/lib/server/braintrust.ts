import { env } from '$env/dynamic/private';
import type { AllowedComposioToolkit } from '$lib/server/composio';
import type { ChatScopeType } from '$lib/chat';
import type { IdeaAiModelId } from '$lib/idea-ai-models';
import * as ai from 'ai';
import { initLogger, traced, wrapAISDK } from 'braintrust';
import type { Id } from '../../convex/_generated/dataModel';

const DEFAULT_PROJECT_NAME = 'Launchpad Workspace Chat';

export type WorkspaceChatTraceMetadata = {
	threadId: Id<'chatThreads'>;
	modelId: IdeaAiModelId;
	scopeType: ChatScopeType;
	projectId?: Id<'projects'>;
	webSearchRequested: boolean;
	composioToolkits: AllowedComposioToolkit[];
	hasReferencedArtifacts: boolean;
	composioAvailable: boolean;
};

/** True when Braintrust workspace chat tracing is configured and explicitly enabled. */
export function isBraintrustTracingEnabled(): boolean {
	const apiKey = env.BRAINTRUST_API_KEY?.trim();
	const enabled = env.BRAINTRUST_TRACING_ENABLED?.trim().toLowerCase();
	return Boolean(apiKey) && enabled === 'true';
}

let loggerInitialized = false;
let wrappedAi: typeof ai | null = null;

function ensureBraintrustLogger(): void {
	if (loggerInitialized) return;

	initLogger({
		apiKey: env.BRAINTRUST_API_KEY!.trim(),
		projectName: env.BRAINTRUST_PROJECT_NAME?.trim() || DEFAULT_PROJECT_NAME
	});
	loggerInitialized = true;
}

/**
 * Runs workspace chat agent work inside a Braintrust parent span when tracing is enabled.
 * Attaches low-PII metadata only (no instructions, messages, or artifact content).
 */
export function traceWorkspaceChatRun<R>(metadata: WorkspaceChatTraceMetadata, run: () => R): R {
	if (!isBraintrustTracingEnabled()) {
		return run();
	}

	ensureBraintrustLogger();
	return traced(
		(span) => {
			span.log({ metadata });
			return run();
		},
		{ name: 'workspace-chat' }
	);
}

/**
 * Vercel AI SDK exports for workspace chat. When tracing is enabled, returns
 * `wrapAISDK` versions of `ToolLoopAgent` and `createAgentUIStreamResponse`.
 */
export function getWorkspaceChatAi(): typeof ai {
	if (!isBraintrustTracingEnabled()) {
		return ai;
	}

	ensureBraintrustLogger();
	wrappedAi ??= wrapAISDK(ai);
	return wrappedAi;
}
