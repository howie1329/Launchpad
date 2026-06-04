import type { WorkspaceChatEvalFixture, WorkspaceChatEvalInput } from './types.ts';

const PROJECT_CONTEXT = {
	name: 'Habit Tracker MVP',
	summary: 'Mobile habit tracker for busy professionals with gentle reminders.'
};

export function fixtureContext(fixture: WorkspaceChatEvalFixture) {
	return fixture === 'project' ? PROJECT_CONTEXT : null;
}

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
