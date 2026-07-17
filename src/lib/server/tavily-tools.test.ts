import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createTavilyTools } from './tavily-tools';

const mocks = vi.hoisted(() => ({
	tavily: vi.fn(),
	search: vi.fn(),
	extract: vi.fn()
}));

vi.mock('@tavily/core', () => ({
	tavily: mocks.tavily
}));

const executionOptions = {
	toolCallId: 'test-call',
	messages: [],
	context: {}
};

beforeEach(() => {
	vi.clearAllMocks();
	mocks.tavily.mockReturnValue({
		search: mocks.search,
		extract: mocks.extract
	});
});

describe('createTavilyTools', () => {
	it('creates search and extract tools with the configured API key', () => {
		const tools = createTavilyTools({ apiKey: 'test-key' });

		expect(mocks.tavily).toHaveBeenCalledWith({ apiKey: 'test-key' });
		expect(tools).toHaveProperty('tavilySearch');
		expect(tools).toHaveProperty('tavilyExtract');
	});

	it('searches with safe defaults and supports per-call depth and time range', async () => {
		const { tavilySearch } = createTavilyTools({ apiKey: 'test-key' });
		mocks.search.mockResolvedValue({ results: [] });

		await tavilySearch.execute?.(
			{ query: 'latest Svelte news', searchDepth: 'advanced', timeRange: 'week' },
			executionOptions
		);

		expect(mocks.search).toHaveBeenCalledWith('latest Svelte news', {
			searchDepth: 'advanced',
			maxResults: 5,
			includeAnswer: false,
			includeImages: false,
			includeFavicon: true,
			timeRange: 'week'
		});
	});

	it('extracts a bounded URL list with the existing workspace defaults', async () => {
		const { tavilyExtract } = createTavilyTools({ apiKey: 'test-key' });
		mocks.extract.mockResolvedValue({ results: [], failedResults: [] });

		await tavilyExtract.execute?.(
			{
				urls: ['https://example.com'],
				extractDepth: 'advanced',
				query: 'release notes'
			},
			executionOptions
		);

		expect(mocks.extract).toHaveBeenCalledWith(['https://example.com'], {
			extractDepth: 'advanced',
			format: 'markdown',
			includeImages: false,
			chunksPerSource: 3,
			timeout: 10,
			query: 'release notes'
		});
	});

	it('rejects invalid tool inputs before execution', () => {
		const { tavilySearch, tavilyExtract } = createTavilyTools({ apiKey: 'test-key' });
		const searchSchema = tavilySearch.inputSchema as z.ZodType;
		const extractSchema = tavilyExtract.inputSchema as z.ZodType;

		expect(() => searchSchema.parse({ query: '   ' })).toThrow();
		expect(() => extractSchema.parse({ urls: [] })).toThrow();
		expect(() => extractSchema.parse({ urls: ['not-a-url'] })).toThrow();
		expect(() =>
			extractSchema.parse({ urls: Array.from({ length: 21 }, () => 'https://example.com') })
		).toThrow();
	});

	it('propagates Tavily request failures', async () => {
		const { tavilySearch } = createTavilyTools({ apiKey: 'test-key' });
		mocks.search.mockRejectedValue(new Error('Tavily unavailable'));

		await expect(tavilySearch.execute?.({ query: 'status' }, executionOptions)).rejects.toThrow(
			'Tavily unavailable'
		);
	});
});
