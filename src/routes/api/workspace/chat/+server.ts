import { AI_GATEWAY_API_KEY } from '$env/static/private'
import { PUBLIC_CONVEX_URL } from '$env/static/public'
import { getThreadQuery } from '$lib/chat'
import { isIdeaAiModelId } from '$lib/idea-ai-models'
import { getProjectQuery } from '$lib/projects'
import type { RequestHandler } from '@sveltejs/kit'
import { json } from '@sveltejs/kit'
import { ConvexHttpClient } from 'convex/browser'
import {
	convertToModelMessages,
	createGateway,
	safeValidateUIMessages,
	streamText,
	type UIMessage
} from 'ai'
import type { Id } from '../../../../convex/_generated/dataModel'

const gateway = createGateway({
	apiKey: AI_GATEWAY_API_KEY
})

const baseSystem = `You are Launchpad's workspace assistant. Help builders turn rough pain points, customer notes, and project ideas into scoped software work.

Be concise, practical, and collaborative. Ask sharp questions when context is missing. Help clarify the problem, target user, MVP scope, risks, non-goals, and next useful step.

Do not claim to save or update artifacts. In this version you only chat.`

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json()
		const threadId = typeof body.threadId === 'string' ? body.threadId : ''
		const validation = await safeValidateUIMessages<UIMessage>({ messages: body.messages })

		if (!threadId) {
			return json({ error: 'Thread id is required' }, { status: 400 })
		}

		if (!isIdeaAiModelId(body.modelId)) {
			return json({ error: 'Unsupported model' }, { status: 400 })
		}

		if (!validation.success) {
			return json({ error: 'Invalid chat messages' }, { status: 400 })
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
		const messages = validation.data
		const result = streamText({
			model: gateway(body.modelId),
			system: workspaceSystemPrompt(project),
			messages: await convertToModelMessages(messages)
		})

		return result.toUIMessageStreamResponse({ originalMessages: messages })
	} catch (error) {
		console.error(error)
		return json({ error: 'Error generating workspace chat response' }, { status: 500 })
	}
}

function bearerToken(authorization: string | null) {
	if (!authorization?.startsWith('Bearer ')) return ''
	return authorization.slice('Bearer '.length).trim()
}

function workspaceSystemPrompt(project: { name: string; summary?: string } | null) {
	if (!project) return baseSystem

	const summary = project.summary?.trim()
	const projectContext = summary
		? `Current project: ${project.name}\nProject summary: ${summary}`
		: `Current project: ${project.name}`

	return `${baseSystem}

${projectContext}`
}
