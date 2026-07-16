import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';
import {
	assistantMessageHasVisibleContent,
	assistantMessageWasInterrupted,
	buildAssistantMessageCopyText,
	markAssistantMessageInterrupted
} from './workspace-chat-message-actions';

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

describe('assistantMessageHasVisibleContent', () => {
	it('returns true when assistant text is streaming', () => {
		const message: UIMessage = {
			id: 'assistant-stream',
			role: 'assistant',
			parts: [{ type: 'text', text: 'root = Root([answer])\nanswer = Text("Hi' }]
		};
		expect(assistantMessageHasVisibleContent(message)).toBe(true);
	});

	it('returns true for tool-only assistant messages', () => {
		const message: UIMessage = {
			id: 'assistant-tools',
			role: 'assistant',
			parts: [
				{
					type: 'tool-tavilySearch',
					toolCallId: 'call-1',
					state: 'output-available',
					input: { query: 'launchpad' },
					output: { results: [] }
				}
			]
		};
		expect(assistantMessageHasVisibleContent(message)).toBe(true);
	});

	it('returns false for empty assistant messages', () => {
		const message: UIMessage = {
			id: 'assistant-empty',
			role: 'assistant',
			parts: []
		};
		expect(assistantMessageHasVisibleContent(message)).toBe(false);
	});
});

describe('interrupted assistant messages', () => {
	it('marks and detects an interrupted assistant message without dropping metadata', () => {
		const message: UIMessage = {
			id: 'assistant-interrupted',
			role: 'assistant',
			metadata: { source: 'workspace-chat' },
			parts: [{ type: 'text', text: 'Partial answer' }]
		};

		const interrupted = markAssistantMessageInterrupted(message);

		expect(interrupted.metadata).toEqual({ source: 'workspace-chat', interrupted: true });
		expect(assistantMessageWasInterrupted(interrupted)).toBe(true);
		expect(assistantMessageWasInterrupted(message)).toBe(false);
	});
});
