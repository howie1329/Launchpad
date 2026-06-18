import {
	BuiltinActionType,
	createParser,
	type ActionEvent,
	type ElementNode,
	type ParseResult
} from '@openuidev/lang-core';
import { library } from './prompt-library';

export const MAX_OPENUI_RESPONSE_CHARS = 60_000;
export const MAX_OPENUI_STATEMENTS = 80;

const parser = createParser(library.toJSONSchema(), 'Root');
const rootAssignment = /^\s*root\s*=\s*Root\s*\(/m;

export type OpenUIResponseKind = 'empty' | 'openui' | 'openui-pending' | 'markdown';

export type OpenUIClassification = {
	kind: OpenUIResponseKind;
	result: ParseResult | null;
};

export function classifyOpenUIResponse(
	response: string,
	options: { isStreaming?: boolean } = {}
): OpenUIClassification {
	if (!response.trim()) return { kind: 'empty', result: null };
	if (response.length > MAX_OPENUI_RESPONSE_CHARS || !rootAssignment.test(response)) {
		return { kind: 'markdown', result: null };
	}

	const result = parser.parse(response);
	const unsafe =
		result.queryStatements.length > 0 ||
		result.mutationStatements.length > 0 ||
		result.meta.statementCount > MAX_OPENUI_STATEMENTS;
	if (unsafe || (!options.isStreaming && result.meta.unresolved.length > 0)) {
		return { kind: 'markdown', result };
	}
	if (result.root) return { kind: 'openui', result };
	if (options.isStreaming) return { kind: 'openui-pending', result };
	return { kind: 'markdown', result };
}

export function openUIVisibleText(response: string): string {
	const classification = classifyOpenUIResponse(response);
	if (classification.kind !== 'openui' || !classification.result?.root) return '';
	return visibleTextForNode(classification.result.root).join('\n').trim();
}

export function openUIActionMessage(event: ActionEvent): string | null {
	if (event.type !== BuiltinActionType.ContinueConversation) return null;
	const message = event.humanFriendlyMessage?.trim() ?? '';
	if (!message || message.length > 2_000) return null;

	const fields = formStateLines(event.formState);
	return fields.length > 0 ? `${message}\n\nForm responses:\n${fields.join('\n')}` : message;
}

function formStateLines(state: ActionEvent['formState']): string[] {
	if (!state || typeof state !== 'object') return [];
	const lines: string[] = [];

	for (const [groupName, groupValue] of Object.entries(state)) {
		if (lines.length >= 20 || !groupValue || typeof groupValue !== 'object') break;
		const group = groupValue as Record<string, unknown>;
		const directValue = safeFieldValue(group.value);
		if (directValue !== null) {
			lines.push(`- ${cleanLabel(groupName)}: ${directValue}`);
			continue;
		}

		for (const [fieldName, fieldValue] of Object.entries(group)) {
			if (lines.length >= 20 || !fieldValue || typeof fieldValue !== 'object') break;
			const value = safeFieldValue((fieldValue as Record<string, unknown>).value);
			if (value !== null) lines.push(`- ${cleanLabel(fieldName)}: ${value}`);
		}
	}

	return lines;
}

function safeFieldValue(value: unknown): string | null {
	if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
		return null;
	}
	return String(value).trim().slice(0, 1_000);
}

function cleanLabel(value: string): string {
	return value.replace(/[_-]+/g, ' ').trim().slice(0, 80);
}

function visibleTextForNode(node: ElementNode): string[] {
	const props = node.props;
	switch (node.typeName) {
		case 'Root':
		case 'Stack':
		case 'Grid':
			return visibleTextFromValue(props.children);
		case 'Card':
			return [...strings(props.title, props.description), ...visibleTextFromValue(props.children)];
		case 'Form':
			return [...strings(props.title), ...visibleTextFromValue(props.children)];
		case 'Text':
			return strings(props.content);
		case 'Heading':
			return strings(props.text);
		case 'Callout':
			return strings(props.title, props.body);
		case 'List':
			return stringsFromArray(props.items);
		case 'Metadata':
			return objectArrayText(props.items, ['label', 'value']);
		case 'Badge':
			return strings(props.label);
		case 'Table':
			return [...stringsFromArray(props.columns), ...nestedArrayText(props.rows)];
		case 'BarChart':
			return [...strings(props.title), ...objectArrayText(props.items, ['label', 'value'])];
		case 'Progress':
			return strings(props.label, props.value);
		case 'TextInput':
			return strings(props.label, props.value);
		case 'Choice':
			return [
				...strings(props.question, props.context),
				...objectArrayText(props.options, ['label', 'description'])
			];
		case 'Button':
			return strings(props.label);
		default:
			return [];
	}
}

function visibleTextFromValue(value: unknown): string[] {
	if (Array.isArray(value)) return value.flatMap(visibleTextFromValue);
	if (isElementNode(value)) return visibleTextForNode(value);
	return [];
}

function isElementNode(value: unknown): value is ElementNode {
	return Boolean(
		value && typeof value === 'object' && (value as { type?: unknown }).type === 'element'
	);
}

function strings(...values: unknown[]): string[] {
	return values
		.filter((value): value is string | number | boolean =>
			['string', 'number', 'boolean'].includes(typeof value)
		)
		.map(String)
		.map((value) => value.trim())
		.filter(Boolean);
}

function stringsFromArray(value: unknown): string[] {
	return Array.isArray(value) ? strings(...value) : [];
}

function nestedArrayText(value: unknown): string[] {
	return Array.isArray(value) ? value.flatMap(stringsFromArray) : [];
}

function objectArrayText(value: unknown, keys: string[]): string[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		if (!item || typeof item !== 'object') return [];
		const record = item as Record<string, unknown>;
		return strings(...keys.map((key) => record[key]));
	});
}
