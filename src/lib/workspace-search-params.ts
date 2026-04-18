import { createSearchParamsSchema } from 'runed/kit'

export const workspaceSearchParamsSchema = createSearchParamsSchema({
	thread: {
		type: 'string',
		default: ''
	},
	context: {
		type: 'string',
		default: ''
	}
})
