/**
 * Sanitize post-login redirect targets to same-origin in-app paths only.
 * Rejects external URLs, protocol-relative URLs, and paths outside `/` and `/workspace/**`.
 */
export function getSafePostAuthRedirect(raw: string | null): string {
	if (raw === null || raw === undefined || raw === '') {
		return '/';
	}

	let decoded: string;
	try {
		decoded = decodeURIComponent(String(raw).trim());
	} catch {
		return '/workspace';
	}

	if (decoded === '/') {
		return '/';
	}

	if (decoded.includes(':\\') || decoded.includes('://') || decoded.startsWith('//')) {
		return '/workspace';
	}

	if (!decoded.startsWith('/')) {
		return '/workspace';
	}

	const pathOnly = decoded.split(/[?#]/)[0] ?? '';

	if (pathOnly === '/') {
		return '/';
	}

	if (pathOnly === '/workspace' || pathOnly.startsWith('/workspace/')) {
		return decoded;
	}

	return '/workspace';
}
