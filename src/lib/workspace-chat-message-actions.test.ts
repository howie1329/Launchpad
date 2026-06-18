import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';
import { buildAssistantMessageCopyText } from './workspace-chat-message-actions';

describe('assistant message copy text', () => {
	it('copies visible OpenUI content instead of source code', () => {
		const message: UIMessage = {
			id: 'assistant-1',
			role: 'assistant',
			parts: [
				{
					type: 'text',
					text: 'root = Root([heading, list])\nheading = Heading("Recommendation")\nlist = List(["Start narrow", "Measure demand"], true)'
				}
			]
		};

		expect(buildAssistantMessageCopyText(message)).toBe(
			'Recommendation\nStart narrow\nMeasure demand'
		);
	});

	it('preserves legacy markdown copy behavior', () => {
		const message: UIMessage = {
			id: 'assistant-2',
			role: 'assistant',
			parts: [{ type: 'text', text: 'A legacy **markdown** answer.' }]
		};

		expect(buildAssistantMessageCopyText(message)).toBe('A legacy **markdown** answer.');
	});
});
