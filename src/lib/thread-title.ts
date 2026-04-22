/** Shown in DB until the one-time LLM title is written. */
export const PLACEHOLDER_THREAD_TITLE = 'New chat';

/** Capitalize the first letter in the title for shell display; empty → placeholder. */
export function formatThreadTitleForDisplay(title: string): string {
	const t = title.trim();
	if (!t) return PLACEHOLDER_THREAD_TITLE;
	return t.replace(/\p{L}/u, (letter) => letter.toLocaleUpperCase());
}

/** Post-process model output: single line, strip quotes, cap length. */
export function normalizeGeneratedThreadTitle(raw: string): string {
	let s = raw
		.trim()
		.replace(/^["'“”‘']+|["'“”‘']+$/g, '')
		.replace(/\s+/g, ' ');
	const line = s.split('\n')[0]?.trim() ?? '';
	if (!line) return '';
	if (line.length > 100) return `${line.slice(0, 97)}…`;
	return line;
}
