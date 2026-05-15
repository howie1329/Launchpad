import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const artifactId = params.artifactId?.trim() ?? '';
	if (!artifactId) {
		throw error(404, 'Artifact not found');
	}
	return { artifactId };
};
