import { describe, expect, it } from 'vitest';
import { BuiltinActionType } from '@openuidev/lang-core';
import { readFileSync } from 'node:fs';
import { library, promptOptions } from './prompt-library';
import {
	classifyOpenUIResponse,
	MAX_OPENUI_RESPONSE_CHARS,
	openUIActionMessage,
	openUIVisibleText
} from './response';

describe('OpenUI response handling', () => {
	it('keeps the generated system prompt synchronized with the component library', () => {
		const generated = readFileSync('src/lib/openui/generated/system-prompt.txt', 'utf8');
		expect(generated.trimEnd()).toBe(library.prompt(promptOptions).trimEnd());
	});

	it('accepts a complete OpenUI response', () => {
		const source = 'root = Root([answer])\nanswer = Text("A focused answer")';
		expect(classifyOpenUIResponse(source).kind).toBe('openui');
		expect(openUIVisibleText(source)).toBe('A focused answer');
	});

	it('keeps a root-first partial response in OpenUI mode while streaming', () => {
		const source = 'root = Root([answer])\nanswer = Text("Still';
		expect(classifyOpenUIResponse(source, { isStreaming: true }).kind).not.toBe('markdown');
	});

	it('falls back for markdown, malformed output, and unsafe data calls', () => {
		expect(classifyOpenUIResponse('## Existing markdown').kind).toBe('markdown');
		expect(classifyOpenUIResponse('root = Root([missing])').kind).toBe('markdown');
		expect(
			classifyOpenUIResponse(
				'root = Root([answer])\nanswer = Text("No")\ndata = Query("workspace", {}, {})'
			).kind
		).toBe('markdown');
	});

	it('rejects oversized responses', () => {
		const source = `root = Root([answer])\nanswer = Text("${'x'.repeat(MAX_OPENUI_RESPONSE_CHARS)}")`;
		expect(classifyOpenUIResponse(source).kind).toBe('markdown');
	});

	it('allows only bounded continue-conversation actions', () => {
		expect(
			openUIActionMessage({
				type: BuiltinActionType.ContinueConversation,
				params: {},
				humanFriendlyMessage: 'Use this direction',
				formState: { brief: { audience: { value: 'Solo builders', componentType: 'TextInput' } } },
				formName: 'brief'
			})
		).toBe('Use this direction\n\nForm responses:\n- audience: Solo builders');
		expect(
			openUIActionMessage({
				type: BuiltinActionType.OpenUrl,
				params: { url: 'https://example.com' },
				humanFriendlyMessage: 'Open'
			})
		).toBeNull();
	});
});
