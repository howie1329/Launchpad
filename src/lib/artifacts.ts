import { makeFunctionReference } from 'convex/server';
import type { Id } from '../convex/_generated/dataModel';

export type ArtifactContentFormat = 'markdown';
export type ArtifactLinkReason = 'created' | 'referenced' | 'imported';
export type ArtifactMetadata = Record<string, unknown>;
export type ArtifactVersionActor = 'user' | 'ai';
export type ArtifactVersionSource = 'editor' | 'chat';

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

export type ArtifactVersion = {
	_id: Id<'artifactVersions'>;
	_creationTime: number;
	ownerId: Id<'users'>;
	artifactId: Id<'artifacts'>;
	versionNumber: number;
	title: string;
	contentMarkdown: string;
	actor: ArtifactVersionActor;
	source: ArtifactVersionSource;
	summary?: string;
	createdAt: number;
	updatedAt: number;
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

export type ThreadArtifact = {
	link: ThreadArtifactLink;
	artifact: SavedArtifact;
};

export type MentionableArtifact = {
	artifact: SavedArtifact;
	linkedToThread: boolean;
};

export type CreateArtifactArgs = {
	type: string;
	title: string;
	contentMarkdown: string;
	metadata?: ArtifactMetadata;
	projectId?: Id<'projects'>;
	sourceThreadId?: Id<'chatThreads'>;
	versionActor?: ArtifactVersionActor;
	versionSource?: ArtifactVersionSource;
	versionSummary?: string;
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

export type UpdateThreadArtifactArgs = {
	threadId: Id<'chatThreads'>;
	artifactId: Id<'artifacts'>;
	title: string;
	contentMarkdown: string;
	summary?: string;
};

export type LinkArtifactToThreadArgs = {
	threadId: Id<'chatThreads'>;
	artifactId: Id<'artifacts'>;
	reason: Exclude<ArtifactLinkReason, 'created'>;
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

export const listArtifactVersionsQuery = makeFunctionReference<
	'query',
	{ artifactId: Id<'artifacts'> },
	ArtifactVersion[]
>('artifacts:listArtifactVersions');

export const updateArtifactMutation = makeFunctionReference<
	'mutation',
	UpdateArtifactArgs,
	{ ok: true; versionCreated: boolean; versionNumber: number }
>('artifacts:updateArtifact');

export const updateThreadArtifactMutation = makeFunctionReference<
	'mutation',
	UpdateThreadArtifactArgs,
	{
		ok: true;
		artifactId: Id<'artifacts'>;
		title: string;
		versionCreated: boolean;
		versionNumber: number;
	}
>('artifacts:updateThreadArtifact');

export const restoreArtifactVersionMutation = makeFunctionReference<
	'mutation',
	{ artifactVersionId: Id<'artifactVersions'> },
	{ ok: true; restored: boolean; versionNumber: number }
>('artifacts:restoreArtifactVersion');

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
