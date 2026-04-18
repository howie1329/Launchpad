import type { ArtifactLinkReason, SavedArtifact, ThreadArtifact } from '$lib/artifacts'

export type ArtifactGroupKey = 'idea' | 'prd' | 'research' | 'markdown' | 'other'

export type ArtifactGroup<T> = {
	key: ArtifactGroupKey
	label: string
	artifacts: T[]
}

export const artifactGroupKeys: ArtifactGroupKey[] = [
	'idea',
	'prd',
	'research',
	'markdown',
	'other'
]

export const artifactGroupLabels: Record<ArtifactGroupKey, string> = {
	idea: 'Ideas',
	prd: 'PRDs',
	research: 'Research',
	markdown: 'Markdown',
	other: 'Other'
}

export function artifactGroupKey(type: string): ArtifactGroupKey {
	const normalized = type.trim().toLowerCase()

	if (normalized === 'idea') return 'idea'
	if (normalized === 'prd') return 'prd'
	if (normalized === 'research') return 'research'
	if (normalized === 'markdown') return 'markdown'
	return 'other'
}

export function artifactTypeLabel(type: string) {
	const key = artifactGroupKey(type)
	if (key === 'prd') return 'PRD'
	if (key === 'other') return type.trim() || 'Artifact'
	return artifactGroupLabels[key].replace(/s$/, '')
}

export function groupArtifacts<T>(
	artifacts: T[],
	getArtifact: (item: T) => SavedArtifact
): ArtifactGroup<T>[] {
	return artifactGroupKeys.map((key) => ({
		key,
		label: artifactGroupLabels[key],
		artifacts: artifacts.filter((item) => artifactGroupKey(getArtifact(item).type) === key)
	}))
}

export function artifactPreview(contentMarkdown: string) {
	const firstLine = contentMarkdown
		.split('\n')
		.map((line) => line.trim())
		.find(Boolean)

	if (!firstLine) return 'No content yet.'
	return firstLine.length > 140 ? `${firstLine.slice(0, 137)}...` : firstLine
}

export function draftPreview(contentMarkdown: string) {
	const preview = artifactPreview(contentMarkdown)
	return preview.length > 120 ? `${preview.slice(0, 117)}...` : preview
}

export function linkReasonLabel(reason: ArtifactLinkReason) {
	if (reason === 'created') return 'Created in this thread'
	if (reason === 'referenced') return 'Referenced here'
	return 'Imported to this thread'
}

export function formatArtifactUpdatedAt(updatedAt: number) {
	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	}).format(new Date(updatedAt))
}

export function threadArtifactDoc(item: ThreadArtifact) {
	return item.artifact
}
