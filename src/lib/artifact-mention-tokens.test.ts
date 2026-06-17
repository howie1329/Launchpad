import { describe, expect, it } from 'vitest';

import {
	buildOutgoingUserMessageWithTokens,
	formatArtifactMentionToken,
	parseArtifactMentionIds
} from './artifact-mention-tokens';

describe('artifact mention tokens', () => {
	it('parses valid artifact mentions in first-seen order', () => {
		expect(parseArtifactMentionIds('Use @artifact:alpha and @artifact:beta.')).toEqual([
			'alpha',
			'beta.'
		]);
	});

	it('deduplicates repeated artifact ids', () => {
		expect(parseArtifactMentionIds('@artifact:one @artifact:two @artifact:one')).toEqual([
			'one',
			'two'
		]);
	});

	it('returns no ids when artifact mentions are absent', () => {
		expect(parseArtifactMentionIds('plain workspace message')).toEqual([]);
	});

	it('formats and appends outgoing artifact tokens', () => {
		expect(formatArtifactMentionToken('artifact-123')).toBe('@artifact:artifact-123');
		expect(buildOutgoingUserMessageWithTokens('Please use these', ['a', 'b'])).toBe(
			'Please use these\n\n@artifact:a\n@artifact:b'
		);
	});
});
