import { v } from 'convex/values';
import { getOptionalAuthUserId, requireAuthUserId } from './authHelpers';
import { createNotificationForOwner, dismissNotificationsForOwnerTarget } from './notifications';
import { logActivityEvent } from './activityHelpers';
import { internal } from './_generated/api';
import { internalMutation, internalQuery, mutation, query } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

const sourceToolHintValue = v.union(
	v.literal('chatgpt'),
	v.literal('claude'),
	v.literal('other'),
	v.literal('unknown')
);

const sourceMarkdownMaxLength = 80_000;
const activeStatuses = new Set(['pending', 'processing', 'ready', 'failed']);

export const startDraftReview = mutation({
	args: {
		draftId: v.optional(v.id('externalContextImportDrafts')),
		sourceMarkdown: v.optional(v.string()),
		sourceToolHint: v.optional(sourceToolHintValue)
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const now = Date.now();
		let draftId = args.draftId;

		if (draftId) {
			const draft = await getOwnedDraft(ctx, draftId, ownerId);
			if (draft.status === 'created') throw new Error('Created imports cannot be reviewed');
			if (draft.status === 'abandoned') throw new Error('Abandoned imports cannot be reviewed');

			const sourcePatch =
				args.sourceMarkdown !== undefined
					? {
							sourceMarkdown: normalizeSourceMarkdown(args.sourceMarkdown),
							sourceToolHint: args.sourceToolHint ?? draft.sourceToolHint
						}
					: {};

			await ctx.db.patch(draft._id, {
				...sourcePatch,
				status: 'processing',
				errorMessage: undefined,
				generatedProjectName: undefined,
				generatedProjectSummary: undefined,
				generatedProjectBriefMarkdown: undefined,
				modelUsed: undefined,
				completedAt: undefined,
				updatedAt: now
			});
		} else {
			if (args.sourceMarkdown === undefined) throw new Error('Imported context is required');
			const sourceMarkdown = normalizeSourceMarkdown(args.sourceMarkdown);
			draftId = await ctx.db.insert('externalContextImportDrafts', {
				ownerId,
				sourceMarkdown,
				status: 'processing',
				sourceKind: 'external_ai_context',
				sourceToolHint: args.sourceToolHint ?? 'unknown',
				createdAt: now,
				updatedAt: now
			});
		}

		await ctx.scheduler.runAfter(0, internal.externalContextImportSynthesis.synthesizeDraft, {
			draftId
		});

		return { draftId };
	}
});

export const createDraft = mutation({
	args: {
		sourceMarkdown: v.string(),
		sourceToolHint: v.optional(sourceToolHintValue)
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const sourceMarkdown = normalizeSourceMarkdown(args.sourceMarkdown);
		const now = Date.now();
		const draftId = await ctx.db.insert('externalContextImportDrafts', {
			ownerId,
			sourceMarkdown,
			status: 'pending',
			sourceKind: 'external_ai_context',
			sourceToolHint: args.sourceToolHint ?? 'unknown',
			createdAt: now,
			updatedAt: now
		});

		return { draftId };
	}
});

export const updateDraftReview = mutation({
	args: {
		draftId: v.id('externalContextImportDrafts'),
		generatedProjectName: v.string(),
		generatedProjectSummary: v.string(),
		generatedProjectBriefMarkdown: v.string()
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const draft = await getOwnedDraft(ctx, args.draftId, ownerId);
		if (draft.status === 'created') throw new Error('Created imports cannot be edited');
		if (draft.status === 'abandoned') throw new Error('Abandoned imports cannot be edited');

		const generatedProjectName = args.generatedProjectName.trim();
		const generatedProjectSummary = args.generatedProjectSummary.trim();
		const generatedProjectBriefMarkdown = args.generatedProjectBriefMarkdown.trim();

		if (!generatedProjectName) throw new Error('Generated project name is required');
		if (!generatedProjectBriefMarkdown) throw new Error('Generated project brief is required');

		await ctx.db.patch(draft._id, {
			generatedProjectName,
			generatedProjectSummary,
			generatedProjectBriefMarkdown,
			updatedAt: Date.now()
		});

		return { ok: true };
	}
});

export const createProjectFromDraft = mutation({
	args: {
		draftId: v.id('externalContextImportDrafts'),
		projectName: v.string(),
		projectSummary: v.optional(v.string()),
		projectBriefMarkdown: v.string()
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const draft = await getOwnedDraft(ctx, args.draftId, ownerId);
		if (draft.status === 'created') throw new Error('Project already created from this import');
		if (draft.status !== 'ready') throw new Error('Import review is not ready');

		const projectName = args.projectName.trim();
		const projectSummary = args.projectSummary?.trim();
		const projectBriefMarkdown = args.projectBriefMarkdown.trim();
		if (!projectName) throw new Error('Project name is required');
		if (!projectBriefMarkdown) throw new Error('Project Brief is required');

		const now = Date.now();
		const projectId = await ctx.db.insert('projects', {
			ownerId,
			name: projectName,
			...(projectSummary ? { summary: projectSummary } : {}),
			createdAt: now,
			updatedAt: now
		});
		const sourceArtifactId = await insertImportedArtifact(ctx, {
			ownerId,
			projectId,
			title: 'Imported external context',
			type: 'source',
			content: draft.sourceMarkdown,
			metadata: {
				source: 'external-ai-context-import',
				draftId: draft._id,
				sourceToolHint: draft.sourceToolHint
			},
			actor: 'user',
			summary: 'Raw imported external AI context',
			now
		});
		const briefArtifactId = await insertImportedArtifact(ctx, {
			ownerId,
			projectId,
			title: 'Project Brief',
			type: 'brief',
			content: projectBriefMarkdown,
			metadata: {
				source: 'external-ai-context-import',
				draftId: draft._id,
				sourceArtifactId
			},
			actor: 'ai',
			summary: 'Generated project brief from imported external context',
			now
		});

		await ctx.db.patch(draft._id, {
			status: 'created',
			generatedProjectName: projectName,
			generatedProjectSummary: projectSummary ?? '',
			generatedProjectBriefMarkdown: projectBriefMarkdown,
			createdProjectId: projectId,
			projectCreatedAt: now,
			updatedAt: now
		});
		await dismissNotificationsForOwnerTarget(ctx, {
			ownerId,
			targetKind: 'externalContextImportDraft',
			targetId: draft._id
		});
		await logActivityEvent(ctx, {
			ownerId,
			eventType: 'project_created_from_external_context_import',
			metadata: {
				projectId,
				draftId: draft._id,
				sourceArtifactId,
				briefArtifactId
			},
			occurredAtMs: now
		});

		return { projectId, sourceArtifactId, briefArtifactId };
	}
});

export const getDraft = query({
	args: {
		draftId: v.id('externalContextImportDrafts')
	},
	handler: async (ctx, args) => {
		const ownerId = await getOptionalAuthUserId(ctx);
		if (!ownerId) return null;

		return await getOwnedDraftOrNull(ctx, args.draftId, ownerId);
	}
});

export const listActiveDrafts = query({
	args: {},
	handler: async (ctx) => {
		const ownerId = await getOptionalAuthUserId(ctx);
		if (!ownerId) return [];

		const drafts = await ctx.db
			.query('externalContextImportDrafts')
			.withIndex('by_ownerId_and_updatedAt', (q) => q.eq('ownerId', ownerId))
			.order('desc')
			.take(50);

		return drafts.filter((draft) => activeStatuses.has(draft.status));
	}
});

export const updateDraftSource = mutation({
	args: {
		draftId: v.id('externalContextImportDrafts'),
		sourceMarkdown: v.string(),
		sourceToolHint: v.optional(sourceToolHintValue)
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const draft = await getOwnedDraft(ctx, args.draftId, ownerId);
		if (draft.status === 'created') throw new Error('Created imports cannot be edited');

		const now = Date.now();
		await ctx.db.patch(draft._id, {
			sourceMarkdown: normalizeSourceMarkdown(args.sourceMarkdown),
			status: 'pending',
			sourceToolHint: args.sourceToolHint ?? draft.sourceToolHint,
			errorMessage: undefined,
			generatedProjectName: undefined,
			generatedProjectSummary: undefined,
			generatedProjectBriefMarkdown: undefined,
			modelUsed: undefined,
			completedAt: undefined,
			updatedAt: now
		});

		return { ok: true };
	}
});

export const markDraftProcessing = mutation({
	args: {
		draftId: v.id('externalContextImportDrafts')
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const draft = await getOwnedDraft(ctx, args.draftId, ownerId);
		if (draft.status === 'created') throw new Error('Created imports cannot be processed');

		const now = Date.now();
		await ctx.db.patch(draft._id, {
			status: 'processing',
			errorMessage: undefined,
			updatedAt: now
		});

		return { ok: true };
	}
});

export const markDraftReady = mutation({
	args: {
		draftId: v.id('externalContextImportDrafts'),
		generatedProjectName: v.string(),
		generatedProjectSummary: v.string(),
		generatedProjectBriefMarkdown: v.string(),
		modelUsed: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const draft = await getOwnedDraft(ctx, args.draftId, ownerId);
		if (draft.status === 'created') throw new Error('Created imports cannot be updated');

		const generatedProjectName = args.generatedProjectName.trim();
		const generatedProjectSummary = args.generatedProjectSummary.trim();
		const generatedProjectBriefMarkdown = args.generatedProjectBriefMarkdown.trim();
		const modelUsed = args.modelUsed?.trim();

		if (!generatedProjectName) throw new Error('Generated project name is required');
		if (!generatedProjectBriefMarkdown) throw new Error('Generated project brief is required');

		const now = Date.now();
		await ctx.db.patch(draft._id, {
			status: 'ready',
			generatedProjectName,
			generatedProjectSummary,
			generatedProjectBriefMarkdown,
			...(modelUsed ? { modelUsed } : { modelUsed: undefined }),
			errorMessage: undefined,
			completedAt: now,
			updatedAt: now
		});

		await createNotificationForOwner(ctx, {
			ownerId,
			type: 'external_context_import',
			state: 'success',
			title: 'Your imported project is ready to review.',
			body: generatedProjectName,
			targetKind: 'externalContextImportDraft',
			targetId: draft._id,
			createdAt: now
		});

		return { ok: true };
	}
});

export const markDraftFailed = mutation({
	args: {
		draftId: v.id('externalContextImportDrafts'),
		errorMessage: v.string()
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const draft = await getOwnedDraft(ctx, args.draftId, ownerId);
		if (draft.status === 'created') throw new Error('Created imports cannot be updated');

		const errorMessage = args.errorMessage.trim() || 'Import synthesis failed.';
		const now = Date.now();
		await ctx.db.patch(draft._id, {
			status: 'failed',
			errorMessage,
			completedAt: now,
			updatedAt: now
		});

		await createNotificationForOwner(ctx, {
			ownerId,
			type: 'external_context_import',
			state: 'failed',
			title: 'Imported project review failed.',
			body: 'Open the import to retry.',
			targetKind: 'externalContextImportDraft',
			targetId: draft._id,
			createdAt: now
		});

		return { ok: true };
	}
});

export const markDraftCreated = mutation({
	args: {
		draftId: v.id('externalContextImportDrafts'),
		projectId: v.id('projects')
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const draft = await getOwnedDraft(ctx, args.draftId, ownerId);
		const project = await ctx.db.get(args.projectId);
		if (!project || project.ownerId !== ownerId) throw new Error('Project not found');

		const now = Date.now();
		await ctx.db.patch(draft._id, {
			status: 'created',
			createdProjectId: args.projectId,
			projectCreatedAt: now,
			updatedAt: now
		});

		return { ok: true };
	}
});

export const abandonDraft = mutation({
	args: {
		draftId: v.id('externalContextImportDrafts')
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const draft = await getOwnedDraft(ctx, args.draftId, ownerId);
		if (draft.status === 'created') throw new Error('Created imports cannot be abandoned');

		const now = Date.now();
		await ctx.db.patch(draft._id, {
			status: 'abandoned',
			updatedAt: now
		});

		return { ok: true };
	}
});

export const getDraftForSynthesis = internalQuery({
	args: {
		draftId: v.id('externalContextImportDrafts')
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.draftId);
	}
});

export const markDraftReadyForOwner = internalMutation({
	args: {
		ownerId: v.id('users'),
		draftId: v.id('externalContextImportDrafts'),
		generatedProjectName: v.string(),
		generatedProjectSummary: v.string(),
		generatedProjectBriefMarkdown: v.string(),
		modelUsed: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const draft = await ctx.db.get(args.draftId);
		if (!draft || draft.ownerId !== args.ownerId) throw new Error('Import draft not found');
		if (draft.status !== 'processing') return { ok: true, skipped: true };

		const generatedProjectName = args.generatedProjectName.trim();
		const generatedProjectSummary = args.generatedProjectSummary.trim();
		const generatedProjectBriefMarkdown = args.generatedProjectBriefMarkdown.trim();
		const modelUsed = args.modelUsed?.trim();

		if (!generatedProjectName) throw new Error('Generated project name is required');
		if (!generatedProjectBriefMarkdown) throw new Error('Generated project brief is required');

		const now = Date.now();
		await ctx.db.patch(draft._id, {
			status: 'ready',
			generatedProjectName,
			generatedProjectSummary,
			generatedProjectBriefMarkdown,
			...(modelUsed ? { modelUsed } : { modelUsed: undefined }),
			errorMessage: undefined,
			completedAt: now,
			updatedAt: now
		});

		await createNotificationForOwner(ctx, {
			ownerId: args.ownerId,
			type: 'external_context_import',
			state: 'success',
			title: 'Your imported project is ready to review.',
			body: generatedProjectName,
			targetKind: 'externalContextImportDraft',
			targetId: draft._id,
			createdAt: now
		});

		return { ok: true, skipped: false };
	}
});

export const markDraftFailedForOwner = internalMutation({
	args: {
		ownerId: v.id('users'),
		draftId: v.id('externalContextImportDrafts'),
		errorMessage: v.string()
	},
	handler: async (ctx, args) => {
		const draft = await ctx.db.get(args.draftId);
		if (!draft || draft.ownerId !== args.ownerId) throw new Error('Import draft not found');
		if (draft.status !== 'processing') return { ok: true, skipped: true };

		const errorMessage = args.errorMessage.trim() || 'Import synthesis failed.';
		const now = Date.now();
		await ctx.db.patch(draft._id, {
			status: 'failed',
			errorMessage,
			completedAt: now,
			updatedAt: now
		});

		await createNotificationForOwner(ctx, {
			ownerId: args.ownerId,
			type: 'external_context_import',
			state: 'failed',
			title: 'Imported project review failed.',
			body: 'Open the import to retry.',
			targetKind: 'externalContextImportDraft',
			targetId: draft._id,
			createdAt: now
		});

		return { ok: true, skipped: false };
	}
});

function normalizeSourceMarkdown(sourceMarkdownInput: string) {
	const sourceMarkdown = sourceMarkdownInput.trim();
	if (!sourceMarkdown) throw new Error('Imported context is required');
	if (sourceMarkdown.length > sourceMarkdownMaxLength) {
		throw new Error('Imported context is too long');
	}
	return sourceMarkdown;
}

async function getOwnedDraft(
	ctx: QueryCtx | MutationCtx,
	draftId: Id<'externalContextImportDrafts'>,
	ownerId: Id<'users'>
) {
	const draft = await getOwnedDraftOrNull(ctx, draftId, ownerId);
	if (!draft) throw new Error('Import draft not found');
	return draft;
}

async function getOwnedDraftOrNull(
	ctx: QueryCtx | MutationCtx,
	draftId: Id<'externalContextImportDrafts'>,
	ownerId: Id<'users'>
): Promise<Doc<'externalContextImportDrafts'> | null> {
	const draft = await ctx.db.get(draftId);
	if (!draft || draft.ownerId !== ownerId) return null;
	return draft;
}

async function insertImportedArtifact(
	ctx: MutationCtx,
	args: {
		ownerId: Id<'users'>;
		projectId: Id<'projects'>;
		title: string;
		type: string;
		content: string;
		metadata: Record<string, unknown>;
		actor: 'user' | 'ai';
		summary: string;
		now: number;
	}
) {
	const artifactId = await ctx.db.insert('artifacts', {
		ownerId: args.ownerId,
		type: args.type,
		title: args.title,
		content: args.content,
		contentFormat: 'markdown',
		revision: 1,
		metadata: args.metadata,
		projectId: args.projectId,
		createdAt: args.now,
		updatedAt: args.now
	});

	await ctx.db.insert('artifactVersions', {
		ownerId: args.ownerId,
		artifactId,
		versionNumber: 1,
		title: args.title,
		content: args.content,
		actor: args.actor,
		source: 'editor',
		summary: args.summary,
		createdAt: args.now,
		updatedAt: args.now
	});

	await logActivityEvent(ctx, {
		ownerId: args.ownerId,
		eventType: 'artifact_created',
		metadata: {
			artifactId,
			artifactType: args.type,
			projectId: args.projectId,
			revision: 1,
			summary: args.summary
		},
		occurredAtMs: args.now
	});

	return artifactId;
}
