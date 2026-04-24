import { makeFunctionReference } from 'convex/server';
import type { UIMessage } from 'ai';
import type { Id } from '../convex/_generated/dataModel';

export type ChatScopeType = 'general' | 'project';

export type SavedChatThread = {
	_id: Id<'chatThreads'>;
	_creationTime: number;
	ownerId: Id<'users'>;
	title: string;
	scopeType: ChatScopeType;
	projectId?: Id<'projects'>;
	titleGeneratedAt?: number;
	createdAt: number;
	updatedAt: number;
};

export type SavedChatMessage = {
	_id: Id<'chatMessages'>;
	_creationTime: number;
	ownerId: Id<'users'>;
	threadId: Id<'chatThreads'>;
	messageId: string;
	role: UIMessage['role'];
	message: UIMessage;
	text: string;
	modelId?: string;
	sequence: number;
	createdAt: number;
	updatedAt: number;
};

export type CreateThreadArgs = {
	projectId?: Id<'projects'>;
	text: string;
	modelId?: string;
};

export type CreateThreadResult = {
	threadId: Id<'chatThreads'>;
};

export type SaveMessagesArgs = {
	threadId: Id<'chatThreads'>;
	messages: UIMessage[];
	modelId?: string;
};

export type SaveMessagesResult = {
	saved: number;
};

export const createThreadMutation = makeFunctionReference<
	'mutation',
	CreateThreadArgs,
	CreateThreadResult
>('chat:createThread');

export const listThreadsQuery = makeFunctionReference<
	'query',
	{ projectId?: Id<'projects'> },
	SavedChatThread[]
>('chat:listThreads');

export const getThreadQuery = makeFunctionReference<
	'query',
	{ threadId: Id<'chatThreads'> },
	SavedChatThread | null
>('chat:getThread');

export const listMessagesQuery = makeFunctionReference<
	'query',
	{ threadId: Id<'chatThreads'> },
	SavedChatMessage[]
>('chat:listMessages');

export const saveMessagesMutation = makeFunctionReference<
	'mutation',
	SaveMessagesArgs,
	SaveMessagesResult
>('chat:saveMessages');

export type SetThreadGeneratedTitleArgs = {
	threadId: Id<'chatThreads'>;
	title: string;
	titleGeneratedAt: number;
};

export type SetThreadGeneratedTitleResult = {
	updated: boolean;
};

export const setThreadGeneratedTitleMutation = makeFunctionReference<
	'mutation',
	SetThreadGeneratedTitleArgs,
	SetThreadGeneratedTitleResult
>('chat:setThreadGeneratedTitle');

export type ForkThreadFromMessageArgs = {
	threadId: Id<'chatThreads'>;
	messageId: string;
};

export type ForkThreadFromMessageResult = {
	threadId: Id<'chatThreads'>;
};

export const forkThreadFromMessageMutation = makeFunctionReference<
	'mutation',
	ForkThreadFromMessageArgs,
	ForkThreadFromMessageResult
>('chat:forkThreadFromMessage');
