import type { UIMessage } from 'ai'
import {
	normalizeStructuredPatch,
	STRUCTURED_IDEA_TOOL_NAME,
	updateIdeaStructuredInputSchema,
	type UpdateIdeaStructuredInput
} from '$lib/structured-idea-tool'

export type ToolStepPhase = 'running' | 'done' | 'error' | 'denied'

export type ToolStepView = {
	id: string
	toolName: string
	title: string
	phase: ToolStepPhase
	summary: string
	detailJson: string
	errorText?: string
}

export type AssistantSegment =
	| { kind: 'text'; text: string }
	| { kind: 'tools'; tools: ToolStepView[] }

const STRUCTURED_FIELD_LABELS: Partial<Record<keyof UpdateIdeaStructuredInput, string>> = {
	oneLiner: 'One-liner',
	problem: 'Problem',
	audience: 'Audience',
	status: 'Status',
	source: 'Source',
	score: 'Score'
}

const STATUS_LABEL: Record<string, string> = {
	inbox: 'Inbox',
	exploring: 'Exploring',
	prdReady: 'PRD ready',
	archived: 'Archived'
}

const WORKSPACE_TOOL_TITLES: Record<string, string> = {
	listThreadArtifacts: 'List thread artifacts',
	readThreadArtifact: 'Read thread artifact',
	listProjectArtifacts: 'List project artifacts',
	importProjectArtifactToThread: 'Import project artifact',
	createIdeaArtifact: 'Create idea artifact',
	createPrdArtifact: 'Create PRD artifact',
	proposeArtifactEdit: 'Propose artifact edit'
}

const WORKSPACE_RUNNING_SUMMARIES: Record<string, string> = {
	listThreadArtifacts: 'Checking thread artifacts…',
	readThreadArtifact: 'Reading artifact…',
	listProjectArtifacts: 'Checking project artifacts…',
	importProjectArtifactToThread: 'Importing artifact…',
	createIdeaArtifact: 'Creating idea artifact…',
	createPrdArtifact: 'Creating PRD artifact…',
	proposeArtifactEdit: 'Creating draft change…'
}

function toolTitleForName(toolName: string): string {
	if (toolName === STRUCTURED_IDEA_TOOL_NAME) return 'Update idea outline'
	if (WORKSPACE_TOOL_TITLES[toolName]) return WORKSPACE_TOOL_TITLES[toolName]
	return toolName
		.replace(/([A-Z])/g, ' $1')
		.replace(/^./, (s) => s.toUpperCase())
		.trim()
}

function summarizeStructuredOutput(output: unknown): { summary: string; detailJson: string } {
	const parsed = updateIdeaStructuredInputSchema.safeParse(output)
	const normalized = parsed.success ? normalizeStructuredPatch(parsed.data) : null
	const detailJson = JSON.stringify(normalized ?? output, null, 2)

	if (!normalized || Object.keys(normalized).length === 0) {
		return { summary: 'No fields changed.', detailJson }
	}

	const touched: string[] = []
	for (const key of Object.keys(normalized) as (keyof UpdateIdeaStructuredInput)[]) {
		const val = normalized[key]
		if (val === undefined) continue
		if (key === 'status' && typeof val === 'string') {
			touched.push(STATUS_LABEL[val] ?? val)
			continue
		}
		const label = STRUCTURED_FIELD_LABELS[key]
		if (label) touched.push(label)
	}

	if (touched.length === 0) {
		return { summary: 'Outline updated.', detailJson }
	}
	return { summary: `Updated ${touched.join(', ')}`, detailJson }
}

function phaseFromState(state: string | undefined): ToolStepPhase {
	switch (state) {
		case 'output-available':
			return 'done'
		case 'output-error':
			return 'error'
		case 'output-denied':
			return 'denied'
		default:
			return 'running'
	}
}

function parseToolName(part: Record<string, unknown>): string | null {
	const type = part.type
	if (type === 'dynamic-tool' && typeof part.toolName === 'string') {
		return part.toolName.length ? part.toolName : null
	}
	if (typeof type === 'string' && type.startsWith('tool-')) {
		const name = type.slice('tool-'.length)
		return name.length ? name : null
	}
	return null
}

function summarizeTool(
	toolName: string,
	part: Record<string, unknown>,
	phase: ToolStepPhase
): { summary: string; detailJson: string; errorText?: string } {
	if (phase === 'error' && typeof part.errorText === 'string') {
		return {
			summary: 'Something went wrong.',
			detailJson: JSON.stringify({ input: part.input, errorText: part.errorText }, null, 2),
			errorText: part.errorText
		}
	}
	if (phase === 'denied') {
		const reason =
			part.approval && typeof part.approval === 'object' && part.approval !== null
				? (part.approval as { reason?: string }).reason
				: undefined
		return {
			summary: reason ? `Not applied: ${reason}` : 'Update was not applied.',
			detailJson: JSON.stringify(part, null, 2)
		}
	}
	if (toolName === STRUCTURED_IDEA_TOOL_NAME) {
		if (phase === 'running') {
			const detailJson = JSON.stringify(
				{ input: part.input !== undefined ? part.input : {} },
				null,
				2
			)
			return { summary: 'Updating outline…', detailJson }
		}
		return summarizeStructuredOutput(part.output)
	}
	if (WORKSPACE_TOOL_TITLES[toolName]) {
		if (phase === 'running') {
			return {
				summary: WORKSPACE_RUNNING_SUMMARIES[toolName] ?? 'Running…',
				detailJson: JSON.stringify({ input: part.input }, null, 2)
			}
		}
		return summarizeWorkspaceTool(toolName, part.output)
	}
	if (phase === 'running') {
		return {
			summary: 'Running…',
			detailJson: JSON.stringify({ input: part.input }, null, 2)
		}
	}
	return {
		summary: 'Finished.',
		detailJson: JSON.stringify(part.output ?? {}, null, 2)
	}
}

function summarizeWorkspaceTool(
	toolName: string,
	output: unknown
): { summary: string; detailJson: string } {
	const detailJson = JSON.stringify(output ?? {}, null, 2)
	const out = output && typeof output === 'object' ? (output as Record<string, unknown>) : {}
	const title = typeof out.title === 'string' ? out.title : ''
	const artifactTitle = typeof out.artifactTitle === 'string' ? out.artifactTitle : ''
	const artifacts = Array.isArray(out.artifacts) ? out.artifacts : null

	switch (toolName) {
		case 'listThreadArtifacts':
		case 'listProjectArtifacts':
			return {
				summary: `Found ${artifacts?.length ?? 0} artifact${artifacts?.length === 1 ? '' : 's'}.`,
				detailJson
			}
		case 'readThreadArtifact':
			return { summary: title ? `Read ${title}.` : 'Read artifact.', detailJson }
		case 'importProjectArtifactToThread':
			return { summary: title ? `Imported ${title}.` : 'Imported artifact.', detailJson }
		case 'createIdeaArtifact':
			return { summary: title ? `Created idea: ${title}` : 'Created idea artifact.', detailJson }
		case 'createPrdArtifact':
			return { summary: title ? `Created PRD: ${title}` : 'Created PRD artifact.', detailJson }
		case 'proposeArtifactEdit':
			return {
				summary: artifactTitle ? `Drafted edits for ${artifactTitle}.` : 'Created draft change.',
				detailJson
			}
		default:
			return { summary: 'Finished.', detailJson }
	}
}

export function toolPartToView(part: unknown): ToolStepView | null {
	if (!part || typeof part !== 'object') return null
	const p = part as Record<string, unknown>
	const toolName = parseToolName(p)
	if (!toolName) return null

	const state = typeof p.state === 'string' ? p.state : undefined
	const phase = phaseFromState(state)
	const toolCallId = typeof p.toolCallId === 'string' ? p.toolCallId : `tool-${toolName}`
	const title = toolTitleForName(toolName)
	const { summary, detailJson, errorText } = summarizeTool(toolName, p, phase)

	return {
		id: toolCallId,
		toolName,
		title,
		phase,
		summary,
		detailJson,
		errorText
	}
}

function isToolLikePart(part: { type?: unknown }): boolean {
	const t = part.type
	if (typeof t !== 'string') return false
	return t.startsWith('tool-') || t === 'dynamic-tool'
}

function flushTextBuffer(buf: string[]): string | null {
	const text = buf.join('').trim()
	buf.length = 0
	return text.length ? text : null
}

/** Ordered segments: merged text runs, grouped consecutive tool invocations. */
export function buildAssistantSegments(message: UIMessage): AssistantSegment[] {
	if (message.role !== 'assistant') return []

	const out: AssistantSegment[] = []
	const textBuf: string[] = []

	const pushText = (text: string) => {
		out.push({ kind: 'text', text })
	}

	const appendTool = (step: ToolStepView) => {
		const last = out[out.length - 1]
		if (last?.kind === 'tools') {
			last.tools.push(step)
		} else {
			out.push({ kind: 'tools', tools: [step] })
		}
	}

	for (const part of message.parts) {
		if (!part || typeof part !== 'object') continue
		const typed = part as { type?: string; text?: string }

		if (typed.type === 'text' && typeof typed.text === 'string') {
			textBuf.push(typed.text)
			continue
		}

		if (isToolLikePart(typed)) {
			const flushed = flushTextBuffer(textBuf)
			if (flushed) pushText(flushed)
			const view = toolPartToView(part)
			if (view) appendTool(view)
			continue
		}
	}

	const tail = flushTextBuffer(textBuf)
	if (tail) pushText(tail)

	return out
}

export function assistantSegmentsHaveContent(segments: AssistantSegment[]): boolean {
	for (const seg of segments) {
		if (seg.kind === 'text' && seg.text.trim()) return true
		if (seg.kind === 'tools' && seg.tools.length > 0) return true
	}
	return false
}
