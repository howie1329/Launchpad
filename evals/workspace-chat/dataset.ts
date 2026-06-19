import { casualPriorMessages, defaultEvalInput } from './fixtures.ts';
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
		expected: { mustRenderOpenUIChoice: true },
		metadata: { category: 'choice-card' }
	},
	{
		input: defaultEvalInput({
			userMessage: 'Which direction should we take: community-first, content-first, or tool-first?'
		}),
		expected: { mustRenderOpenUIChoice: true },
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
		expected: { mustRenderOpenUIChoice: true },
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
	},
	{
		input: defaultEvalInput({
			userMessage: 'Should we brainstorm, research, or write a spec next?'
		}),
		expected: { mustRenderOpenUIChoice: true },
		metadata: { category: 'choice-card' }
	},
	{
		input: defaultEvalInput({
			userMessage:
				'What tone should we use for landing page copy: casual, professional, or technical?'
		}),
		expected: { mustRenderOpenUIChoice: true },
		metadata: { category: 'choice-card' }
	},
	{
		input: defaultEvalInput({
			userMessage: "We've nailed the scope — are we ready to turn this into a project?"
		}),
		expected: { mustNotCallTools: ['prepareProjectPromotion'] },
		metadata: { category: 'project-promotion-confirm' }
	},
	{
		input: defaultEvalInput({
			userMessage: "What's the target user for this habit tracker?"
		}),
		expected: { mustNotRenderOpenUIChoice: true },
		metadata: { category: 'choice-card-negative' }
	},
	{
		input: defaultEvalInput({
			userMessage: 'This thread has a lot of great ideas in it.'
		}),
		expected: { mustNotCallTools: ['createIdeaArtifact', 'createPrdArtifact'] },
		metadata: { category: 'artifact-suggest-only' }
	},
	{
		input: defaultEvalInput({
			userMessage: 'Turn our discussion into a PRD.'
		}),
		expected: { mustNotCallTools: ['createIdeaArtifact', 'createPrdArtifact'] },
		metadata: { category: 'artifact-suggest-only' }
	},
	{
		input: defaultEvalInput({
			userMessage: 'Find my research notes on competitors.'
		}),
		expected: { mustCallTools: ['searchArtifacts'] },
		metadata: { category: 'artifact-search' }
	},
	{
		input: defaultEvalInput({
			userMessage: 'What artifacts exist in this project?',
			fixture: 'project'
		}),
		expected: { mustCallTools: ['listProjectArtifacts'] },
		metadata: { category: 'project-artifacts' }
	},
	{
		input: defaultEvalInput({
			userMessage: 'Always give me bullet lists and skip the preamble.'
		}),
		expected: {
			mustCallTools: ['rememberUserPreference'],
			mustNotCallTools: ['rememberProjectDecision']
		},
		metadata: { category: 'memory-preference' }
	},
	{
		input: defaultEvalInput({
			userMessage: 'What do you remember about my preferences?'
		}),
		expected: { mustCallTools: ['listRelevantMemory'] },
		metadata: { category: 'memory-transparency' }
	},
	{
		input: defaultEvalInput({
			userMessage: 'Hey — good morning. Taking a quick break before I dive back in.'
		}),
		expected: { expectCasualConversation: true },
		metadata: { category: 'casual-conversation' }
	},
	{
		input: defaultEvalInput({
			userMessage: "Thanks, that's exactly the vibe I wanted.",
			priorMessages: casualPriorMessages.thanksAfterPitch
		}),
		expected: { expectCasualConversation: true },
		metadata: { category: 'casual-conversation' }
	},
	{
		input: defaultEvalInput({
			userMessage:
				"Honestly I'm just venting — I've rewritten the onboarding flow three times and I still hate it."
		}),
		expected: { expectCasualConversation: true },
		metadata: { category: 'casual-conversation' }
	},
	{
		input: defaultEvalInput({
			userMessage:
				"Totally off topic: what's a realistic deep-work routine when you've got kids at home?"
		}),
		expected: { expectCasualConversation: true },
		metadata: { category: 'casual-conversation' }
	}
];
