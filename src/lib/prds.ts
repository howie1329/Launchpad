import { makeFunctionReference } from 'convex/server';

export type PrdOutput = {
	problemStatement: string;
	targetUser: string;
	mustHaveFeatures: string[];
	outOfScope: string[];
	suggestedStack: string;
	fullMVPPlan: string;
	projectType: string;
};

export type SavedPrd = {
	_id: string;
	_creationTime: number;
	ownerId: string;
	title: string;
	latestVersion: number;
	latestIdea: string;
	latestAppType: string;
	latestProjectType: string;
	latestPreferredStack: string;
	createdAt: number;
	updatedAt: number;
};

export type PrdGeneration = {
	_id: string;
	_creationTime: number;
	prdId: string;
	ownerId: string;
	version: number;
	schemaVersion: number;
	idea: string;
	appType: string;
	projectType: string;
	preferredStack: string;
	output: PrdOutput;
	createdAt: number;
};

export type SavePrdArgs = {
	idea: string;
	appType: string;
	projectType: string;
	preferredStack: string;
	output: PrdOutput;
};

export type SaveGenerationArgs = SavePrdArgs & {
	prdId: string;
};

export type SavePrdResult = {
	prdId: string;
	generationId: string;
	version: number;
};

export const listPrdsQuery = makeFunctionReference<
	'query',
	Record<string, never>,
	SavedPrd[]
>('prds:listPrds');

export const getPrdQuery = makeFunctionReference<
	'query',
	{ prdId: string },
	{ prd: SavedPrd; latestGeneration: PrdGeneration | null } | null
>('prds:getPrd');

export const listPrdGenerationsQuery = makeFunctionReference<
	'query',
	{ prdId: string },
	PrdGeneration[]
>('prds:listPrdGenerations');

export const getPrdGenerationQuery = makeFunctionReference<
	'query',
	{ generationId: string },
	PrdGeneration | null
>('prds:getPrdGeneration');

export const saveNewPrdMutation = makeFunctionReference<
	'mutation',
	SavePrdArgs,
	SavePrdResult
>('prds:saveNewPrd');

export const savePrdGenerationMutation = makeFunctionReference<
	'mutation',
	SaveGenerationArgs,
	SavePrdResult
>('prds:savePrdGeneration');
