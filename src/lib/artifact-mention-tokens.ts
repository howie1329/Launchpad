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
