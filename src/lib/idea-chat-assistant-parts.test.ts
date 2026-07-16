import { describe, expect, it } from 'vitest';
import { toolPartToView } from './idea-chat-assistant-parts';

describe('assistant activity summaries', () => {
	it('describes a completed visual artifact and exposes an open action', () => {
		const view = toolPartToView({
			type: 'tool-createVisualArtifact',
			toolCallId: 'call-1',
			state: 'output-available',
			input: {},
			output: {
				artifactId: 'artifact-1',
				title: 'World Cup landing page'
			}
		});

		expect(view).toMatchObject({
			title: 'Save visual artifact',
			phase: 'done',
			summary: 'Saved visual artifact: World Cup landing page.',
			actionLabel: 'Open artifact',
			actionArtifactId: 'artifact-1'
		});
	});
});
