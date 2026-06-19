import { describe, expect, it } from 'vitest';

import { getSafePostAuthRedirect } from './safeRedirect';

describe('getSafePostAuthRedirect', () => {
	it('allows root and workspace-local redirects', () => {
		expect(getSafePostAuthRedirect('/')).toBe('/');
		expect(getSafePostAuthRedirect('/workspace')).toBe('/workspace');
		expect(getSafePostAuthRedirect('/workspace/projects?tab=active')).toBe(
			'/workspace/projects?tab=active'
		);
	});

	it('rejects external and protocol-relative redirects', () => {
		expect(getSafePostAuthRedirect('https://example.com/workspace')).toBe('/workspace');
		expect(getSafePostAuthRedirect('//example.com/workspace')).toBe('/workspace');
		expect(getSafePostAuthRedirect('C:\\workspace')).toBe('/workspace');
	});

	it('rejects non-workspace local paths', () => {
		expect(getSafePostAuthRedirect('/admin')).toBe('/workspace');
		expect(getSafePostAuthRedirect('workspace')).toBe('/workspace');
	});

	it('falls back safely for empty or malformed input', () => {
		expect(getSafePostAuthRedirect(null)).toBe('/');
		expect(getSafePostAuthRedirect('')).toBe('/');
		expect(getSafePostAuthRedirect('%E0%A4%A')).toBe('/workspace');
	});
});
