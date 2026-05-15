import { v } from 'convex/values';
import { getOptionalAuthUserId, requireAuthUserId } from './authHelpers';
import { logActivityEvent } from './activityHelpers';
import { mutation, query } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

const metadataValue = v.record(v.string(), v.any());
const linkReasonValue = v.union(v.literal('referenced'), v.literal('imported'));
const artifactVersionActorValue = v.union(v.literal('user'), v.literal('ai'));
const artifactVersionSourceValue = v.union(v.literal('editor'), v.literal('chat'));

type ArtifactVersionActor = 'user' | 'ai';
type ArtifactVersionSource = 'editor' | 'chat';

export const createArtifact = mutation({
	args: {
		type: v.string(),
		title: v.string(),
		contentMarkdown: v.string(),
		metadata: v.optional(metadataValue),
		projectId: v.optional(v.id('projects')),
		sourceThreadId: v.optional(v.id('chatThreads')),
		versionActor: v.optional(artifactVersionActorValue),
		versionSource: v.optional(artifactVersionSourceValue),
		versionSummary: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const type = args.type.trim();
		const title = args.title.trim();
		const contentMarkdown = args.contentMarkdown;
		const versionSummary = args.versionSummary?.trim();

		if (!type) throw new Error('Artifact type is required');
		if (!title) throw new Error('Artifact title is required');
		if (!contentMarkdown.trim()) throw new Error('Artifact content is required');

		const sourceThread = args.sourceThreadId
			? await getOwnedThread(ctx, args.sourceThreadId, ownerId)
			: null;
		const projectId = await resolveProjectId(ctx, ownerId, args.projectId, sourceThread);
		const now = Date.now();
		const artifactId = await ctx.db.insert('artifacts', {
			ownerId,
			type,
			title,
			contentMarkdown,
			contentFormat: 'markdown',
			revision: 1,
			...(args.metadata ? { metadata: args.metadata } : {}),
			...(projectId ? { projectId } : {}),
			...(args.sourceThreadId ? { sourceThreadId: args.sourceThreadId } : {}),
			createdAt: now,
			updatedAt: now
		});

		await insertArtifactVersion(ctx, {
			ownerId,
			artifactId,
			versionNumber: 1,
			title,
			contentMarkdown,
			actor: args.versionActor ?? 'user',
			source: args.versionSource ?? 'editor',
			summary: versionSummary,
			now
		});

		if (args.sourceThreadId) {
			await upsertThreadArtifactLink(ctx, ownerId, args.sourceThreadId, artifactId, 'created', now);
		}

		await logActivityEvent(ctx, {
			ownerId,
			eventType: 'artifact_created',
			metadata: {
				artifactId,
				artifactType: type,
				revision: 1,
				...(projectId ? { projectId } : {}),
				...(args.sourceThreadId ? { threadId: args.sourceThreadId } : {}),
				...(versionSummary ? { summary: versionSummary } : {})
			},
			occurredAtMs: now
		});

		return { artifactId };
	}
});

export const listArtifacts = query({
	args: {},
	handler: async (ctx) => {
		const ownerId = await getOptionalAuthUserId(ctx);
		if (!ownerId) return [];

		return await ctx.db
			.query('artifacts')
			.withIndex('by_ownerId_and_updatedAt', (q) => q.eq('ownerId', ownerId))
			.order('desc')
			.take(200);
	}
});

export const listProjectArtifacts = query({
	args: {
		projectId: v.id('projects')
	},
	handler: async (ctx, args) => {
		const ownerId = await getOptionalAuthUserId(ctx);
		if (!ownerId) return [];

		await getOwnedProject(ctx, args.projectId, ownerId);

		return await ctx.db
			.query('artifacts')
			.withIndex('by_projectId_and_updatedAt', (q) => q.eq('projectId', args.projectId))
			.order('desc')
			.take(100);
	}
});

export const listThreadArtifacts = query({
	args: {
		threadId: v.id('chatThreads')
	},
	handler: async (ctx, args) => {
		const ownerId = await getOptionalAuthUserId(ctx);
		if (!ownerId) return [];

		await getOwnedThread(ctx, args.threadId, ownerId);

		const links = await ctx.db
			.query('threadArtifactLinks')
			.withIndex('by_threadId_and_updatedAt', (q) => q.eq('threadId', args.threadId))
			.order('desc')
			.take(100);
		const rows = [];

		for (const link of links) {
			const artifact = await ctx.db.get(link.artifactId);
			if (artifact && artifact.ownerId === ownerId) {
				rows.push({ link, artifact });
			}
		}

		return rows;
	}
});

export const listMentionableArtifacts = query({
	args: {
		threadId: v.id('chatThreads')
	},
	handler: async (ctx, args) => {
		const ownerId = await getOptionalAuthUserId(ctx);
		if (!ownerId) return [];

		const thread = await getOwnedThread(ctx, args.threadId, ownerId);
		const links = await ctx.db
			.query('threadArtifactLinks')
			.withIndex('by_threadId_and_updatedAt', (q) => q.eq('threadId', args.threadId))
			.order('desc')
			.take(100);
		const linkedIds = new Set(links.map((link) => link.artifactId));
		const rows: Array<{ artifact: Doc<'artifacts'>; linkedToThread: boolean }> = [];
		const seen = new Set<Id<'artifacts'>>();

		for (const link of links) {
			const artifact = await ctx.db.get(link.artifactId);
			if (artifact && artifact.ownerId === ownerId) {
				rows.push({ artifact, linkedToThread: true });
				seen.add(artifact._id);
			}
		}

		if (thread.projectId) {
			const projectArtifacts = await ctx.db
				.query('artifacts')
				.withIndex('by_projectId_and_updatedAt', (q) => q.eq('projectId', thread.projectId))
				.order('desc')
				.take(100);

			for (const artifact of projectArtifacts) {
				if (seen.has(artifact._id)) continue;
				rows.push({ artifact, linkedToThread: linkedIds.has(artifact._id) });
				seen.add(artifact._id);
			}
		}

		return rows;
	}
});

export const getArtifact = query({
	args: {
		artifactId: v.id('artifacts')
	},
	handler: async (ctx, args) => {
		const ownerId = await getOptionalAuthUserId(ctx);
		if (!ownerId) return null;

		const artifact = await ctx.db.get(args.artifactId);
		if (!artifact || artifact.ownerId !== ownerId) return null;

		return artifact;
	}
});

export const listArtifactVersions = query({
	args: {
		artifactId: v.id('artifacts')
	},
	handler: async (ctx, args) => {
		const ownerId = await getOptionalAuthUserId(ctx);
		if (!ownerId) return [];

		await getOwnedArtifact(ctx, args.artifactId, ownerId);

		const versions = await ctx.db
			.query('artifactVersions')
			.withIndex('by_artifactId_and_versionNumber', (q) => q.eq('artifactId', args.artifactId))
			.order('desc')
			.take(100);

		return versions;
	}
});

export const updateArtifact = mutation({
	args: {
		artifactId: v.id('artifacts'),
		title: v.optional(v.string()),
		contentMarkdown: v.optional(v.string()),
		metadata: v.optional(v.union(metadataValue, v.null())),
		projectId: v.optional(v.union(v.id('projects'), v.null()))
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const artifact = await getOwnedArtifact(ctx, args.artifactId, ownerId);
		const now = Date.now();
		const title = args.title === undefined ? undefined : args.title.trim();

		if (args.title !== undefined && !title) {
			throw new Error('Artifact title is required');
		}
		if (args.contentMarkdown !== undefined && !args.contentMarkdown.trim()) {
			throw new Error('Artifact content is required');
		}
		if (args.projectId) {
			await getOwnedProject(ctx, args.projectId, ownerId);
		}

		const result = await writeArtifactAndMaybeVersion(ctx, {
			artifact,
			ownerId,
			now,
			title,
			contentMarkdown: args.contentMarkdown,
			metadata: args.metadata,
			projectId: args.projectId,
			actor: 'user',
			source: 'editor'
		});

		return {
			ok: true as const,
			versionCreated: result.versionCreated,
			versionNumber: result.versionNumber
		};
	}
});

export const updateThreadArtifact = mutation({
	args: {
		threadId: v.id('chatThreads'),
		artifactId: v.id('artifacts'),
		title: v.string(),
		contentMarkdown: v.string(),
		summary: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const thread = await getOwnedThread(ctx, args.threadId, ownerId);
		const artifact = await getOwnedArtifact(ctx, args.artifactId, ownerId);
		const summary = args.summary?.trim();
		const title = args.title.trim();

		if (!title) throw new Error('Artifact title is required');
		if (!args.contentMarkdown.trim()) throw new Error('Artifact content is required');

		await requireArtifactLinkedToThread(ctx, thread._id, artifact._id);

		const now = Date.now();
		const result = await writeArtifactAndMaybeVersion(ctx, {
			artifact,
			ownerId,
			now,
			title,
			contentMarkdown: args.contentMarkdown,
			actor: 'ai',
			source: 'chat',
			summary
		});

		return {
			ok: true as const,
			artifactId: artifact._id,
			title,
			versionCreated: result.versionCreated,
			versionNumber: result.versionNumber
		};
	}
});

export const restoreArtifactVersion = mutation({
	args: {
		artifactVersionId: v.id('artifactVersions')
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const version = await getOwnedArtifactVersion(ctx, args.artifactVersionId, ownerId);
		const artifact = await getOwnedArtifact(ctx, version.artifactId, ownerId);
		const now = Date.now();

		if (artifact.title === version.title && artifact.contentMarkdown === version.contentMarkdown) {
			return {
				ok: true as const,
				restored: false as const,
				versionNumber: getArtifactRevision(artifact)
			};
		}

		const result = await writeArtifactAndMaybeVersion(ctx, {
			artifact,
			ownerId,
			now,
			title: version.title,
			contentMarkdown: version.contentMarkdown,
			actor: 'user',
			source: 'editor',
			summary: `Restored version ${version.versionNumber}`
		});

		await logActivityEvent(ctx, {
			ownerId,
			eventType: 'artifact_restored',
			metadata: {
				artifactId: artifact._id,
				fromVersionNumber: version.versionNumber,
				versionNumber: result.versionNumber
			},
			occurredAtMs: now
		});

		return {
			ok: true as const,
			restored: result.versionCreated,
			versionNumber: result.versionNumber
		};
	}
});

export const deleteArtifact = mutation({
	args: {
		artifactId: v.id('artifacts')
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		await getOwnedArtifact(ctx, args.artifactId, ownerId);

		const links = await ctx.db
			.query('threadArtifactLinks')
			.withIndex('by_artifactId_and_updatedAt', (q) => q.eq('artifactId', args.artifactId))
			.collect();
		for (const link of links) {
			await ctx.db.delete(link._id);
		}

		const versions = await ctx.db
			.query('artifactVersions')
			.withIndex('by_artifactId_and_versionNumber', (q) => q.eq('artifactId', args.artifactId))
			.collect();
		for (const version of versions) {
			await ctx.db.delete(version._id);
		}

		const memoryRow = await ctx.db
			.query('memorySyncs')
			.withIndex('by_sourceType_and_sourceId', (q) =>
				q.eq('sourceType', 'artifact').eq('sourceId', args.artifactId)
			)
			.unique();
		if (memoryRow) {
			await ctx.db.delete(memoryRow._id);
		}

		await ctx.db.delete(args.artifactId);

		const now = Date.now();
		await logActivityEvent(ctx, {
			ownerId,
			eventType: 'artifact_deleted',
			metadata: {
				artifactId: args.artifactId
			},
			occurredAtMs: now
		});

		return { ok: true as const };
	}
});

export const linkArtifactToThread = mutation({
	args: {
		threadId: v.id('chatThreads'),
		artifactId: v.id('artifacts'),
		reason: linkReasonValue
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);

		await getOwnedThread(ctx, args.threadId, ownerId);
		await getOwnedArtifact(ctx, args.artifactId, ownerId);
		await upsertThreadArtifactLink(
			ctx,
			ownerId,
			args.threadId,
			args.artifactId,
			args.reason,
			Date.now()
		);

		return { ok: true as const };
	}
});

async function resolveProjectId(
	ctx: QueryCtx | MutationCtx,
	ownerId: Id<'users'>,
	projectId: Id<'projects'> | undefined,
	sourceThread: Doc<'chatThreads'> | null
) {
	if (projectId) {
		await getOwnedProject(ctx, projectId, ownerId);
	}

	if (sourceThread?.projectId && projectId && sourceThread.projectId !== projectId) {
		throw new Error('Artifact project must match source thread project');
	}

	return projectId ?? sourceThread?.projectId;
}

async function writeArtifactAndMaybeVersion(
	ctx: MutationCtx,
	{
		artifact,
		ownerId,
		now,
		title,
		contentMarkdown,
		metadata,
		projectId,
		actor,
		source,
		summary
	}: {
		artifact: Doc<'artifacts'>;
		ownerId: Id<'users'>;
		now: number;
		title?: string;
		contentMarkdown?: string;
		metadata?: Record<string, unknown> | null;
		projectId?: Id<'projects'> | null;
		actor: ArtifactVersionActor;
		source: ArtifactVersionSource;
		summary?: string;
	}
) {
	const nextTitle = title ?? artifact.title;
	const nextContentMarkdown = contentMarkdown ?? artifact.contentMarkdown;
	const contentChanged =
		nextTitle !== artifact.title || nextContentMarkdown !== artifact.contentMarkdown;

	const patch: Partial<Doc<'artifacts'>> = { updatedAt: now };
	if (title !== undefined) patch.title = nextTitle;
	if (contentMarkdown !== undefined) patch.contentMarkdown = nextContentMarkdown;
	if (metadata !== undefined) patch.metadata = metadata ?? undefined;
	if (projectId !== undefined) patch.projectId = projectId ?? undefined;

	let versionNumber = getArtifactRevision(artifact);
	if (contentChanged) {
		versionNumber += 1;
		patch.revision = versionNumber;
	}

	await ctx.db.patch(artifact._id, patch);

	if (contentChanged) {
		await insertArtifactVersion(ctx, {
			ownerId,
			artifactId: artifact._id,
			versionNumber,
			title: nextTitle,
			contentMarkdown: nextContentMarkdown,
			actor,
			source,
			summary,
			now
		});

		await logActivityEvent(ctx, {
			ownerId,
			eventType: 'artifact_updated',
			metadata: {
				artifactId: artifact._id,
				revision: versionNumber,
				actor,
				source,
				...(summary ? { summary } : {})
			},
			occurredAtMs: now
		});
	}

	return { versionCreated: contentChanged, versionNumber };
}

async function insertArtifactVersion(
	ctx: MutationCtx,
	{
		ownerId,
		artifactId,
		versionNumber,
		title,
		contentMarkdown,
		actor,
		source,
		summary,
		now
	}: {
		ownerId: Id<'users'>;
		artifactId: Id<'artifacts'>;
		versionNumber: number;
		title: string;
		contentMarkdown: string;
		actor: ArtifactVersionActor;
		source: ArtifactVersionSource;
		summary?: string;
		now: number;
	}
) {
	await ctx.db.insert('artifactVersions', {
		ownerId,
		artifactId,
		versionNumber,
		title,
		contentMarkdown,
		actor,
		source,
		...(summary ? { summary } : {}),
		createdAt: now,
		updatedAt: now
	});
}

function getArtifactRevision(artifact: Doc<'artifacts'>) {
	return artifact.revision ?? 1;
}

async function requireArtifactLinkedToThread(
	ctx: MutationCtx,
	threadId: Id<'chatThreads'>,
	artifactId: Id<'artifacts'>
) {
	const link = await ctx.db
		.query('threadArtifactLinks')
		.withIndex('by_threadId_and_artifactId', (q) =>
			q.eq('threadId', threadId).eq('artifactId', artifactId)
		)
		.unique();

	if (!link) {
		throw new Error('Artifact is not linked to this thread');
	}
}

async function upsertThreadArtifactLink(
	ctx: MutationCtx,
	ownerId: Id<'users'>,
	threadId: Id<'chatThreads'>,
	artifactId: Id<'artifacts'>,
	reason: 'created' | 'referenced' | 'imported',
	now: number
) {
	const existing = await ctx.db
		.query('threadArtifactLinks')
		.withIndex('by_threadId_and_artifactId', (q) =>
			q.eq('threadId', threadId).eq('artifactId', artifactId)
		)
		.unique();

	if (existing) {
		await ctx.db.patch(existing._id, {
			reason,
			updatedAt: now
		});
		return existing._id;
	}

	return await ctx.db.insert('threadArtifactLinks', {
		ownerId,
		threadId,
		artifactId,
		reason,
		createdAt: now,
		updatedAt: now
	});
}

async function getOwnedProject(
	ctx: QueryCtx | MutationCtx,
	projectId: Id<'projects'>,
	ownerId: Id<'users'>
) {
	const project = await ctx.db.get(projectId);
	if (!project || project.ownerId !== ownerId) {
		throw new Error('Project not found');
	}

	return project;
}

async function getOwnedThread(
	ctx: QueryCtx | MutationCtx,
	threadId: Id<'chatThreads'>,
	ownerId: Id<'users'>
) {
	const thread = await ctx.db.get(threadId);
	if (!thread || thread.ownerId !== ownerId) {
		throw new Error('Thread not found');
	}

	return thread;
}

async function getOwnedArtifact(
	ctx: QueryCtx | MutationCtx,
	artifactId: Id<'artifacts'>,
	ownerId: Id<'users'>
) {
	const artifact = await ctx.db.get(artifactId);
	if (!artifact || artifact.ownerId !== ownerId) {
		throw new Error('Artifact not found');
	}

	return artifact;
}

async function getOwnedArtifactVersion(
	ctx: QueryCtx | MutationCtx,
	artifactVersionId: Id<'artifactVersions'>,
	ownerId: Id<'users'>
) {
	const version = await ctx.db.get(artifactVersionId);
	if (!version || version.ownerId !== ownerId) {
		throw new Error('Artifact version not found');
	}

	return version;
}
