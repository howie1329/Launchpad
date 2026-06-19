import { tool } from 'ai';
import { z } from 'zod';
import type { WorkspaceChatToolCallRecord } from './types.ts';

export function createWorkspaceChatStubTools(record: WorkspaceChatToolCallRecord[]) {
	const log = (toolName: string) => async (input: unknown) => {
		record.push({ toolName, input });
		return { ok: true, toolName };
	};

	return {
		listThreadArtifacts: tool({
			description: 'List artifacts already linked to the active thread.',
			inputSchema: z.object({}),
			execute: log('listThreadArtifacts')
		}),
		readThreadArtifact: tool({
			description:
				'Read the full source for a thread-linked artifact (markdown, HTML, or SVG). Returns contentFormat and content.',
			inputSchema: z.object({
				artifactId: z.string().describe('The artifact id.')
			}),
			execute: log('readThreadArtifact')
		}),
		createIdeaArtifact: tool({
			description:
				'Create a markdown idea artifact linked to the active thread. Use only after the user asks or confirms.',
			inputSchema: z.object({
				title: z.string().min(1),
				content: z.string().min(1)
			}),
			execute: log('createIdeaArtifact')
		}),
		createPrdArtifact: tool({
			description:
				'Create a markdown PRD artifact linked to the active thread. Use only after the user asks or confirms.',
			inputSchema: z.object({
				title: z.string().min(1),
				problem: z.string().min(1),
				targetUser: z.string().min(1)
			}),
			execute: log('createPrdArtifact')
		}),
		createVisualArtifact: tool({
			description:
				'Create an HTML or SVG visual artifact linked to the active thread. Use only after the user asks or confirms.',
			inputSchema: z.object({
				title: z.string().min(1),
				type: z.string().min(1),
				contentFormat: z.enum(['html', 'svg']),
				content: z.string().min(1)
			}),
			execute: log('createVisualArtifact')
		}),
		prepareProjectPromotion: tool({
			description:
				'Prepare a non-mutating project promotion proposal for the active chat. Use when the user asks to turn this chat into a project.',
			inputSchema: z.object({
				name: z.string().min(1),
				summary: z.string().optional()
			}),
			execute: log('prepareProjectPromotion')
		}),
		rememberUserPreference: tool({
			description: 'Save a durable global user preference.',
			inputSchema: z.object({
				content: z.string().min(1),
				category: z.string().min(1)
			}),
			execute: log('rememberUserPreference')
		}),
		rememberProjectDecision: tool({
			description: 'Save a durable project decision (project chats only).',
			inputSchema: z.object({
				content: z.string().min(1),
				category: z.string().min(1)
			}),
			execute: log('rememberProjectDecision')
		}),
		listProjectArtifacts: tool({
			description:
				'List project artifacts when the user asks to find or import project memory. Only works in project chats.',
			inputSchema: z.object({}),
			execute: log('listProjectArtifacts')
		}),
		searchArtifacts: tool({
			description:
				'Search workspace artifacts by title, type, or content. Use when the user asks to find, locate, look up, search, or recall artifacts without naming an exact thread-linked artifact.',
			inputSchema: z.object({
				query: z.string().optional(),
				type: z.string().nullable().optional(),
				projectScope: z.enum(['all', 'none', 'project']).default('all'),
				updatedAfter: z.number().nullable().optional(),
				limit: z.number().int().min(1).max(25).default(10)
			}),
			execute: log('searchArtifacts')
		}),
		listRelevantMemory: tool({
			description:
				'List or search relevant memory for transparency. With a query, returns semantic search results; without a query, lists scoped memories separated by user and project.',
			inputSchema: z.object({
				query: z.string().optional(),
				limit: z.number().int().min(1).max(20).default(10)
			}),
			execute: log('listRelevantMemory')
		})
	};
}
