import { createSearchParamsSchema } from 'runed/kit'

export const workspaceSearchParamsSchema = createSearchParamsSchema({
	project: {
		type: 'string',
		default: ''
	},
	thread: {
		type: 'string',
		default: ''
	},
	context: {
		type: 'string',
		default: ''
	},
	start: {
		type: 'string',
		default: ''
	}
})
