import { describe, expect, it } from 'vitest';
import { formatToolActivitySummary, toolPartToView } from './idea-chat-assistant-parts';

function toolPart(overrides: Record<string, unknown>) {
	return {
		type: 'tool-tavilySearch',
		toolCallId: 'call-1',
		state: 'output-available',
		input: {},
		output: {},
		...overrides
	};
}

describe('assistant activity summaries', () => {
	it('uses a direct label while a web search is running', () => {
		const view = toolPartToView(
			toolPart({
				state: 'input-available',
				input: { query: 'fifa world cup', searchDepth: 'basic' }
			})
		);

		expect(view).toMatchObject({
			title: 'Search the web',
			phase: 'running',
			summary: 'Searching the web…',
			compactSummary: 'Searching the web…'
		});
	});

	it('summarizes completed web search sources without exposing raw payloads', () => {
		const view = toolPartToView(
			toolPart({
				input: { query: 'fifa world cup', searchDepth: 'advanced', token: 'secret-token' },
				output: {
					results: [
						{
							title: 'FIFA World Cup',
							url: 'https://www.fifa.com/tournaments/mens/worldcup',
							content: 'Full page content should not be rendered.'
						},
						{ title: 'Official host page', url: 'https://example.com/world-cup' }
					]
				}
			})
		);

		expect(view).toMatchObject({
			compactSummary: 'Searched the web · 2 sources',
			sources: [
				{
					title: 'FIFA World Cup',
					url: 'https://www.fifa.com/tournaments/mens/worldcup',
					domain: 'fifa.com'
				},
				{ title: 'Official host page', url: 'https://example.com/world-cup', domain: 'example.com' }
			]
		});
		expect(view?.detailJson).toContain('"query": "fifa world cup"');
		expect(view?.detailJson).toContain('"resultCount": 2');
		expect(view?.detailJson).not.toContain('Full page content');
		expect(view?.detailJson).not.toContain('secret-token');
	});

	it('drops malformed source URLs from source actions', () => {
		const view = toolPartToView(
			toolPart({
				output: {
					results: [
						{ title: 'Invalid', url: 'javascript:alert(1)' },
						{ title: 'Valid', url: 'https://example.com/source' }
					]
				}
			})
		);

		expect(view?.sources).toEqual([
			{ title: 'Valid', url: 'https://example.com/source', domain: 'example.com' }
		]);
	});

	it('exposes extraction sources from results or requested URLs', () => {
		const view = toolPartToView({
			type: 'tool-tavilyExtract',
			toolCallId: 'call-extract',
			state: 'output-available',
			input: { urls: ['https://example.com/page', 'not-a-url'] },
			output: { results: [] }
		});

		expect(view).toMatchObject({
			compactSummary: 'Read 1 page',
			sources: [{ title: 'example.com', url: 'https://example.com/page', domain: 'example.com' }]
		});
		expect(view?.detailJson).toContain('requestedUrls');
		expect(view?.detailJson).not.toContain('not-a-url');
	});

	it('sanitizes artifact details while keeping artifact actions', () => {
		const view = toolPartToView({
			type: 'tool-readThreadArtifact',
			toolCallId: 'call-read',
			state: 'output-available',
			input: { artifactId: 'artifact-1', authorization: 'secret' },
			output: {
				title: 'World Cup notes',
				contentFormat: 'markdown',
				content: 'Private full artifact contents'
			}
		});

		expect(view?.detailJson).toContain('World Cup notes');
		expect(view?.detailJson).not.toContain('Private full artifact contents');
		expect(view?.detailJson).not.toContain('authorization');
	});

	it('keeps failed and denied states inspectable', () => {
		const failed = toolPartToView(
			toolPart({ state: 'output-error', errorText: 'Search provider unavailable' })
		);
		const denied = toolPartToView(
			toolPart({ state: 'output-denied', approval: { reason: 'User denied access' } })
		);

		expect(failed).toMatchObject({ phase: 'error', compactSummary: 'Search the web failed' });
		expect(denied).toMatchObject({ phase: 'denied', compactSummary: 'Search the web not run' });
	});

	it('uses human-readable summaries for single, multiple, and mixed activity', () => {
		const running = toolPartToView(toolPart({ state: 'input-available' }));
		const completed = toolPartToView(toolPart({}));
		const failed = toolPartToView(toolPart({ state: 'output-error', errorText: 'Failed' }));

		expect(formatToolActivitySummary([running!])).toBe('Searching the web…');
		expect(formatToolActivitySummary([completed!, completed!])).toBe('Completed 2 actions');
		expect(formatToolActivitySummary([completed!, failed!])).toBe(
			'Completed 1 of 2 actions · 1 failed'
		);
	});

	it('describes a completed visual artifact and exposes an open action', () => {
		const view = toolPartToView({
			type: 'tool-createVisualArtifact',
			toolCallId: 'call-1',
			state: 'output-available',
			input: {},
			output: {
				artifactId: 'artifact-1',
				title: 'World Cup landing page'
			}
		});

		expect(view).toMatchObject({
			title: 'Save visual artifact',
			phase: 'done',
			summary: 'Saved visual artifact: World Cup landing page.',
			actionLabel: 'Open artifact',
			actionArtifactId: 'artifact-1'
		});
	});

	it('keeps artifact change and promotion review actions available', () => {
		const update = toolPartToView({
			type: 'tool-updateThreadArtifact',
			toolCallId: 'call-update',
			state: 'output-available',
			input: {},
			output: {
				artifactId: 'artifact-1',
				title: 'World Cup notes',
				versionNumber: 4
			}
		});
		const promotion = toolPartToView({
			type: 'tool-prepareProjectPromotion',
			toolCallId: 'call-promotion',
			state: 'output-available',
			input: {},
			output: {
				name: 'World Cup project',
				linkedArtifactCount: 2,
				requiresUserConfirmation: true
			}
		});

		expect(update).toMatchObject({
			actionLabel: 'View changes',
			actionArtifactId: 'artifact-1',
			actionVersionNumber: 4
		});
		expect(promotion).toMatchObject({ actionLabel: 'Review and create project' });
	});
});
