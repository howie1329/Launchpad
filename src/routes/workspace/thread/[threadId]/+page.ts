import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const threadId = params.threadId?.trim() ?? '';
	if (!threadId) {
		throw error(404, 'Thread not found');
	}
	return { threadId };
};
