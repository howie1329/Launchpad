import { buildFullWorkspaceChatInstructions } from '../../src/lib/server/workspace-chat-instructions.ts';
import { wrapAISDK } from 'braintrust';
import * as ai from 'ai';
import { isStepCount } from 'ai';
import { fixtureContext } from './fixtures.ts';
import { resolveEvalLanguageModel } from './eval-provider.ts';
import { createWorkspaceChatStubTools } from './stub-tools.ts';
import type {
	WorkspaceChatEvalInput,
	WorkspaceChatEvalOutput,
	WorkspaceChatToolCallRecord
} from './types.ts';

const EVAL_MAX_STEPS = 4;

function extractToolCalls(
	steps: Array<{ toolCalls?: Array<{ toolName: string; input: unknown }> }>
) {
	const calls: WorkspaceChatToolCallRecord[] = [];
	for (const step of steps) {
		for (const call of step.toolCalls ?? []) {
			calls.push({ toolName: call.toolName, input: call.input });
		}
	}
	return calls;
}

export async function runWorkspaceChatEvalTask(
	input: WorkspaceChatEvalInput
): Promise<WorkspaceChatEvalOutput> {
	const toolCallLog: WorkspaceChatToolCallRecord[] = [];
	const instructions = buildFullWorkspaceChatInstructions({
		project: fixtureContext(input.fixture),
		referencedBlock: input.referencedBlock ?? '',
		profileBlock: input.profileBlock ?? '',
		memoryBlock: input.memoryBlock ?? '',
		webSearchRequested: input.webSearchRequested ?? false,
		webSearchAvailable: false,
		composioToolkits: input.composioToolkits ?? [],
		composioAvailable: false,
		userSettings: input.userBehaviorMarkdown
			? { aiBehaviorMarkdown: input.userBehaviorMarkdown }
			: null
	});

	const model = resolveEvalLanguageModel(input.modelId);
	const tools = createWorkspaceChatStubTools(toolCallLog);

	const traceEvalRuns = Boolean(process.env.BRAINTRUST_API_KEY?.trim());
	const { ToolLoopAgent: AgentCtor } = traceEvalRuns ? wrapAISDK(ai) : ai;

	const agent = new AgentCtor({
		model,
		instructions,
		tools,
		stopWhen: isStepCount(EVAL_MAX_STEPS)
	});

	const messages = [
		...(input.priorMessages ?? []),
		{ role: 'user' as const, content: input.userMessage }
	];

	const result = await agent.generate({ messages });

	return {
		text: result.text,
		toolCalls: extractToolCalls(result.steps)
	};
}
