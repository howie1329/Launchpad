import type { UIMessage } from 'ai';
import { buildAssistantSegments } from '$lib/idea-chat-assistant-parts';
import { openUIVisibleText } from '$lib/openui/response';

/**
 * Workspace chat UX — product defaults for PRD “open confirmations” (v1):
 * - Retry from any user message (truncate everything after that user turn, then new assistant reply).
 * - Assistant clipboard: human-readable OpenUI text; tool steps are omitted.
 * - Forked threads use the normal new-thread title placeholder until title generation runs.
 * - Tail user-only + in-flight assistant: rely on existing “Thinking…” / spinner; errors use chatError + Retry send.
 */

export function truncateMessagesAfterUserMessage(
	messages: UIMessage[],
	userMessageId: string
): UIMessage[] {
	const idx = messages.findIndex((m) => m.id === userMessageId && m.role === 'user');
	if (idx === -1) return messages;
	return messages.slice(0, idx + 1);
}

export function uiMessageText(message: UIMessage, separator = '\n'): string {
	return message.parts
		.filter(
			(part): part is { type: 'text'; text: string } =>
				part.type === 'text' && typeof (part as { text?: unknown }).text === 'string'
		)
		.map((part) => part.text)
		.join(separator)
		.trim();
}

export function buildUserMessageCopyText(message: UIMessage): string {
	if (message.role !== 'user') return '';
	return uiMessageText(message);
}

export function assistantMessageHasVisibleContent(message: UIMessage): boolean {
	if (message.role !== 'assistant') return false;
	if (uiMessageText(message).trim()) return true;
	return buildAssistantSegments(message).length > 0;
}

/** Plain text for assistant copy: OpenUI visible text or legacy markdown source. */
export function buildAssistantMessageCopyText(message: UIMessage): string {
	if (message.role !== 'assistant') return '';
	const source = uiMessageText(message, '');
	const openUIText = openUIVisibleText(source);
	if (openUIText) return openUIText;
	return source;
}
