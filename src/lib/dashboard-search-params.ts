import { createSearchParamsSchema } from 'runed/kit';

export const dashboardSearchParamsSchema = createSearchParamsSchema({
	idea: {
		type: 'string',
		default: ''
	},
	prd: {
		type: 'string',
		default: ''
	}
});

export const dashboardIdeasSearchParamsSchema = createSearchParamsSchema({
	idea: {
		type: 'string',
		default: ''
	},
	start: {
		type: 'string',
		default: ''
	}
});

export const dashboardScopeSearchParamsSchema = createSearchParamsSchema({
	prd: {
		type: 'string',
		default: ''
	}
});
