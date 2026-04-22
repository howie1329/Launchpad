import { v } from 'convex/values';
import { PLACEHOLDER_THREAD_TITLE } from '../lib/thread-title';
import { getOptionalAuthUserId, requireAuthUserId } from './authHelpers';
import { logActivityEvent } from './activityHelpers'
import { mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

type ChatRole = 'system' | 'user' | 'assistant';

type TextPart = {
	type: 'text';
	text: string;
};

type StoredUIMessage = {
	id: string;
	role: ChatRole;
	parts: Array<{ type?: string; text?: unknown }>;
};

export const createThread = mutation({
	args: {
		projectId: v.optional(v.id('projects')),
		text: v.string(),
		modelId: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const text = args.text.trim();

		if (!text) {
			throw new Error('Chat message is required');
		}

		if (args.projectId) {
			await getOwnedProject(ctx, args.projectId, ownerId);
		}

		const now = Date.now();
		const threadId = await ctx.db.insert('chatThreads', {
			ownerId,
			title: PLACEHOLDER_THREAD_TITLE,
			scopeType: args.projectId ? 'project' : 'general',
			...(args.projectId ? { projectId: args.projectId } : {}),
			createdAt: now,
			updatedAt: now
		});
		const messageId = `${threadId}:initial-user`;
		const message = {
			id: messageId,
			role: 'user' as const,
			parts: [{ type: 'text' as const, text } satisfies TextPart]
		};

		await ctx.db.insert('chatMessages', {
			ownerId,
			threadId,
			messageId,
			role: 'user',
			message,
			text,
			modelId: args.modelId,
			sequence: 0,
			createdAt: now,
			updatedAt: now
		});

		await logActivityEvent(ctx, {
			ownerId,
			eventType: 'thread_created',
			metadata: {
				threadId,
				scopeType: args.projectId ? 'project' : 'general',
				...(args.projectId ? { projectId: args.projectId } : {}),
				...(args.modelId ? { modelId: args.modelId } : {})
			},
			occurredAtMs: now
		})

		return { threadId };
	}
});

export const listThreads = query({
	args: {
		projectId: v.optional(v.id('projects'))
	},
	handler: async (ctx, args) => {
		const ownerId = await getOptionalAuthUserId(ctx);
		if (!ownerId) return [];

		if (args.projectId) {
			await getOwnedProject(ctx, args.projectId, ownerId);

			return await ctx.db
				.query('chatThreads')
				.withIndex('by_projectId_and_updatedAt', (q) => q.eq('projectId', args.projectId))
				.order('desc')
				.take(50);
		}

		return await ctx.db
			.query('chatThreads')
			.withIndex('by_ownerId_and_updatedAt', (q) => q.eq('ownerId', ownerId))
			.order('desc')
			.take(50);
	}
});

export const getThread = query({
	args: {
		threadId: v.id('chatThreads')
	},
	handler: async (ctx, args) => {
		const ownerId = await getOptionalAuthUserId(ctx);
		if (!ownerId) return null;

		const thread = await ctx.db.get(args.threadId);
		if (!thread || thread.ownerId !== ownerId) return null;

		return thread;
	}
});

export const listMessages = query({
	args: {
		threadId: v.id('chatThreads')
	},
	handler: async (ctx, args) => {
		const ownerId = await getOptionalAuthUserId(ctx);
		if (!ownerId) return [];

		await getOwnedThread(ctx, args.threadId, ownerId);

		return await ctx.db
			.query('chatMessages')
			.withIndex('by_threadId_and_sequence', (q) => q.eq('threadId', args.threadId))
			.order('asc')
			.take(200);
	}
});

export const saveMessages = mutation({
	args: {
		threadId: v.id('chatThreads'),
		messages: v.array(v.any()),
		modelId: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const thread = await getOwnedThread(ctx, args.threadId, ownerId);
		const now = Date.now();

		if (args.messages.length > 200) {
			throw new Error('Too many chat messages');
		}

		for (const [sequence, rawMessage] of args.messages.entries()) {
			const message = assertUIMessage(rawMessage);
			const existing = await ctx.db
				.query('chatMessages')
				.withIndex('by_threadId_and_messageId', (q) =>
					q.eq('threadId', args.threadId).eq('messageId', message.id)
				)
				.unique();
			const row = {
				ownerId,
				threadId: args.threadId,
				messageId: message.id,
				role: message.role,
				message,
				text: extractText(message),
				modelId: args.modelId,
				sequence,
				updatedAt: now
			};

			if (existing) {
				await ctx.db.patch(existing._id, row);
			} else {
				await ctx.db.insert('chatMessages', {
					...row,
					createdAt: now
				});
			}
		}

		await ctx.db.patch(thread._id, {
			updatedAt: now
		});

		return { saved: args.messages.length };
	}
});

export const setThreadGeneratedTitle = mutation({
	args: {
		threadId: v.id('chatThreads'),
		title: v.string(),
		titleGeneratedAt: v.number()
	},
	handler: async (ctx, args) => {
		const ownerId = await requireAuthUserId(ctx);
		const thread = await getOwnedThread(ctx, args.threadId, ownerId);

		if (thread.titleGeneratedAt !== undefined) {
			return { updated: false as const };
		}
		if (thread.title !== PLACEHOLDER_THREAD_TITLE) {
			return { updated: false as const };
		}

		const trimmed = args.title.trim();
		if (!trimmed) {
			throw new Error('Title is required');
		}

		const safeTitle = trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed;
		const now = Date.now();

		await ctx.db.patch(thread._id, {
			title: safeTitle,
			titleGeneratedAt: args.titleGeneratedAt,
			updatedAt: now
		});

		return { updated: true as const };
	}
});

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

function assertUIMessage(value: unknown): StoredUIMessage {
	if (!value || typeof value !== 'object') {
		throw new Error('Invalid UI message');
	}

	const message = value as Partial<StoredUIMessage>;
	if (typeof message.id !== 'string' || !isRole(message.role) || !Array.isArray(message.parts)) {
		throw new Error('Invalid UI message');
	}

	return message as StoredUIMessage;
}

function isRole(value: unknown): value is ChatRole {
	return value === 'system' || value === 'user' || value === 'assistant';
}

function extractText(message: StoredUIMessage) {
	return message.parts
		.filter((part): part is TextPart => part.type === 'text' && typeof part.text === 'string')
		.map((part) => part.text)
		.join('\n')
		.trim();
}
