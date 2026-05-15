import type { SavedArtifact } from '$lib/artifacts';
import type { Id } from '../../../convex/_generated/dataModel';

/** Supermemory only allows [A-Za-z0-9_-:] in containerTag / customId (no dots). */
export function safeTagPart(value: string) {
	return value.replace(/[^a-zA-Z0-9_\-:]/g, '_').slice(0, 80);
}

export function artifactMemoryCustomId(artifactId: Id<'artifacts'> | string) {
	return `artifact:${safeTagPart(artifactId)}`;
}

export function userMemoryContainerTag(ownerId: Id<'users'> | string) {
	return `launchpad:user:${safeTagPart(ownerId)}`;
}

export function projectMemoryContainerTag(projectId: Id<'projects'> | string) {
	return `launchpad:project:${safeTagPart(projectId)}`;
}

export function artifactMemoryContainerTag(artifact: SavedArtifact) {
	if (artifact.projectId) return projectMemoryContainerTag(artifact.projectId);
	return userMemoryContainerTag(artifact.ownerId);
}

/** Tags used before Supermemory tightened validation (dots allowed in tag string). */
function legacySafePart(value: string) {
	return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
}

export function legacyUserMemoryContainerTag(ownerId: Id<'users'> | string) {
	return `launchpad.user.${legacySafePart(String(ownerId))}`;
}

export function legacyProjectMemoryContainerTag(projectId: Id<'projects'> | string) {
	return `launchpad.project.${legacySafePart(String(projectId))}`;
}
