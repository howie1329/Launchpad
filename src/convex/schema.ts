import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

const prdOutput = v.object({
	problemStatement: v.string(),
	targetUser: v.string(),
	mustHaveFeatures: v.array(v.string()),
	outOfScope: v.array(v.string()),
	suggestedStack: v.string(),
	fullMVPPlan: v.string(),
	projectType: v.string()
});

export default defineSchema({
	...authTables,
	prds: defineTable({
		ownerId: v.string(),
		title: v.string(),
		latestVersion: v.number(),
		latestIdea: v.string(),
		latestAppType: v.string(),
		latestProjectType: v.string(),
		latestPreferredStack: v.string(),
		createdAt: v.number(),
		updatedAt: v.number()
	}).index('by_ownerId_and_updatedAt', ['ownerId', 'updatedAt']),
	ideas: defineTable({
		ownerId: v.string(),
		title: v.string(),
		prompt: v.string(),
		createdAt: v.number(),
		updatedAt: v.number()
	}).index('by_ownerId_and_updatedAt', ['ownerId', 'updatedAt']),
	prdGenerations: defineTable({
		prdId: v.id('prds'),
		ownerId: v.string(),
		version: v.number(),
		schemaVersion: v.number(),
		idea: v.string(),
		appType: v.string(),
		projectType: v.string(),
		preferredStack: v.string(),
		output: prdOutput,
		createdAt: v.number()
	})
		.index('by_prdId_and_version', ['prdId', 'version'])
		.index('by_ownerId_and_createdAt', ['ownerId', 'createdAt'])
});
