import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { workspaceTabEntry } from './workspaceTabValidators';

const chatThreadScopeType = v.union(v.literal('general'), v.literal('project'));
const chatMessageRole = v.union(v.literal('system'), v.literal('user'), v.literal('assistant'));
const artifactContentFormat = v.literal('markdown');
const artifactMetadata = v.record(v.string(), v.any());
const threadArtifactLinkReason = v.union(
	v.literal('created'),
	v.literal('referenced'),
	v.literal('imported')
);
const artifactVersionActor = v.union(v.literal('user'), v.literal('ai'));
const artifactVersionSource = v.union(v.literal('editor'), v.literal('chat'));
const memorySyncStatus = v.union(v.literal('synced'), v.literal('blocked'), v.literal('failed'));
const aiUsageSourceKind = v.union(v.literal('chatThread'), v.literal('externalContextImportDraft'));
const notificationType = v.union(
	v.literal('external_context_import'),
	v.literal('ai_chat_activity')
);
const notificationState = v.union(
	v.literal('activity'),
	v.literal('success'),
	v.literal('failed'),
	v.literal('in_progress')
);
const notificationStatus = v.union(
	v.literal('unread'),
	v.literal('read'),
	v.literal('dismissed'),
	v.literal('deleted')
);
const notificationTargetKind = v.union(
	v.literal('externalContextImportDraft'),
	v.literal('chatThread'),
	v.literal('artifact'),
	v.literal('project')
);
const notificationMetadata = v.record(v.string(), v.any());
const externalContextImportDraftStatus = v.union(
	v.literal('pending'),
	v.literal('processing'),
	v.literal('ready'),
	v.literal('failed'),
	v.literal('created'),
	v.literal('abandoned')
);
const externalContextImportSourceKind = v.literal('external_ai_context');
const externalContextImportSourceToolHint = v.union(
	v.literal('chatgpt'),
	v.literal('claude'),
	v.literal('other'),
	v.literal('unknown')
);

export default defineSchema({
	...authTables,
	workspaceTabStrip: defineTable({
		ownerId: v.string(),
		tabs: v.array(workspaceTabEntry),
		activeTabId: v.string(),
		createdAt: v.number(),
		updatedAt: v.number()
	}).index('by_ownerId', ['ownerId']),
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
		threadId: v.optional(v.id('chatThreads')),
		sourceKind: v.optional(aiUsageSourceKind),
		sourceId: v.optional(v.string()),
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
	notifications: defineTable({
		ownerId: v.string(),
		type: notificationType,
		state: notificationState,
		status: notificationStatus,
		title: v.string(),
		body: v.optional(v.string()),
		targetKind: notificationTargetKind,
		targetId: v.string(),
		metadata: v.optional(notificationMetadata),
		createdAt: v.number(),
		updatedAt: v.number(),
		readAt: v.optional(v.number()),
		dismissedAt: v.optional(v.number()),
		deletedAt: v.optional(v.number())
	})
		.index('by_ownerId_and_createdAt', ['ownerId', 'createdAt'])
		.index('by_ownerId_and_status_and_createdAt', ['ownerId', 'status', 'createdAt'])
		.index('by_ownerId_and_targetKind_and_targetId', ['ownerId', 'targetKind', 'targetId']),
	externalContextImportDrafts: defineTable({
		ownerId: v.string(),
		sourceMarkdown: v.string(),
		status: externalContextImportDraftStatus,
		sourceKind: externalContextImportSourceKind,
		sourceToolHint: externalContextImportSourceToolHint,
		generatedProjectName: v.optional(v.string()),
		generatedProjectSummary: v.optional(v.string()),
		generatedProjectBriefMarkdown: v.optional(v.string()),
		errorMessage: v.optional(v.string()),
		createdProjectId: v.optional(v.id('projects')),
		modelUsed: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
		completedAt: v.optional(v.number()),
		projectCreatedAt: v.optional(v.number())
	})
		.index('by_ownerId_and_updatedAt', ['ownerId', 'updatedAt'])
		.index('by_ownerId_and_status_and_updatedAt', ['ownerId', 'status', 'updatedAt']),
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
		/** Opaque Composio tool-router session scoped to this workspace thread. */
		composioSessionId: v.optional(v.string()),
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
		.index('by_ownerId_and_type_and_updatedAt', ['ownerId', 'type', 'updatedAt'])
		.searchIndex('search_title', { searchField: 'title', filterFields: ['ownerId'] })
		.searchIndex('search_type', { searchField: 'type', filterFields: ['ownerId'] })
		.searchIndex('search_contentMarkdown', {
			searchField: 'contentMarkdown',
			filterFields: ['ownerId']
		}),
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
	artifactVersions: defineTable({
		ownerId: v.string(),
		artifactId: v.id('artifacts'),
		versionNumber: v.number(),
		title: v.string(),
		contentMarkdown: v.string(),
		actor: artifactVersionActor,
		source: artifactVersionSource,
		summary: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number()
	})
		.index('by_artifactId_and_versionNumber', ['artifactId', 'versionNumber'])
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
