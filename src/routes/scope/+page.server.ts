import { fail } from '@sveltejs/kit'
import type { Actions } from './$types'

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData()
		const rawIdea = formData.get('idea')
		const idea = typeof rawIdea === 'string' ? rawIdea.trim() : ''

		if (!idea) {
			return fail(400, {
				idea,
				error: 'Describe the MVP idea before generating a scope.'
			})
		}

		return {
			idea,
			success: true,
			message: 'Scope request received. PRD generation comes next.'
		}
	}
} satisfies Actions
