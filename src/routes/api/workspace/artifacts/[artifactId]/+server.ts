import { PUBLIC_CONVEX_URL } from '$env/static/public'
import { deleteArtifactMutation, getArtifactQuery } from '$lib/artifacts'
import { getArtifactMemorySyncQuery } from '$lib/memory-sync'
import { deleteSupermemoryDocument } from '$lib/server/memory'
import type { RequestHandler } from '@sveltejs/kit'
import { json } from '@sveltejs/kit'
import { ConvexHttpClient } from 'convex/browser'
import type { Id } from '../../../../../convex/_generated/dataModel'

export const DELETE: RequestHandler = async ({ params, request }) => {
	try {
		const artifactId = typeof params.artifactId === 'string' ? params.artifactId : ''
		if (!artifactId) {
			return json({ error: 'Artifact id is required' }, { status: 400 })
		}

		const token = bearerToken(request.headers.get('authorization'))
		if (!token) {
			return json({ error: 'Authentication is required' }, { status: 401 })
		}

		const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL)
		convex.setAuth(token)

		const id = artifactId as Id<'artifacts'>
		const artifact = await convex.query(getArtifactQuery, { artifactId: id })
		if (!artifact) {
			return json({ error: 'Artifact not found' }, { status: 404 })
		}

		const mem = await convex.query(getArtifactMemorySyncQuery, { artifactId: id })
		if (mem?.supermemoryDocumentId) {
			await deleteSupermemoryDocument(mem.supermemoryDocumentId)
		}

		await convex.mutation(deleteArtifactMutation, { artifactId: id })
		return json({ ok: true })
	} catch (error) {
		console.error(error)
		return json({ error: 'Could not delete artifact' }, { status: 500 })
	}
}

function bearerToken(authorization: string | null) {
	if (!authorization?.startsWith('Bearer ')) return ''
	return authorization.slice('Bearer '.length).trim()
}
