import { makeFunctionReference } from 'convex/server';
import type { UIMessage } from 'ai';

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
	ownerId: string;
	title: string;
	prompt: string;
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
	ownerId: string;
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

export const listIdeasQuery = makeFunctionReference<'query', Record<string, never>, SavedIdea[]>(
	'ideas:listIdeas'
);
