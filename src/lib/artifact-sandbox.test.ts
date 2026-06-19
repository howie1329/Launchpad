import { describe, expect, it } from 'vitest';
import {
	ARTIFACT_SANDBOX_ERROR,
	ARTIFACT_SANDBOX_READY,
	ARTIFACT_SANDBOX_RESIZE,
	buildArtifactSandboxDocument
} from './artifact-sandbox';

describe('buildArtifactSandboxDocument', () => {
	it('wraps HTML fragments with CSP and bootstrap script', () => {
		const doc = buildArtifactSandboxDocument('<h1>Hello</h1>', 'html');
		expect(doc).toContain('<h1>Hello</h1>');
		expect(doc).toContain('Content-Security-Policy');
		expect(doc).toContain(ARTIFACT_SANDBOX_READY);
		expect(doc).toContain(ARTIFACT_SANDBOX_RESIZE);
		expect(doc).toContain(ARTIFACT_SANDBOX_ERROR);
	});

	it('wraps SVG source in a centered shell', () => {
		const doc = buildArtifactSandboxDocument(
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>',
			'svg'
		);
		expect(doc).toContain('<svg');
		expect(doc).not.toContain('script-src');
	});

	it('injects bootstrap into full HTML documents', () => {
		const doc = buildArtifactSandboxDocument(
			'<!DOCTYPE html><html><body><p>Full</p></body></html>',
			'html'
		);
		expect(doc).toContain('<p>Full</p>');
		expect(doc).toContain(ARTIFACT_SANDBOX_READY);
	});
});
