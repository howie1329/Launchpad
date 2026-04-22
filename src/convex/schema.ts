import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

const chatThreadScopeType = v.union(v.literal('general'), v.literal('project'));
const chatMessageRole = v.union(v.literal('system'), v.literal('user'), v.literal('assistant'));
const artifactContentFormat = v.literal('markdown');
const artifactMetadata = v.record(v.string(), v.any());
const threadArtifactLinkReason = v.union(
	v.literal('created'),
	v.literal('referenced'),
	v.literal('imported')
);
const artifactDraftChangeStatus = v.union(
	v.literal('pending'),
	v.literal('applied'),
	v.literal('discarded')
);
const memorySyncStatus = v.union(v.literal('synced'), v.literal('blocked'), v.literal('failed'));

export default defineSchema({
	...authTables,
	userSettings: defineTable({
		ownerId: v.string(),
		timeZone: v.string(),
		dailyAiCapUsd: v.number(),
		aiContextMarkdown: v.optional(v.string()),
		aiBehaviorMarkdown: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number()
	}).index('by_ownerId', ['ownerId']),
	aiUsageEvents: defineTable({
		ownerId: v.string(),
		threadId: v.id('chatThreads'),
		modelId: v.string(),
		dateKey: v.string(),
		inputTokens: v.optional(v.number()),
		outputTokens: v.optional(v.number()),
		reasoningTokens: v.optional(v.number()),
		cachedInputTokens: v.optional(v.number()),
		costUsd: v.number(),
		createdAt: v.number()
	})
		.index('by_ownerId_and_createdAt', ['ownerId', 'createdAt'])
		.index('by_ownerId_and_dateKey_and_createdAt', ['ownerId', 'dateKey', 'createdAt']),
	aiDailyUsage: defineTable({
		ownerId: v.string(),
		dateKey: v.string(),
		inputTokens: v.number(),
		outputTokens: v.number(),
		reasoningTokens: v.number(),
		cachedInputTokens: v.number(),
		costUsd: v.number(),
		createdAt: v.number(),
		updatedAt: v.number()
	}).index('by_ownerId_and_dateKey', ['ownerId', 'dateKey']),
	activityEvents: defineTable({
		ownerId: v.string(),
		eventType: v.string(),
		dateKey: v.string(),
		metadata: v.optional(v.record(v.string(), v.any())),
		createdAt: v.number()
	}).index('by_ownerId_and_createdAt', ['ownerId', 'createdAt']),
	projects: defineTable({
		ownerId: v.string(),
		name: v.string(),
		summary: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number()
	}).index('by_ownerId_and_updatedAt', ['ownerId', 'updatedAt']),
	chatThreads: defineTable({
		ownerId: v.string(),
		title: v.string(),
		scopeType: chatThreadScopeType,
		projectId: v.optional(v.id('projects')),
		/** Set when the LLM has written the sidebar title (one-time). */
		titleGeneratedAt: v.optional(v.number()),
		createdAt: v.number(),
		updatedAt: v.number()
	})
		.index('by_ownerId_and_updatedAt', ['ownerId', 'updatedAt'])
		.index('by_ownerId_and_scopeType_and_updatedAt', ['ownerId', 'scopeType', 'updatedAt'])
		.index('by_projectId_and_updatedAt', ['projectId', 'updatedAt']),
	chatMessages: defineTable({
		ownerId: v.string(),
		threadId: v.id('chatThreads'),
		messageId: v.string(),
		role: chatMessageRole,
		message: v.any(),
		text: v.string(),
		modelId: v.optional(v.string()),
		sequence: v.number(),
		createdAt: v.number(),
		updatedAt: v.number()
	})
		.index('by_threadId_and_sequence', ['threadId', 'sequence'])
		.index('by_threadId_and_messageId', ['threadId', 'messageId'])
		.index('by_ownerId_and_createdAt', ['ownerId', 'createdAt']),
	artifacts: defineTable({
		ownerId: v.string(),
		type: v.string(),
		title: v.string(),
		contentMarkdown: v.string(),
		contentFormat: artifactContentFormat,
		revision: v.optional(v.number()),
		metadata: v.optional(artifactMetadata),
		projectId: v.optional(v.id('projects')),
		sourceThreadId: v.optional(v.id('chatThreads')),
		createdAt: v.number(),
		updatedAt: v.number()
	})
		.index('by_ownerId_and_updatedAt', ['ownerId', 'updatedAt'])
		.index('by_projectId_and_updatedAt', ['projectId', 'updatedAt'])
		.index('by_sourceThreadId_and_updatedAt', ['sourceThreadId', 'updatedAt'])
		.index('by_ownerId_and_type_and_updatedAt', ['ownerId', 'type', 'updatedAt']),
	threadArtifactLinks: defineTable({
		ownerId: v.string(),
		threadId: v.id('chatThreads'),
		artifactId: v.id('artifacts'),
		reason: threadArtifactLinkReason,
		createdAt: v.number(),
		updatedAt: v.number()
	})
		.index('by_threadId_and_updatedAt', ['threadId', 'updatedAt'])
		.index('by_artifactId_and_updatedAt', ['artifactId', 'updatedAt'])
		.index('by_threadId_and_artifactId', ['threadId', 'artifactId']),
	artifactDraftChanges: defineTable({
		ownerId: v.string(),
		artifactId: v.id('artifacts'),
		threadId: v.optional(v.id('chatThreads')),
		proposedTitle: v.string(),
		proposedContentMarkdown: v.string(),
		summary: v.optional(v.string()),
		baseArtifactRevision: v.optional(v.number()),
		baseTitle: v.optional(v.string()),
		baseContentMarkdown: v.optional(v.string()),
		patch: v.optional(v.any()),
		changeSummary: v.optional(v.string()),
		hasTitleChange: v.optional(v.boolean()),
		changedSectionCount: v.optional(v.number()),
		additionCount: v.optional(v.number()),
		deletionCount: v.optional(v.number()),
		staleReason: v.optional(v.string()),
		status: artifactDraftChangeStatus,
		createdAt: v.number(),
		updatedAt: v.number(),
		appliedAt: v.optional(v.number()),
		discardedAt: v.optional(v.number())
	})
		.index('by_artifactId_and_updatedAt', ['artifactId', 'updatedAt'])
		.index('by_artifactId_and_status_and_updatedAt', ['artifactId', 'status', 'updatedAt'])
		.index('by_ownerId_and_updatedAt', ['ownerId', 'updatedAt']),
	memorySyncs: defineTable({
		ownerId: v.string(),
		sourceType: v.literal('artifact'),
		sourceId: v.string(),
		artifactId: v.id('artifacts'),
		projectId: v.optional(v.id('projects')),
		threadId: v.optional(v.id('chatThreads')),
		customId: v.string(),
		containerTag: v.string(),
		supermemoryDocumentId: v.optional(v.string()),
		status: memorySyncStatus,
		lastError: v.optional(v.string()),
		lastSyncedAt: v.optional(v.number()),
		createdAt: v.number(),
		updatedAt: v.number()
	})
		.index('by_sourceType_and_sourceId', ['sourceType', 'sourceId'])
		.index('by_ownerId_and_updatedAt', ['ownerId', 'updatedAt'])
});
