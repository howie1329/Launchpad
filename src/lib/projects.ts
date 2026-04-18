import { makeFunctionReference } from 'convex/server';
import type { Id } from '../convex/_generated/dataModel';

export type SavedProject = {
	_id: Id<'projects'>;
	_creationTime: number;
	ownerId: Id<'users'>;
	name: string;
	summary?: string;
	createdAt: number;
	updatedAt: number;
};

export type CreateProjectArgs = {
	name: string;
	summary?: string;
};

export type CreateProjectResult = {
	projectId: Id<'projects'>;
};

export const createProjectMutation = makeFunctionReference<
	'mutation',
	CreateProjectArgs,
	CreateProjectResult
>('projects:createProject');

export const listProjectsQuery = makeFunctionReference<
	'query',
	Record<string, never>,
	SavedProject[]
>('projects:listProjects');

export const getProjectQuery = makeFunctionReference<
	'query',
	{ projectId: Id<'projects'> },
	SavedProject | null
>('projects:getProject');
