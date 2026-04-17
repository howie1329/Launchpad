import type { UIMessage } from 'ai'
import { z } from 'zod'
import type { IdeaScore, IdeaSource, IdeaStatus, SavedIdea } from '$lib/ideas'

export const ideaStatusSchema = z.enum(['inbox', 'exploring', 'prdReady', 'archived'])

export const ideaSourceSchema = z.object({
	type: z.enum(['ownPain', 'tweet', 'clientRequest', 'research', 'other']),
	label: z.string().optional(),
	url: z.string().optional()
})

export const ideaScoreSchema = z.object({
	pain: z.number().optional(),
	urgency: z.number().optional(),
	monetization: z.number().optional(),
	distribution: z.number().optional(),
	buildEffort: z.number().optional(),
	founderFit: z.number().optional(),
	summary: z.string().optional(),
	scoredAt: z.number().optional()
})

/** Partial patch for the structured idea snapshot (Convex `ideas` document fields). */
export const updateIdeaStructuredInputSchema = z
	.object({
		oneLiner: z.string().optional(),
		problem: z.string().optional(),
		audience: z.string().optional(),
		status: ideaStatusSchema.optional(),
		source: ideaSourceSchema.optional(),
		score: ideaScoreSchema.optional()
	})
	.strict()

export type UpdateIdeaStructuredInput = z.infer<typeof updateIdeaStructuredInputSchema>

export const STRUCTURED_IDEA_TOOL_NAME = 'updateIdeaStructured' as const

function trimToUndefined(s: string | undefined): string | undefined {
	if (s === undefined) return undefined
	const t = s.trim()
	return t.length ? t : undefined
}

/** Normalize tool / API input before sending to Convex. */
export function normalizeStructuredPatch(input: UpdateIdeaStructuredInput): UpdateIdeaStructuredInput {
	const out: UpdateIdeaStructuredInput = {}
	if (input.oneLiner !== undefined) out.oneLiner = trimToUndefined(input.oneLiner)
	if (input.problem !== undefined) out.problem = trimToUndefined(input.problem)
	if (input.audience !== undefined) out.audience = trimToUndefined(input.audience)
	if (input.status !== undefined) out.status = input.status
	if (input.source !== undefined) {
		const src = input.source
		out.source = {
			type: src.type,
			...(src.label !== undefined ? { label: trimToUndefined(src.label) } : {}),
			...(src.url !== undefined ? { url: trimToUndefined(src.url) } : {})
		} as IdeaSource
	}
	if (input.score !== undefined) {
		const sc = input.score
		out.score = {
			...sc,
			...(sc.summary !== undefined ? { summary: trimToUndefined(sc.summary) } : {})
		} as IdeaScore
	}
	return out
}

export function ideaScoreHasContent(score: IdeaScore | undefined): boolean {
	if (!score) return false
	return (
		score.pain !== undefined ||
		score.urgency !== undefined ||
		score.monetization !== undefined ||
		score.distribution !== undefined ||
		score.buildEffort !== undefined ||
		score.founderFit !== undefined ||
		Boolean(score.summary?.trim()) ||
		score.scoredAt !== undefined
	)
}

export function ideaSourceHasContent(source: IdeaSource | undefined): boolean {
	if (!source) return false
	return Boolean(source.label?.trim() || source.url?.trim() || source.type)
}

/** True when the idea document has any structured fields worth showing in the artifact. */
export function ideaHasArtifactContent(idea: SavedIdea | null | undefined): boolean {
	if (!idea) return false
	return (
		Boolean(idea.oneLiner?.trim()) ||
		Boolean(idea.problem?.trim()) ||
		Boolean(idea.audience?.trim()) ||
		idea.status !== undefined ||
		ideaSourceHasContent(idea.source) ||
		ideaScoreHasContent(idea.score)
	)
}

type ToolPart = {
	type: string
	state?: string
	output?: unknown
}

function isStructuredToolPart(part: unknown): part is ToolPart {
	return (
		typeof part === 'object' &&
		part !== null &&
		'type' in part &&
		(part as ToolPart).type === `tool-${STRUCTURED_IDEA_TOOL_NAME}`
	)
}

/** Reads the latest successful tool output from chat messages (validated). */
export function extractLatestStructuredPatch(messages: UIMessage[]): UpdateIdeaStructuredInput | null {
	for (let i = messages.length - 1; i >= 0; i--) {
		const message = messages[i]
		if (message.role !== 'assistant') continue
		for (let j = message.parts.length - 1; j >= 0; j--) {
			const part = message.parts[j]
			if (!isStructuredToolPart(part)) continue
			if (part.state !== 'output-available' || part.output === undefined) continue
			const parsed = updateIdeaStructuredInputSchema.safeParse(part.output)
			if (!parsed.success) continue
			const keys = Object.keys(parsed.data).length
			if (keys === 0) continue
			return normalizeStructuredPatch(parsed.data)
		}
	}
	return null
}
