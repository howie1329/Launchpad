import type { ArtifactDraftChange } from '$lib/artifacts';

export function draftSummaryText(draftChange: ArtifactDraftChange) {
	return draftChange.changeSummary ?? draftChange.summary ?? 'Review AI-proposed artifact changes.';
}

export function draftStatItems(draftChange: ArtifactDraftChange) {
	const items: string[] = [];

	if (draftChange.hasTitleChange) {
		items.push('Title change');
	}
	if (draftChange.changedSectionCount !== undefined) {
		items.push(formatCount(draftChange.changedSectionCount, 'section'));
	}
	if (draftChange.additionCount !== undefined) {
		items.push(formatCount(draftChange.additionCount, 'addition'));
	}
	if (draftChange.deletionCount !== undefined) {
		items.push(formatCount(draftChange.deletionCount, 'deletion'));
	}

	return items;
}

function formatCount(count: number, noun: string) {
	return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
