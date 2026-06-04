import { env } from '$env/dynamic/private';
import * as ai from 'ai';
import { initLogger, wrapAISDK } from 'braintrust';

const DEFAULT_PROJECT_NAME = 'Launchpad Workspace Chat';

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
