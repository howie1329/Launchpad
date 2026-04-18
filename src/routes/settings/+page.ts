import { resolve } from '$app/paths';
import { redirect } from '@sveltejs/kit';

export const load = () => {
	throw redirect(307, resolve('/dashboard/settings'));
};
