import { z } from 'zod'

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

export type IdeaSource = z.infer<typeof ideaSourceSchema>
export type IdeaScore = z.infer<typeof ideaScoreSchema>

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
		}
	}
	if (input.score !== undefined) {
		const sc = input.score
		out.score = {
			...sc,
			...(sc.summary !== undefined ? { summary: trimToUndefined(sc.summary) } : {})
		}
	}
	return out
}
