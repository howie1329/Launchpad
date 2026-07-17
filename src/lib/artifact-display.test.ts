import { describe, expect, it } from 'vitest';

import { artifactSearchPreview } from './artifact-display';

describe('artifact search previews', () => {
	it('removes a leading Markdown heading marker', () => {
		expect(artifactSearchPreview('### Test note\nDetails')).toBe('Test note');
	});

	it('preserves ordinary text and handles empty content', () => {
		expect(artifactSearchPreview('Test note')).toBe('Test note');
		expect(artifactSearchPreview('   ')).toBe('No content yet.');
	});
});
