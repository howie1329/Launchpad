import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

type IdeaChatRole = 'system' | 'user' | 'assistant';

type TextPart = {
	type: 'text';
	text: string;
};

type StoredUIMessage = {
	id: string;
	role: IdeaChatRole;
	parts: Array<{ type?: string; text?: unknown }>;
};

export const listIdeas = query({
	args: {},
	handler: async (ctx) => {
		const ownerId = await getOwnerId(ctx);
		if (!ownerId) return [];

		return await ctx.db
			.query('ideas')
			.withIndex('by_ownerId_and_updatedAt', (q) => q.eq('ownerId', ownerId))
			.order('desc')
			.take(50);
	}
});

export const getIdea = query({
	args: {
		ideaId: v.id('ideas')
	},
	handler: async (ctx, args) => {
		const ownerId = await getOwnerId(ctx);
		if (!ownerId) return null;

		const idea = await ctx.db.get(args.ideaId);
		if (!idea || idea.ownerId !== ownerId) return null;

		return idea;
	}
});

export const listIdeaMessages = query({
	args: {
		ideaId: v.id('ideas')
	},
	handler: async (ctx, args) => {
		const ownerId = await getOwnerId(ctx);
		if (!ownerId) return [];

		const idea = await ctx.db.get(args.ideaId);
		if (!idea || idea.ownerId !== ownerId) return [];

		return await ctx.db
			.query('ideaChatMessages')
			.withIndex('by_ideaId_and_sequence', (q) => q.eq('ideaId', args.ideaId))
			.order('asc')
			.take(200);
	}
});

export const createIdeaWithInitialMessage = mutation({
	args: {
		text: v.string(),
		modelId: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const ownerId = await requireOwnerId(ctx);
		const text = args.text.trim();

		if (!text) {
			throw new Error('Idea message is required');
		}

		const now = Date.now();
		const title = createTitle(text);
		const ideaId = await ctx.db.insert('ideas', {
			ownerId,
			title,
			prompt: text,
			status: 'exploring',
			createdAt: now,
			updatedAt: now
		});
		const messageId = `${ideaId}:initial-user`;
		const message = {
			id: messageId,
			role: 'user' as const,
			parts: [{ type: 'text' as const, text } satisfies TextPart]
		};

		await ctx.db.insert('ideaChatMessages', {
			ownerId,
			ideaId,
			messageId,
			role: 'user',
			message,
			text,
			modelId: args.modelId,
			sequence: 0,
			createdAt: now,
			updatedAt: now
		});

		return { ideaId };
	}
});

export const saveIdeaMessages = mutation({
	args: {
		ideaId: v.id('ideas'),
		messages: v.array(v.any()),
		modelId: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const ownerId = await requireOwnerId(ctx);
		const idea = await getOwnedIdea(ctx, args.ideaId, ownerId);
		const now = Date.now();

		if (args.messages.length > 200) {
			throw new Error('Too many chat messages');
		}

		for (const [sequence, rawMessage] of args.messages.entries()) {
			const message = assertUIMessage(rawMessage);
			const existing = await ctx.db
				.query('ideaChatMessages')
				.withIndex('by_ideaId_and_messageId', (q) =>
					q.eq('ideaId', args.ideaId).eq('messageId', message.id)
				)
				.unique();
			const row = {
				ownerId,
				ideaId: args.ideaId,
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
				await ctx.db.insert('ideaChatMessages', {
					...row,
					createdAt: now
				});
			}
		}

		await ctx.db.patch(idea._id, {
			updatedAt: now
		});

		return { saved: args.messages.length };
	}
});

export const updateIdeaTitle = mutation({
	args: {
		ideaId: v.id('ideas'),
		title: v.string(),
		modelId: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const ownerId = await requireOwnerId(ctx);
		const idea = await getOwnedIdea(ctx, args.ideaId, ownerId);
		const title = args.title.trim();

		if (!title) {
			throw new Error('Title is required');
		}

		const now = Date.now();
		await ctx.db.patch(idea._id, {
			title: title.length > 80 ? `${title.slice(0, 77)}...` : title,
			titleGeneratedAt: now,
			titleModelId: args.modelId,
			updatedAt: now
		});

		return { title };
	}
});

async function getOwnedIdea(ctx: QueryCtx | MutationCtx, ideaId: Id<'ideas'>, ownerId: string) {
	const idea = await ctx.db.get(ideaId);
	if (!idea || idea.ownerId !== ownerId) {
		throw new Error('Idea not found');
	}

	return idea;
}

async function getOwnerId(ctx: QueryCtx | MutationCtx) {
	const identity = await ctx.auth.getUserIdentity();
	return identity?.tokenIdentifier ?? null;
}

async function requireOwnerId(ctx: MutationCtx) {
	const ownerId = await getOwnerId(ctx);
	if (!ownerId) throw new Error('Authentication required');
	return ownerId;
}

function createTitle(text: string) {
	const firstLine = text.trim().split('\n')[0]?.trim() ?? '';
	if (!firstLine) return 'Untitled idea';
	return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
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

function isRole(value: unknown): value is IdeaChatRole {
	return value === 'system' || value === 'user' || value === 'assistant';
}

function extractText(message: StoredUIMessage) {
	return message.parts
		.filter((part): part is TextPart => part.type === 'text' && typeof part.text === 'string')
		.map((part) => part.text)
		.join('\n')
		.trim();
}
