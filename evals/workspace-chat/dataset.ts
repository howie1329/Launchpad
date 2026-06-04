import { defaultEvalInput } from './fixtures.ts';
import type {
	WorkspaceChatEvalExpected,
	WorkspaceChatEvalInput,
	WorkspaceChatEvalMetadata
} from './types.ts';

export type WorkspaceChatEvalCase = {
	input: WorkspaceChatEvalInput;
	expected?: WorkspaceChatEvalExpected;
	metadata: WorkspaceChatEvalMetadata;
};

export const workspaceChatDataset: WorkspaceChatEvalCase[] = [
	{
		input: defaultEvalInput({
			userMessage: 'Do you want quick, balanced, or thorough planning for this feature?'
		}),
		expected: { mustCallTools: ['requestUserChoice'] },
		metadata: { category: 'choice-card' }
	},
	{
		input: defaultEvalInput({
			userMessage: 'Which direction should we take: community-first, content-first, or tool-first?'
		}),
		expected: { mustCallTools: ['requestUserChoice'] },
		metadata: { category: 'choice-card' }
	},
	{
		input: defaultEvalInput({
			userMessage:
				'This conversation has a lot of good product thinking. What do you think — should we save it?'
		}),
		expected: { mustNotCallTools: ['createIdeaArtifact', 'createPrdArtifact'] },
		metadata: { category: 'artifact-suggest-only' }
	},
	{
		input: defaultEvalInput({
			userMessage:
				'Save this as an idea artifact titled "Onboarding experiments" with the notes we discussed in your last reply. I confirm — create it now.',
			referencedBlock: ''
		}),
		expected: { mustCallTools: ['createIdeaArtifact'] },
		metadata: { category: 'artifact-explicit-create' }
	},
	{
		input: defaultEvalInput({
			userMessage: 'Turn this thread into a project called "Launchpad onboarding".',
			fixture: 'general'
		}),
		expected: { mustCallTools: ['prepareProjectPromotion'] },
		metadata: { category: 'project-promotion' }
	},
	{
		input: defaultEvalInput({
			userMessage: 'Summarize the positioning we agreed on for this project.',
			fixture: 'project'
		}),
		expected: { mustNotCallTools: ['prepareProjectPromotion'] },
		metadata: { category: 'project-thread' }
	},
	{
		input: defaultEvalInput({
			userMessage:
				'Draft a concise MVP scope for a habit tracker for busy professionals. Include goals, in-scope, and out-of-scope bullets.'
		}),
		expected: { expectProactiveDraft: true },
		metadata: { category: 'proactivity' }
	},
	{
		input: defaultEvalInput({
			userMessage:
				'Write a first-pass PRD outline for a solo-founder workspace app. Be decisive and give me something I can react to.'
		}),
		expected: { expectProactiveDraft: true },
		metadata: { category: 'proactivity' }
	},
	{
		input: defaultEvalInput({
			userMessage: 'Pick one: support KB, runbooks, or research wiki as the first content pillar.'
		}),
		expected: { mustCallTools: ['requestUserChoice'] },
		metadata: { category: 'choice-card' }
	},
	{
		input: defaultEvalInput({
			userMessage:
				'Create a PRD artifact now for this idea. Title: Habit streaks v1. I explicitly want it saved.'
		}),
		expected: { mustCallTools: ['createPrdArtifact'] },
		metadata: { category: 'artifact-explicit-prd' }
	},
	{
		input: defaultEvalInput({
			userMessage: 'What artifacts are linked to this thread?'
		}),
		expected: { mustCallTools: ['listThreadArtifacts'] },
		metadata: { category: 'artifact-list' }
	},
	{
		input: defaultEvalInput({
			userMessage: 'Help me decide the tone for workspace copy.',
			userBehaviorMarkdown:
				'Prefer direct recommendations. When enough context exists, propose a default instead of only asking permission.'
		}),
		expected: { expectProactiveDraft: true },
		metadata: { category: 'proactivity-preferences' }
	}
];
