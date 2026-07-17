import { tavily } from '@tavily/core';
import { tool } from 'ai';
import { z } from 'zod';

const searchDepthSchema = z.enum(['basic', 'advanced', 'fast', 'ultra-fast']);
const timeRangeSchema = z.enum(['year', 'month', 'week', 'day', 'y', 'm', 'w', 'd']);
const extractDepthSchema = z.enum(['basic', 'advanced']);

export function createTavilyTools({ apiKey }: { apiKey: string }) {
	const client = tavily({ apiKey });

	return {
		tavilySearch: tool({
			description: 'Search the web for current, relevant information.',
			inputSchema: z.object({
				query: z.string().trim().min(1).describe('The search query.'),
				searchDepth: searchDepthSchema.optional(),
				timeRange: timeRangeSchema.optional()
			}),
			execute: ({ query, searchDepth, timeRange }) =>
				client.search(query, {
					searchDepth: searchDepth ?? 'basic',
					maxResults: 5,
					includeAnswer: false,
					includeImages: false,
					includeFavicon: true,
					...(timeRange ? { timeRange } : {})
				})
		}),
		tavilyExtract: tool({
			description: 'Extract readable content from one or more web pages.',
			inputSchema: z.object({
				urls: z.array(z.string().url()).min(1).max(20),
				extractDepth: extractDepthSchema.optional(),
				query: z.string().trim().min(1).optional()
			}),
			execute: ({ urls, extractDepth, query }) =>
				client.extract(urls, {
					extractDepth: extractDepth ?? 'basic',
					format: 'markdown',
					includeImages: false,
					chunksPerSource: 3,
					timeout: 10,
					...(query ? { query } : {})
				})
		})
	};
}
