import type { UIMessage } from 'ai';
import { buildAssistantSegments } from '$lib/idea-chat-assistant-parts';

/**
 * Workspace chat UX — product defaults for PRD “open confirmations” (v1):
 * - Retry from any user message (truncate everything after that user turn, then new assistant reply).
 * - Assistant clipboard: human-readable text parts only; tool steps and choice cards are omitted.
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

/** Plain text for assistant copy: text segments only (no tool dumps / choice JSON). */
export function buildAssistantMessageCopyText(message: UIMessage): string {
	if (message.role !== 'assistant') return '';
	const segments = buildAssistantSegments(message);
	const chunks: string[] = [];
	for (const seg of segments) {
		if (seg.kind === 'text') {
			const t = seg.text.trim();
			if (t) chunks.push(t);
		}
	}
	return chunks.join('\n\n').trim();
}
