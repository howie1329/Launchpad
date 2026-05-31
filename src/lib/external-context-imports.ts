import { makeFunctionReference } from 'convex/server';
import type { Id } from '../convex/_generated/dataModel';

export type ExternalContextImportDraftStatus =
	| 'pending'
	| 'processing'
	| 'ready'
	| 'failed'
	| 'created'
	| 'abandoned';
export type ExternalContextImportSourceToolHint = 'chatgpt' | 'claude' | 'other' | 'unknown';

export type ExternalContextImportDraft = {
	_id: Id<'externalContextImportDrafts'>;
	_creationTime: number;
	ownerId: Id<'users'>;
	sourceMarkdown: string;
	status: ExternalContextImportDraftStatus;
	sourceKind: 'external_ai_context';
	sourceToolHint: ExternalContextImportSourceToolHint;
	generatedProjectName?: string;
	generatedProjectSummary?: string;
	generatedProjectBriefMarkdown?: string;
	errorMessage?: string;
	createdProjectId?: Id<'projects'>;
	modelUsed?: string;
	createdAt: number;
	updatedAt: number;
	completedAt?: number;
	projectCreatedAt?: number;
};

export const createExternalContextImportDraftMutation = makeFunctionReference<
	'mutation',
	{ sourceMarkdown: string; sourceToolHint?: ExternalContextImportSourceToolHint },
	{ draftId: Id<'externalContextImportDrafts'> }
>('externalContextImports:createDraft');

export const startExternalContextImportDraftReviewMutation = makeFunctionReference<
	'mutation',
	{
		draftId?: Id<'externalContextImportDrafts'>;
		sourceMarkdown?: string;
		sourceToolHint?: ExternalContextImportSourceToolHint;
	},
	{ draftId: Id<'externalContextImportDrafts'> }
>('externalContextImports:startDraftReview');

export const getExternalContextImportDraftQuery = makeFunctionReference<
	'query',
	{ draftId: Id<'externalContextImportDrafts'> },
	ExternalContextImportDraft | null
>('externalContextImports:getDraft');

export const listActiveExternalContextImportDraftsQuery = makeFunctionReference<
	'query',
	Record<string, never>,
	ExternalContextImportDraft[]
>('externalContextImports:listActiveDrafts');

export const updateExternalContextImportDraftSourceMutation = makeFunctionReference<
	'mutation',
	{
		draftId: Id<'externalContextImportDrafts'>;
		sourceMarkdown: string;
		sourceToolHint?: ExternalContextImportSourceToolHint;
	},
	{ ok: true }
>('externalContextImports:updateDraftSource');

export const updateExternalContextImportDraftReviewMutation = makeFunctionReference<
	'mutation',
	{
		draftId: Id<'externalContextImportDrafts'>;
		generatedProjectName: string;
		generatedProjectSummary: string;
		generatedProjectBriefMarkdown: string;
	},
	{ ok: true }
>('externalContextImports:updateDraftReview');

export const markExternalContextImportDraftProcessingMutation = makeFunctionReference<
	'mutation',
	{ draftId: Id<'externalContextImportDrafts'> },
	{ ok: true }
>('externalContextImports:markDraftProcessing');

export const markExternalContextImportDraftReadyMutation = makeFunctionReference<
	'mutation',
	{
		draftId: Id<'externalContextImportDrafts'>;
		generatedProjectName: string;
		generatedProjectSummary: string;
		generatedProjectBriefMarkdown: string;
		modelUsed?: string;
	},
	{ ok: true }
>('externalContextImports:markDraftReady');

export const markExternalContextImportDraftFailedMutation = makeFunctionReference<
	'mutation',
	{ draftId: Id<'externalContextImportDrafts'>; errorMessage: string },
	{ ok: true }
>('externalContextImports:markDraftFailed');

export const markExternalContextImportDraftCreatedMutation = makeFunctionReference<
	'mutation',
	{ draftId: Id<'externalContextImportDrafts'>; projectId: Id<'projects'> },
	{ ok: true }
>('externalContextImports:markDraftCreated');

export const abandonExternalContextImportDraftMutation = makeFunctionReference<
	'mutation',
	{ draftId: Id<'externalContextImportDrafts'> },
	{ ok: true }
>('externalContextImports:abandonDraft');
