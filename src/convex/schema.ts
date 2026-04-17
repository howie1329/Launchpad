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

const ideaStatus = v.union(
	v.literal('inbox'),
	v.literal('exploring'),
	v.literal('prdReady'),
	v.literal('archived')
);

const ideaSource = v.object({
	type: v.union(
		v.literal('ownPain'),
		v.literal('tweet'),
		v.literal('clientRequest'),
		v.literal('research'),
		v.literal('other')
	),
	label: v.optional(v.string()),
	url: v.optional(v.string())
});

const ideaScore = v.object({
	pain: v.optional(v.number()),
	urgency: v.optional(v.number()),
	monetization: v.optional(v.number()),
	distribution: v.optional(v.number()),
	buildEffort: v.optional(v.number()),
	founderFit: v.optional(v.number()),
	summary: v.optional(v.string()),
	scoredAt: v.optional(v.number())
});

const ideaChatMessageRole = v.union(v.literal('system'), v.literal('user'), v.literal('assistant'));

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
		status: v.optional(ideaStatus),
		oneLiner: v.optional(v.string()),
		problem: v.optional(v.string()),
		audience: v.optional(v.string()),
		source: v.optional(ideaSource),
		score: v.optional(ideaScore),
		createdAt: v.number(),
		updatedAt: v.number()
	})
		.index('by_ownerId_and_updatedAt', ['ownerId', 'updatedAt'])
		.index('by_ownerId_and_status_and_updatedAt', ['ownerId', 'status', 'updatedAt']),
	ideaChatMessages: defineTable({
		ownerId: v.string(),
		ideaId: v.id('ideas'),
		messageId: v.string(),
		role: ideaChatMessageRole,
		message: v.any(),
		text: v.string(),
		modelId: v.optional(v.string()),
		sequence: v.number(),
		createdAt: v.number(),
		updatedAt: v.number()
	})
		.index('by_ideaId_and_sequence', ['ideaId', 'sequence'])
		.index('by_ideaId_and_messageId', ['ideaId', 'messageId'])
		.index('by_ownerId_and_createdAt', ['ownerId', 'createdAt']),
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
