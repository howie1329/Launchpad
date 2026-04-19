/**
 * Canonical grammar: @artifact:<artifactId>
 * Id is non-whitespace; server validates against Convex + thread link.
 */
export const ARTIFACT_MENTION_PREFIX = '@artifact:';

/** Match @artifact:<id> globally; capture group 1 is the id string. */
export const ARTIFACT_MENTION_PATTERN = /@artifact:([^\s]+)/g;

export function parseArtifactMentionIds(text: string): string[] {
	const ids: string[] = [];
	const seen = new Set<string>();
	const re = new RegExp(ARTIFACT_MENTION_PATTERN.source, 'g');
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		const id = m[1];
		if (id && !seen.has(id)) {
			seen.add(id);
			ids.push(id);
		}
	}
	return ids;
}

export function formatArtifactMentionToken(artifactId: string): string {
	return `${ARTIFACT_MENTION_PREFIX}${artifactId}`;
}

/**
 * Build persisted user text: optional prose, then one line per @artifact: id (for server + history).
 */
export function buildOutgoingUserMessageWithTokens(
	prose: string,
	artifactIdsInOrder: string[]
): string {
	const t = prose.trim();
	const lines = artifactIdsInOrder.map((id) => formatArtifactMentionToken(id));
	if (lines.length === 0) return t;
	const block = lines.join('\n');
	return t ? `${t}\n\n${block}` : block;
}

/**
 * Split composer output back into visible prose and ordered artifact ids (trailing token lines only).
 */
export function parseComposedUserMessage(text: string): { body: string; artifactIds: string[] } {
	const lines = text.split('\n');
	const artifactIds: string[] = [];
	let end = lines.length;

	for (let i = lines.length - 1; i >= 0; i--) {
		const line = lines[i].trim();
		if (line === '') {
			end = i;
			continue;
		}
		const m = /^@artifact:(\S+)$/.exec(line);
		if (m) {
			artifactIds.unshift(m[1]);
			end = i;
		} else {
			break;
		}
	}

	const body = lines.slice(0, end).join('\n').trimEnd();
	return { body, artifactIds };
}
