import { AI_GATEWAY_API_KEY } from '$env/static/private'
import { PUBLIC_CONVEX_URL } from '$env/static/public'
import { getThreadQuery } from '$lib/chat'
import {
	createArtifactDraftChangeMutation,
	createArtifactMutation,
	linkArtifactToThreadMutation,
	listProjectArtifactsQuery,
	listThreadArtifactsQuery,
	type SavedArtifact
} from '$lib/artifacts'
import { isIdeaAiModelId } from '$lib/idea-ai-models'
import { createProjectFromThreadMutation, getProjectQuery } from '$lib/projects'
import type { RequestHandler } from '@sveltejs/kit'
import { json } from '@sveltejs/kit'
import { ConvexHttpClient } from 'convex/browser'
import {
	createAgentUIStreamResponse,
	createGateway,
	safeValidateUIMessages,
	stepCountIs,
	tool,
	ToolLoopAgent
} from 'ai'
import type { Id } from '../../../../convex/_generated/dataModel'
import { z } from 'zod'

const gateway = createGateway({
	apiKey: AI_GATEWAY_API_KEY
})

type WorkspaceProject = {
	_id: Id<'projects'>
	name: string
	summary?: string
}

const baseInstructions = `You are Launchpad's workspace assistant. Help builders turn rough pain points, customer notes, and project ideas into scoped software work.

Be concise, practical, and collaborative. Ask sharp questions when context is missing. Help clarify the problem, target user, MVP scope, risks, non-goals, and next useful step.

You have tools for durable workspace memory:
- Create new idea and PRD artifacts only after the user explicitly asks or confirms. If you think an artifact would help, suggest it first.
- New artifacts save directly and are linked to the active thread.
- Create a project from the active chat only after the user explicitly asks or confirms. This promotes the active thread into the new project and moves thread-linked artifacts into that project.
- Never overwrite existing artifacts. When asked to revise an existing artifact, use proposeArtifactEdit so the user can apply or discard the draft.
- Read or import project artifacts only when the user asks or clearly references project memory.
- Only propose edits for artifacts already linked to this thread.
- Future artifacts created after project promotion belong to that project automatically through the active thread.
- PRDs are saved as markdown artifacts only. Do not mention legacy PRD records.`

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json()
		const threadId = typeof body.threadId === 'string' ? body.threadId : ''

		if (!threadId) {
			return json({ error: 'Thread id is required' }, { status: 400 })
		}

		if (!isIdeaAiModelId(body.modelId)) {
			return json({ error: 'Unsupported model' }, { status: 400 })
		}

		const token = bearerToken(request.headers.get('authorization'))
		if (!token) {
			return json({ error: 'Authentication is required' }, { status: 401 })
		}

		const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL)
		convex.setAuth(token)

		const thread = await convex.query(getThreadQuery, {
			threadId: threadId as Id<'chatThreads'>
		})

		if (!thread) {
			return json({ error: 'Thread not found' }, { status: 404 })
		}

		const project =
			thread.scopeType === 'project' && thread.projectId
				? await convex.query(getProjectQuery, { projectId: thread.projectId })
				: null
		const tools = workspaceTools({
			convex,
			threadId: thread._id,
			project: project as WorkspaceProject | null
		})
		const validatedMessages = await safeValidateUIMessages({
			messages: body.messages
		})

		if (!validatedMessages.success) {
			return json({ error: 'Invalid chat messages' }, { status: 400 })
		}

		const agent = new ToolLoopAgent({
			model: gateway(body.modelId),
			instructions: workspaceInstructions(project),
			tools,
			stopWhen: stepCountIs(8)
		})

		return await createAgentUIStreamResponse({
			agent,
			uiMessages: validatedMessages.data
		})
	} catch (error) {
		console.error(error)
		return json({ error: 'Error generating workspace chat response' }, { status: 500 })
	}
}

function bearerToken(authorization: string | null) {
	if (!authorization?.startsWith('Bearer ')) return ''
	return authorization.slice('Bearer '.length).trim()
}

function workspaceInstructions(project: WorkspaceProject | null) {
	if (!project) return baseInstructions

	const summary = project.summary?.trim()
	const projectContext = summary
		? `Current project: ${project.name}\nProject summary: ${summary}`
		: `Current project: ${project.name}`

	return `${baseInstructions}

${projectContext}`
}

function workspaceTools({
	convex,
	threadId,
	project
}: {
	convex: ConvexHttpClient
	threadId: Id<'chatThreads'>
	project: WorkspaceProject | null
}) {
	const artifactIdSchema = z.object({
		artifactId: z.string().describe('The artifact id.')
	})

	return {
		listThreadArtifacts: tool({
			description: 'List artifacts already linked to the active thread.',
			inputSchema: z.object({}),
			execute: async () => {
				const rows = await convex.query(listThreadArtifactsQuery, { threadId })

				return {
					artifacts: rows.map(({ link, artifact }) => artifactSummary(artifact, link.reason))
				}
			}
		}),
		readThreadArtifact: tool({
			description: 'Read the full markdown for an artifact already linked to the active thread.',
			inputSchema: artifactIdSchema,
			execute: async ({ artifactId }) => {
				const { artifact, reason } = await getThreadArtifact(convex, threadId, artifactId)

				return {
					...artifactSummary(artifact, reason),
					contentMarkdown: artifact.contentMarkdown
				}
			}
		}),
		listProjectArtifacts: tool({
			description:
				'List project artifacts when the user asks to find or import project memory. Only works in project chats.',
			inputSchema: z.object({}),
			execute: async () => {
				if (!project) {
					throw new Error('Project artifacts are only available in project chats.')
				}

				const artifacts = await convex.query(listProjectArtifactsQuery, { projectId: project._id })

				return {
					artifacts: artifacts.map((artifact) => artifactSummary(artifact))
				}
			}
		}),
		importProjectArtifactToThread: tool({
			description:
				'Import a project artifact into the active thread context after the user asks for it.',
			inputSchema: artifactIdSchema,
			execute: async ({ artifactId }) => {
				if (!project) {
					throw new Error('Project artifacts are only available in project chats.')
				}

				const artifact = await getProjectArtifact(convex, project._id, artifactId)

				await convex.mutation(linkArtifactToThreadMutation, {
					threadId,
					artifactId: artifact._id,
					reason: 'imported'
				})

				return artifactSummary(artifact, 'imported')
			}
		}),
		createIdeaArtifact: tool({
			description:
				'Create a loose idea artifact linked to the active thread. Use only after the user asks or confirms.',
			inputSchema: z.object({
				title: z.string().min(1),
				contentMarkdown: z.string().min(1)
			}),
			execute: async ({ title, contentMarkdown }) => {
				const result = await convex.mutation(createArtifactMutation, {
					type: 'idea',
					title,
					contentMarkdown,
					sourceThreadId: threadId,
					metadata: { source: 'workspace-chat-tool' }
				})

				return {
					artifactId: result.artifactId,
					type: 'idea',
					title,
					summary: 'Created idea artifact.'
				}
			}
		}),
		createPrdArtifact: tool({
			description:
				'Create a PRD artifact linked to the active thread. Use only after the user asks or confirms.',
			inputSchema: z.object({
				title: z.string().min(1),
				problem: z.string().min(1),
				targetUser: z.string().min(1),
				goals: z.array(z.string()).default([]),
				mvpScope: z.array(z.string()).default([]),
				outOfScope: z.array(z.string()).default([]),
				testScenarios: z.array(z.string()).default([]),
				researchPlan: z.string().default('')
			}),
			execute: async (input) => {
				const contentMarkdown = formatPrdMarkdown(input)
				const result = await convex.mutation(createArtifactMutation, {
					type: 'prd',
					title: input.title,
					contentMarkdown,
					sourceThreadId: threadId,
					metadata: { source: 'workspace-chat-tool' }
				})

				return {
					artifactId: result.artifactId,
					type: 'prd',
					title: input.title,
					summary: 'Created PRD artifact.',
					contentMarkdown
				}
			}
		}),
		createProjectFromThread: tool({
			description:
				'Create a project from the active chat after the user asks or confirms. Promotes this thread and assigns its linked artifacts to the new project.',
			inputSchema: z.object({
				name: z.string().min(1),
				summary: z.string().optional()
			}),
			execute: async ({ name, summary }) => {
				if (project) {
					throw new Error('This thread already belongs to a project.')
				}

				const cleanName = name.trim()
				const cleanSummary = summary?.trim()
				const result = await convex.mutation(createProjectFromThreadMutation, {
					threadId,
					name: cleanName,
					...(cleanSummary ? { summary: cleanSummary } : {})
				})

				return {
					projectId: result.projectId,
					name: cleanName,
					...(cleanSummary ? { summary: cleanSummary } : {}),
					linkedArtifactCount: result.linkedArtifactCount
				}
			}
		}),
		proposeArtifactEdit: tool({
			description:
				'Create a pending draft change for a thread-linked artifact. Never use this for artifacts outside the active thread.',
			inputSchema: z.object({
				artifactId: z.string(),
				proposedTitle: z.string().min(1),
				proposedContentMarkdown: z.string().min(1),
				summary: z.string().optional()
			}),
			execute: async ({ artifactId, proposedTitle, proposedContentMarkdown, summary }) => {
				const { artifact } = await getThreadArtifact(convex, threadId, artifactId)
				const result = await convex.mutation(createArtifactDraftChangeMutation, {
					artifactId: artifact._id,
					threadId,
					proposedTitle,
					proposedContentMarkdown,
					...(summary?.trim() ? { summary: summary.trim() } : {})
				})

				return {
					draftChangeId: result.draftChangeId,
					artifactId: artifact._id,
					artifactTitle: artifact.title,
					proposedTitle,
					summary: summary?.trim() || 'Created draft change.'
				}
			}
		})
	}
}

function artifactSummary(artifact: SavedArtifact, reason?: string) {
	return {
		artifactId: artifact._id,
		type: artifact.type,
		title: artifact.title,
		reason,
		preview: previewMarkdown(artifact.contentMarkdown),
		updatedAt: artifact.updatedAt
	}
}

async function getThreadArtifact(
	convex: ConvexHttpClient,
	threadId: Id<'chatThreads'>,
	artifactId: string
) {
	const rows = await convex.query(listThreadArtifactsQuery, { threadId })
	const row = rows.find((item) => item.artifact._id === artifactId)

	if (!row) {
		throw new Error('Artifact is not linked to this thread.')
	}

	return {
		artifact: row.artifact,
		reason: row.link.reason
	}
}

async function getProjectArtifact(
	convex: ConvexHttpClient,
	projectId: Id<'projects'>,
	artifactId: string
) {
	const artifacts = await convex.query(listProjectArtifactsQuery, { projectId })
	const artifact = artifacts.find((item) => item._id === artifactId)

	if (!artifact) {
		throw new Error('Artifact is not linked to this project.')
	}

	return artifact
}

function previewMarkdown(markdown: string) {
	const firstLine = markdown
		.split('\n')
		.map((line) => line.trim())
		.find(Boolean)

	if (!firstLine) return 'No content yet.'
	return firstLine.length > 140 ? `${firstLine.slice(0, 137)}...` : firstLine
}

function formatPrdMarkdown(input: {
	title: string
	problem: string
	targetUser: string
	goals: string[]
	mvpScope: string[]
	outOfScope: string[]
	testScenarios: string[]
	researchPlan: string
}) {
	return [
		`# ${input.title}`,
		'',
		'## Problem',
		input.problem,
		'',
		'## Target user',
		input.targetUser,
		'',
		'## Goals',
		formatList(input.goals),
		'',
		'## MVP scope',
		formatList(input.mvpScope),
		'',
		'## Out of scope',
		formatList(input.outOfScope),
		'',
		'## Test scenarios',
		formatList(input.testScenarios),
		'',
		'## Research plan',
		input.researchPlan.trim() || 'No research plan yet.'
	]
		.join('\n')
		.trim()
}

function formatList(items: string[]) {
	const cleanItems = items.map((item) => item.trim()).filter(Boolean)
	if (cleanItems.length === 0) return '- Not specified yet.'
	return cleanItems.map((item) => `- ${item}`).join('\n')
}
