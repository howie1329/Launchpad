import type { Id } from '../../../convex/_generated/dataModel';

export const semanticMemorySourceTypes = [
	'user_preference',
	'project_decision',
	'thread_insight'
] as const;

export const readableMemorySourceTypes = [...semanticMemorySourceTypes, 'artifact'] as const;

export const userPreferenceCategories = [
	'communication',
	'workflow',
	'design_taste',
	'work_context'
] as const;

export const projectDecisionCategories = [
	'target_customer',
	'positioning',
	'scope',
	'constraint',
	'architecture',
	'tradeoff',
	'direction'
] as const;

export const threadInsightCategories = [
	'open_question',
	'exploration_summary',
	'rationale',
	'follow_up'
] as const;

export type SemanticMemorySourceType = (typeof semanticMemorySourceTypes)[number];
export type ReadableMemorySourceType = (typeof readableMemorySourceTypes)[number];
export type UserPreferenceCategory = (typeof userPreferenceCategories)[number];
export type ProjectDecisionCategory = (typeof projectDecisionCategories)[number];
export type ThreadInsightCategory = (typeof threadInsightCategories)[number];
export type MemoryConfidence = 'explicit' | 'high' | 'inferred';
export type MemoryScope = 'user' | 'project';

export type ScopedMemorySummary = {
	documentId: string;
	scope: MemoryScope;
	sourceType: ReadableMemorySourceType | string;
	category: string;
	title?: string;
	summary: string;
	createdAt?: string | number;
	updatedAt?: string | number;
	threadId?: string;
	projectId?: string;
	readOnly?: boolean;
	derivedFromArtifact?: boolean;
};

export type InspectedMemoryDocument = ScopedMemorySummary & {
	content: string;
	metadata: Record<string, unknown>;
	readOnly: boolean;
	derivedFromArtifact: boolean;
};

export function isUserPreferenceCategory(value: string): value is UserPreferenceCategory {
	return (userPreferenceCategories as readonly string[]).includes(value);
}

export function isProjectDecisionCategory(value: string): value is ProjectDecisionCategory {
	return (projectDecisionCategories as readonly string[]).includes(value);
}

export function isThreadInsightCategory(value: string): value is ThreadInsightCategory {
	return (threadInsightCategories as readonly string[]).includes(value);
}

export function isSemanticSourceType(value: string): value is SemanticMemorySourceType {
	return (semanticMemorySourceTypes as readonly string[]).includes(value);
}

export function isReadableMemorySourceType(value: string): value is ReadableMemorySourceType {
	return (readableMemorySourceTypes as readonly string[]).includes(value);
}

export function semanticMemoryCustomId(args: {
	sourceType: SemanticMemorySourceType;
	threadId: Id<'chatThreads'> | string;
}) {
	const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
	return `${args.sourceType}:${String(args.threadId)
		.replace(/[^a-zA-Z0-9_\-:]/g, '_')
		.slice(0, 80)}:${suffix}`;
}
