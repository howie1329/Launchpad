import { describe, expect, it } from 'vitest';

import {
	formatThreadTitleForDisplay,
	normalizeGeneratedThreadTitle,
	PLACEHOLDER_THREAD_TITLE
} from './thread-title';

describe('thread title helpers', () => {
	it('normalizes generated titles by trimming quotes and whitespace', () => {
		expect(normalizeGeneratedThreadTitle('  "launch checklist"  ')).toBe('launch checklist');
		expect(normalizeGeneratedThreadTitle('first line\nsecond line')).toBe('first line second line');
	});

	it('rejects empty generated titles', () => {
		expect(normalizeGeneratedThreadTitle('   ')).toBe('');
		expect(normalizeGeneratedThreadTitle('""')).toBe('');
	});

	it('caps long generated titles at 100 characters', () => {
		const normalized = normalizeGeneratedThreadTitle('a'.repeat(120));

		expect(normalized).toHaveLength(98);
		expect(normalized.endsWith('…')).toBe(true);
	});

	it('formats display titles with a placeholder for blank input', () => {
		expect(formatThreadTitleForDisplay(' launch plan')).toBe('Launch plan');
		expect(formatThreadTitleForDisplay('   ')).toBe(PLACEHOLDER_THREAD_TITLE);
	});
});
