import { Eval } from 'braintrust';
import { workspaceChatDataset } from './dataset.ts';
import { loadEnvLocal } from './load-env.ts';
import { runWorkspaceChatEvalTask } from './run-task.ts';
import { workspaceChatScorers } from './scorers.ts';

loadEnvLocal();

const projectName = process.env.BRAINTRUST_PROJECT_NAME?.trim() || 'Launchpad Workspace Chat';

Eval(projectName, {
	experimentName: process.env.WORKSPACE_CHAT_EVAL_EXPERIMENT?.trim() || 'workspace-chat-policy',
	description:
		'Policy and proactivity evals for Launchpad workspace chat (stub tools, gateway model).',
	data: workspaceChatDataset,
	task: async (input) => runWorkspaceChatEvalTask(input),
	scores: workspaceChatScorers,
	maxConcurrency: 2
});
