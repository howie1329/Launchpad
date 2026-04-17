import { makeFunctionReference } from 'convex/server';

export type SavedIdea = {
	_id: string;
	_creationTime: number;
	ownerId: string;
	title: string;
	prompt: string;
	createdAt: number;
	updatedAt: number;
};

export const listIdeasQuery = makeFunctionReference<'query', Record<string, never>, SavedIdea[]>(
	'ideas:listIdeas'
);
