import { parseDiffFromFile, type FileDiffMetadata } from '@pierre/diffs';
import type { Doc } from './_generated/dataModel';

export type StoredArtifactPatch = FileDiffMetadata;

type ReviewDraftInput = {
	artifact: Doc<'artifacts'>;
	proposedTitle: string;
	proposedContentMarkdown: string;
	summary?: string;
};

type LegacyDraftInput = {
	artifact: Doc<'artifacts'>;
	draftChange: Doc<'artifactDraftChanges'>;
};

export type ArtifactDraftReviewData = {
	baseArtifactRevision: number;
	baseTitle: string;
	baseContentMarkdown: string;
	patch: StoredArtifactPatch;
	changeSummary: string;
	hasTitleChange: boolean;
	changedSectionCount: number;
	additionCount: number;
	deletionCount: number;
};

type LegacyReviewDataResult =
	| {
			ok: true;
			reviewData: ArtifactDraftReviewData;
	  }
	| {
			ok: false;
			staleReason: string;
	  };

export function getArtifactRevision(artifact: Doc<'artifacts'>) {
	return artifact.revision ?? 1;
}

export function createArtifactDraftReviewData({
	artifact,
	proposedTitle,
	proposedContentMarkdown,
	summary
}: ReviewDraftInput): ArtifactDraftReviewData {
	const patch = buildArtifactPatch(artifact.contentMarkdown, proposedContentMarkdown);

	return {
		baseArtifactRevision: getArtifactRevision(artifact),
		baseTitle: artifact.title,
		baseContentMarkdown: artifact.contentMarkdown,
		patch,
		hasTitleChange: artifact.title !== proposedTitle,
		changedSectionCount: patch.hunks.length,
		additionCount: countChangedLines(patch, 'addition'),
		deletionCount: countChangedLines(patch, 'deletion'),
		changeSummary:
			summary?.trim() ||
			buildDraftChangeSummary({
				baseTitle: artifact.title,
				proposedTitle,
				patch
			})
	};
}

export function deriveLegacyArtifactDraftReviewData({
	artifact,
	draftChange
}: LegacyDraftInput): LegacyReviewDataResult {
	if (artifact.updatedAt > draftChange.createdAt) {
		return {
			ok: false,
			staleReason:
				'This legacy draft cannot be safely applied because the artifact changed after the draft was created.'
		};
	}

	return {
		ok: true,
		reviewData: createArtifactDraftReviewData({
			artifact,
			proposedTitle: draftChange.proposedTitle,
			proposedContentMarkdown: draftChange.proposedContentMarkdown,
			summary: draftChange.summary
		})
	};
}

function buildArtifactPatch(baseContentMarkdown: string, proposedContentMarkdown: string) {
	const fileDiff = parseDiffFromFile(
		{
			name: 'artifact.md',
			contents: baseContentMarkdown
		},
		{
			name: 'artifact.md',
			contents: proposedContentMarkdown
		}
	);

	return sanitizeForConvex(fileDiff);
}

function buildDraftChangeSummary({
	baseTitle,
	proposedTitle,
	patch
}: {
	baseTitle: string;
	proposedTitle: string;
	patch: StoredArtifactPatch;
}) {
	const changedHunks = patch.hunks.length;
	const additions = countChangedLines(patch, 'addition');
	const deletions = countChangedLines(patch, 'deletion');
	const parts = [];

	if (baseTitle !== proposedTitle) {
		parts.push('Updates the title');
	}

	if (changedHunks > 0) {
		parts.push(
			`changes ${changedHunks} section${changedHunks === 1 ? '' : 's'} (${additions} addition${additions === 1 ? '' : 's'}, ${deletions} deletion${deletions === 1 ? '' : 's'})`
		);
	}

	if (parts.length === 0) {
		return 'No content changes.';
	}

	return `${parts.join(' and ')}.`;
}

function countChangedLines(patch: StoredArtifactPatch, type: 'addition' | 'deletion') {
	return patch.hunks.reduce((total, hunk) => {
		return (
			total +
			hunk.hunkContent.reduce((groupTotal, group) => {
				if (group.type !== 'change') return groupTotal;
				return groupTotal + (type === 'addition' ? group.additions : group.deletions);
			}, 0)
		);
	}, 0);
}

function sanitizeForConvex<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}
