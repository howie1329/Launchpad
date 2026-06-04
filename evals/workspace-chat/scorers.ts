import { createGateway, generateText } from 'ai';
import type { WorkspaceChatEvalCase, WorkspaceChatEvalOutput } from './types.ts';

type ScorerArgs = {
	input: WorkspaceChatEvalCase['input'];
	output: WorkspaceChatEvalOutput;
	expected?: WorkspaceChatEvalCase['expected'];
	metadata?: WorkspaceChatEvalCase['metadata'];
};

const PROSE_CHOICE_PATTERNS = [
	/\breply with\s+[123]\b/i,
	/\bpick one\b/i,
	/\bwhich option\b/i,
	/\bchoose a direction\b/i,
	/\boption\s+[123]\b/i
];

const PERMISSION_PATTERNS = [
	/\bwould you like me to\b/i,
	/\bshall i\b/i,
	/\bdo you want me to\b/i,
	/\blet me know if you(?:'d| would) like\b/i,
	/\bif you want, i can\b/i
];

function toolNames(output: WorkspaceChatEvalOutput) {
	return new Set(output.toolCalls.map((call) => call.toolName));
}

export function mustCallToolsScorer({ output, expected }: ScorerArgs) {
	const required = expected?.mustCallTools ?? [];
	if (required.length === 0) {
		return { name: 'must_call_tools', score: 1 };
	}

	const names = toolNames(output);
	const missing = required.filter((name) => !names.has(name));
	return {
		name: 'must_call_tools',
		score: missing.length === 0 ? 1 : 0,
		metadata: { missing, called: [...names] }
	};
}

export function mustNotCallToolsScorer({ output, expected }: ScorerArgs) {
	const forbidden = expected?.mustNotCallTools ?? [];
	if (forbidden.length === 0) {
		return { name: 'must_not_call_tools', score: 1 };
	}

	const names = toolNames(output);
	const violations = forbidden.filter((name) => names.has(name));
	return {
		name: 'must_not_call_tools',
		score: violations.length === 0 ? 1 : 0,
		metadata: { violations }
	};
}

export function noProseMultipleChoiceScorer({ output }: ScorerArgs) {
	const text = output.text ?? '';
	const hit = PROSE_CHOICE_PATTERNS.find((pattern) => pattern.test(text));
	const usedChoiceTool = toolNames(output).has('requestUserChoice');

	if (usedChoiceTool) {
		return { name: 'no_prose_multiple_choice', score: 1 };
	}

	return {
		name: 'no_prose_multiple_choice',
		score: hit ? 0 : 1,
		metadata: hit ? { pattern: hit.source } : undefined
	};
}

export function noLegacyPrdMentionScorer({ output }: ScorerArgs) {
	const text = output.text ?? '';
	const hit = /legacy\s+prd/i.test(text);
	return {
		name: 'no_legacy_prd_mention',
		score: hit ? 0 : 1
	};
}

export function proactivityHeuristicScorer({ output, expected }: ScorerArgs) {
	if (!expected?.expectProactiveDraft) {
		return { name: 'proactivity_heuristic', score: 1 };
	}

	const text = (output.text ?? '').trim();
	const permissionHits = PERMISSION_PATTERNS.filter((pattern) => pattern.test(text)).length;
	const substantive = text.length >= 280;
	const score = substantive && permissionHits <= 2 ? 1 : permissionHits > 3 ? 0 : 0.5;

	return {
		name: 'proactivity_heuristic',
		score,
		metadata: { textLength: text.length, permissionHits, substantive }
	};
}

export async function proactivityJudgeScorer({ input, output, expected }: ScorerArgs) {
	if (!expected?.expectProactiveDraft) {
		return { name: 'proactivity_judge', score: 1 };
	}

	if (process.env.WORKSPACE_CHAT_EVAL_LLM_JUDGE !== 'true') {
		return { name: 'proactivity_judge', score: null };
	}

	const apiKey = process.env.AI_GATEWAY_API_KEY?.trim();
	if (!apiKey) {
		return {
			name: 'proactivity_judge',
			score: null,
			metadata: { skipped: 'no AI_GATEWAY_API_KEY' }
		};
	}

	const gateway = createGateway({ apiKey });
	const modelId = process.env.WORKSPACE_CHAT_EVAL_JUDGE_MODEL ?? 'openai/gpt-5.4-nano';

	const { text } = await generateText({
		model: gateway(modelId),
		prompt: `You grade assistant proactivity for a builder workspace chat.

User message:
${input.userMessage}

Assistant text:
${output.text}

Tool calls: ${JSON.stringify(output.toolCalls.map((t) => t.toolName))}

Rubric (return JSON only: {"score": number} where score is 0, 0.5, or 1):
- 1 = gives a useful draft, recommendation, or concrete plan without excessive permission-seeking
- 0.5 = partially helpful but overly cautious or mostly questions
- 0 = refuses to help, only asks permission, or gives no substantive content

Score:`
	});

	const match = text.match(/\{[\s\S]*\}/);
	if (!match) {
		return { name: 'proactivity_judge', score: null, metadata: { raw: text } };
	}

	try {
		const parsed = JSON.parse(match[0]) as { score?: number };
		const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(1, parsed.score)) : null;
		return { name: 'proactivity_judge', score };
	} catch {
		return { name: 'proactivity_judge', score: null, metadata: { raw: text } };
	}
}

export const workspaceChatScorers = [
	mustCallToolsScorer,
	mustNotCallToolsScorer,
	noProseMultipleChoiceScorer,
	noLegacyPrdMentionScorer,
	proactivityHeuristicScorer,
	proactivityJudgeScorer
];
