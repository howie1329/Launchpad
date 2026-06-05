import type {
	WorkspaceChatEvalFixture,
	WorkspaceChatEvalInput,
	WorkspaceChatEvalMessage
} from './types.ts';

const PROJECT_CONTEXT = {
	name: 'Habit Tracker MVP',
	summary: 'Mobile habit tracker for busy professionals with gentle reminders.'
};

export function fixtureContext(fixture: WorkspaceChatEvalFixture) {
	return fixture === 'project' ? PROJECT_CONTEXT : null;
}

export const casualPriorMessages = {
	thanksAfterPitch: [
		{
			role: 'user',
			content:
				'Can you give me a one-line pitch for a habit tracker for busy professionals?'
		},
		{
			role: 'assistant',
			content:
				'A habit tracker that fits in 30 seconds a day — gentle reminders and streak-friendly design for people who already feel behind.'
		}
	] satisfies WorkspaceChatEvalMessage[]
};

export function defaultEvalInput(
	partial: Partial<WorkspaceChatEvalInput> & Pick<WorkspaceChatEvalInput, 'userMessage'>
): WorkspaceChatEvalInput {
	return {
		fixture: 'general',
		webSearchRequested: false,
		composioToolkits: [],
		referencedBlock: '',
		profileBlock: '',
		memoryBlock: '',
		...partial
	};
}
