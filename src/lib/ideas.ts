import { makeFunctionReference } from 'convex/server';
import type { UIMessage } from 'ai';
import type { Id } from '../convex/_generated/dataModel';

export type IdeaStatus = 'inbox' | 'exploring' | 'prdReady' | 'archived';

export type IdeaSource = {
	type: 'ownPain' | 'tweet' | 'clientRequest' | 'research' | 'other';
	label?: string;
	url?: string;
};

export type IdeaScore = {
	pain?: number;
	urgency?: number;
	monetization?: number;
	distribution?: number;
	buildEffort?: number;
	founderFit?: number;
	summary?: string;
	scoredAt?: number;
};

export type SavedIdea = {
	_id: string;
	_creationTime: number;
	ownerId: Id<'users'>;
	title: string;
	prompt: string;
	titleGeneratedAt?: number;
	titleModelId?: string;
	status?: IdeaStatus;
	oneLiner?: string;
	problem?: string;
	audience?: string;
	source?: IdeaSource;
	score?: IdeaScore;
	createdAt: number;
	updatedAt: number;
};

export type SavedIdeaChatMessage = {
	_id: string;
	_creationTime: number;
	ownerId: Id<'users'>;
	ideaId: string;
	messageId: string;
	role: UIMessage['role'];
	message: UIMessage;
	text: string;
	modelId?: string;
	sequence: number;
	createdAt: number;
	updatedAt: number;
};

export type CreateIdeaWithInitialMessageArgs = {
	text: string;
	modelId?: string;
};

export type CreateIdeaWithInitialMessageResult = {
	ideaId: string;
};

export type SaveIdeaMessagesArgs = {
	ideaId: string;
	messages: UIMessage[];
	modelId?: string;
};

export type SaveIdeaMessagesResult = {
	saved: number;
};

export type UpdateIdeaTitleArgs = {
	ideaId: string;
	title: string;
	modelId?: string;
};

export type UpdateIdeaTitleResult = {
	title: string;
};

export type UpdateIdeaStructuredArgs = {
	ideaId: string;
	oneLiner?: string;
	problem?: string;
	audience?: string;
	status?: IdeaStatus;
	source?: IdeaSource;
	score?: IdeaScore;
};

export type UpdateIdeaStructuredResult = {
	ok: true;
};

export const listIdeasQuery = makeFunctionReference<'query', Record<string, never>, SavedIdea[]>(
	'ideas:listIdeas'
);

export const getIdeaQuery = makeFunctionReference<
	'query',
	{ ideaId: string },
	SavedIdea | null
>('ideas:getIdea');

export const listIdeaMessagesQuery = makeFunctionReference<
	'query',
	{ ideaId: string },
	SavedIdeaChatMessage[]
>('ideas:listIdeaMessages');

export const createIdeaWithInitialMessageMutation = makeFunctionReference<
	'mutation',
	CreateIdeaWithInitialMessageArgs,
	CreateIdeaWithInitialMessageResult
>('ideas:createIdeaWithInitialMessage');

export const saveIdeaMessagesMutation = makeFunctionReference<
	'mutation',
	SaveIdeaMessagesArgs,
	SaveIdeaMessagesResult
>('ideas:saveIdeaMessages');

export const updateIdeaTitleMutation = makeFunctionReference<
	'mutation',
	UpdateIdeaTitleArgs,
	UpdateIdeaTitleResult
>('ideas:updateIdeaTitle');

export const updateIdeaStructuredMutation = makeFunctionReference<
	'mutation',
	UpdateIdeaStructuredArgs,
	UpdateIdeaStructuredResult
>('ideas:updateIdeaStructured');
