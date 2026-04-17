import { isFeatureEnabled } from '$lib/feature-flags';
import { redirect } from '@sveltejs/kit';

export const load = () => {
	if (!isFeatureEnabled('workspace')) {
		throw redirect(307, '/dashboard');
	}
};
