import type { SavedArtifact } from '$lib/artifacts';

export const MAX_ARTIFACT_MEMORY_CHARS = 60_000;
export const MAX_USER_MEMORY_TEXT_CHARS = 4_000;
export const MAX_USER_PREFERENCE_MEMORY_CHARS = 500;
export const MAX_PROJECT_DECISION_MEMORY_CHARS = 800;
export const MAX_THREAD_INSIGHT_MEMORY_CHARS = 600;
export const MAX_MEMORY_EVIDENCE_CHARS = 300;

const blockedPatterns = [
	/-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
	/\b(?:api[_-]?key|secret|password|passwd|token)\b\s*[:=]\s*['"]?[A-Za-z0-9._~+/=-]{12,}/i,
	/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/i,
	/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/i
];

export function textContainsSensitivePatterns(text: string) {
	return blockedPatterns.some((pattern) => pattern.test(text));
}

export function validateArtifactForMemory(artifact: SavedArtifact) {
	const content = `${artifact.title}\n${artifact.contentMarkdown}`;

	if (content.length > MAX_ARTIFACT_MEMORY_CHARS) {
		return { ok: false as const, reason: 'Artifact is too large for automatic memory sync.' };
	}

	if (textContainsSensitivePatterns(content)) {
		return { ok: false as const, reason: 'Artifact contains sensitive content.' };
	}

	return { ok: true as const };
}

export function validateUserMemoryText(text: string) {
	return validateMemoryContent(text, MAX_USER_MEMORY_TEXT_CHARS);
}

export function validateMemoryContent(text: string, maxChars: number) {
	const trimmed = text.trim();
	if (!trimmed) {
		return { ok: false as const, reason: 'Memory text is empty.' };
	}
	if (trimmed.length > maxChars) {
		return { ok: false as const, reason: 'Memory text is too long.' };
	}
	if (textContainsSensitivePatterns(trimmed)) {
		return { ok: false as const, reason: 'Memory text looks sensitive; not stored.' };
	}
	return { ok: true as const, text: trimmed };
}

export function validateMemoryEvidence(evidence: string | undefined) {
	const trimmed = evidence?.trim() ?? '';
	if (!trimmed) return { ok: true as const };
	if (trimmed.length > MAX_MEMORY_EVIDENCE_CHARS) {
		return { ok: false as const, reason: 'Memory evidence is too long.' };
	}
	if (textContainsSensitivePatterns(trimmed)) {
		return { ok: false as const, reason: 'Memory evidence looks sensitive; not stored.' };
	}
	return { ok: true as const, evidence: trimmed };
}

/** `text` must appear in `userMessage` (substring) to tie tool writes to the user turn. */
export function userMemoryTextAllowedForMessage(userMessage: string, text: string) {
	const u = userMessage.trim();
	const t = text.trim();
	if (!u || !t) return false;
	return u.includes(t);
}
