import { describe, expect, it } from 'vitest';
import { BuiltinActionType } from '@openuidev/lang-core';
import { readFileSync } from 'node:fs';
import { library, promptOptions } from './prompt-library';
import {
	classifyOpenUIResponse,
	extractFallbackReadableText,
	getOpenUIFallbackReason,
	isValidOpenUIResponse,
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
		expect(isValidOpenUIResponse(source)).toBe(true);
	});

	it('keeps a root-first partial response in OpenUI mode while streaming', () => {
		const source = 'root = Root([answer])\nanswer = Text("Still';
		const kind = classifyOpenUIResponse(source, { isStreaming: true }).kind;
		expect(kind).not.toBe('markdown');
		expect(kind).not.toBe('fallback');
	});

	it('classifies genuine markdown separately from OpenUI fallback', () => {
		expect(classifyOpenUIResponse('## Existing markdown').kind).toBe('markdown');
		expect(getOpenUIFallbackReason('## Existing markdown')).toBeNull();
	});

	it('falls back for malformed Lang with readable extraction', () => {
		const source = 'root = Root([missing])';
		expect(classifyOpenUIResponse(source).kind).toBe('fallback');
		expect(getOpenUIFallbackReason(source)).toBe('unresolved_refs');
		expect(extractFallbackReadableText(source)).toBe('');
	});

	it('extracts Text literals from fallback Lang without assignments', () => {
		const source =
			'root = Root([answer, extra])\nanswer = Text("Partial answer")\nextra = MissingRef';
		expect(classifyOpenUIResponse(source).kind).toBe('fallback');
		expect(extractFallbackReadableText(source)).toBe('Partial answer');
	});

	it('falls back for unsafe data calls', () => {
		const source =
			'root = Root([answer])\nanswer = Text("No")\ndata = Query("workspace", {}, {})';
		expect(classifyOpenUIResponse(source).kind).toBe('fallback');
		expect(getOpenUIFallbackReason(source)).toBe('unsafe_statements');
	});

	it('rejects oversized responses as fallback', () => {
		const source = `root = Root([answer])\nanswer = Text("${'x'.repeat(MAX_OPENUI_RESPONSE_CHARS)}")`;
		expect(classifyOpenUIResponse(source).kind).toBe('fallback');
		expect(getOpenUIFallbackReason(source)).toBe('oversized');
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
