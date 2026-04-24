import type { ArtifactVersion } from '$lib/artifacts';

export function artifactVersionActorLabel(version: ArtifactVersion) {
	return version.actor === 'ai' ? 'AI' : 'You';
}

export function artifactVersionSourceLabel(version: ArtifactVersion) {
	return version.source === 'chat' ? 'Chat' : 'Editor';
}

export function artifactVersionTimestamp(version: ArtifactVersion) {
	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	}).format(new Date(version.createdAt));
}

export function artifactVersionSummary(version: ArtifactVersion) {
	return version.summary?.trim() || 'Saved artifact version.';
}
