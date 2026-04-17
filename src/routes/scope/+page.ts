import { redirect } from '@sveltejs/kit';

export const load = ({ url }: { url: URL }) => {
	const search = url.searchParams.toString();
	const target = search.length > 0 ? `/dashboard/scope?${search}` : '/dashboard/scope';
	throw redirect(307, target);
};
