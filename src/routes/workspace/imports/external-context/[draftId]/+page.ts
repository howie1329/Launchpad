import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const draftId = params.draftId?.trim() ?? '';
	if (!draftId) {
		throw error(404, 'Import draft not found');
	}
	return { draftId };
};
