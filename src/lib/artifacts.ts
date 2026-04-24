import { makeFunctionReference } from 'convex/server';
import type { FileDiffMetadata } from '@pierre/diffs';
import type { Id } from '../convex/_generated/dataModel';

export type ArtifactContentFormat = 'markdown';
export type ArtifactLinkReason = 'created' | 'referenced' | 'imported';
export type ArtifactDraftChangeStatus = 'pending' | 'applied' | 'discarded';
export type ArtifactMetadata = Record<string, unknown>;

export type SavedArtifact = {
	_id: Id<'artifacts'>;
	_creationTime: number;
	ownerId: Id<'users'>;
	type: string;
	title: string;
	contentMarkdown: string;
	contentFormat: ArtifactContentFormat;
	revision: number;
	metadata?: ArtifactMetadata;
	projectId?: Id<'projects'>;
	sourceThreadId?: Id<'chatThreads'>;
	createdAt: number;
	updatedAt: number;
};

export type ArtifactDraftPatch = FileDiffMetadata;

export type ArtifactDraftReviewStats = {
	hasTitleChange?: boolean;
	changedSectionCount?: number;
	additionCount?: number;
	deletionCount?: number;
};

export type ThreadArtifactLink = {
	_id: Id<'threadArtifactLinks'>;
	_creationTime: number;
	ownerId: Id<'users'>;
	threadId: Id<'chatThreads'>;
	artifactId: Id<'artifacts'>;
	reason: ArtifactLinkReason;
	createdAt: number;
	updatedAt: number;
};

export type ArtifactDraftChange = {
	_id: Id<'artifactDraftChanges'>;
	_creationTime: number;
	ownerId: Id<'users'>;
	artifactId: Id<'artifacts'>;
	threadId?: Id<'chatThreads'>;
	proposedTitle: string;
	proposedContentMarkdown: string;
	summary?: string;
	baseArtifactRevision?: number;
	baseTitle?: string;
	baseContentMarkdown?: string;
	patch?: ArtifactDraftPatch;
	changeSummary?: string;
	hasTitleChange?: boolean;
	changedSectionCount?: number;
	additionCount?: number;
	deletionCount?: number;
	staleReason?: string;
	isStale?: boolean;
	needsHydration?: boolean;
	status: ArtifactDraftChangeStatus;
	createdAt: number;
	updatedAt: number;
	appliedAt?: number;
	discardedAt?: number;
};

export type ThreadArtifact = {
	link: ThreadArtifactLink;
	artifact: SavedArtifact;
};

export type MentionableArtifact = {
	artifact: SavedArtifact;
	linkedToThread: boolean;
};

export type ThreadDraftChange = {
	draftChange: ArtifactDraftChange;
	artifact: SavedArtifact;
};

export type CreateArtifactArgs = {
	type: string;
	title: string;
	contentMarkdown: string;
	metadata?: ArtifactMetadata;
	projectId?: Id<'projects'>;
	sourceThreadId?: Id<'chatThreads'>;
};

export type CreateArtifactResult = {
	artifactId: Id<'artifacts'>;
};

export type UpdateArtifactArgs = {
	artifactId: Id<'artifacts'>;
	title?: string;
	contentMarkdown?: string;
	metadata?: ArtifactMetadata | null;
	projectId?: Id<'projects'> | null;
};

export type LinkArtifactToThreadArgs = {
	threadId: Id<'chatThreads'>;
	artifactId: Id<'artifacts'>;
	reason: Exclude<ArtifactLinkReason, 'created'>;
};

export type CreateArtifactDraftChangeArgs = {
	artifactId: Id<'artifacts'>;
	threadId?: Id<'chatThreads'>;
	proposedTitle: string;
	proposedContentMarkdown: string;
	summary?: string;
};

export const createArtifactMutation = makeFunctionReference<
	'mutation',
	CreateArtifactArgs,
	CreateArtifactResult
>('artifacts:createArtifact');

export const listArtifactsQuery = makeFunctionReference<
	'query',
	Record<string, never>,
	SavedArtifact[]
>('artifacts:listArtifacts');

export const listProjectArtifactsQuery = makeFunctionReference<
	'query',
	{ projectId: Id<'projects'> },
	SavedArtifact[]
>('artifacts:listProjectArtifacts');

export const listThreadArtifactsQuery = makeFunctionReference<
	'query',
	{ threadId: Id<'chatThreads'> },
	ThreadArtifact[]
>('artifacts:listThreadArtifacts');

export const listMentionableArtifactsQuery = makeFunctionReference<
	'query',
	{ threadId: Id<'chatThreads'> },
	MentionableArtifact[]
>('artifacts:listMentionableArtifacts');

export const getArtifactQuery = makeFunctionReference<
	'query',
	{ artifactId: Id<'artifacts'> },
	SavedArtifact | null
>('artifacts:getArtifact');

export const updateArtifactMutation = makeFunctionReference<
	'mutation',
	UpdateArtifactArgs,
	{ ok: true }
>('artifacts:updateArtifact');

export const deleteArtifactMutation = makeFunctionReference<
	'mutation',
	{ artifactId: Id<'artifacts'> },
	{ ok: true }
>('artifacts:deleteArtifact');

export const linkArtifactToThreadMutation = makeFunctionReference<
	'mutation',
	LinkArtifactToThreadArgs,
	{ ok: true }
>('artifacts:linkArtifactToThread');

export const createArtifactDraftChangeMutation = makeFunctionReference<
	'mutation',
	CreateArtifactDraftChangeArgs,
	{ draftChangeId: Id<'artifactDraftChanges'> }
>('artifacts:createArtifactDraftChange');

export const listArtifactDraftChangesQuery = makeFunctionReference<
	'query',
	{ artifactId: Id<'artifacts'> },
	ArtifactDraftChange[]
>('artifacts:listArtifactDraftChanges');

export const listThreadDraftChangesQuery = makeFunctionReference<
	'query',
	{ threadId: Id<'chatThreads'> },
	ThreadDraftChange[]
>('artifacts:listThreadDraftChanges');

export const applyArtifactDraftChangeMutation = makeFunctionReference<
	'mutation',
	{ draftChangeId: Id<'artifactDraftChanges'> },
	{ ok: true }
>('artifacts:applyArtifactDraftChange');

export const discardArtifactDraftChangeMutation = makeFunctionReference<
	'mutation',
	{ draftChangeId: Id<'artifactDraftChanges'> },
	{ ok: true }
>('artifacts:discardArtifactDraftChange');

export const hydrateArtifactDraftChangeReviewDataMutation = makeFunctionReference<
	'mutation',
	{ draftChangeId: Id<'artifactDraftChanges'> },
	{ ok: true; hydrated: boolean; stale?: boolean }
>('artifacts:hydrateArtifactDraftChangeReviewData');
