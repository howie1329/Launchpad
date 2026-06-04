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
			description: 'Read the full markdown for an artifact already linked to the active thread.',
			inputSchema: z.object({
				artifactId: z.string().describe('The artifact id.')
			}),
			execute: log('readThreadArtifact')
		}),
		createIdeaArtifact: tool({
			description:
				'Create a loose idea artifact linked to the active thread. Use only after the user asks or confirms.',
			inputSchema: z.object({
				title: z.string().min(1),
				contentMarkdown: z.string().min(1)
			}),
			execute: log('createIdeaArtifact')
		}),
		createPrdArtifact: tool({
			description:
				'Create a PRD artifact linked to the active thread. Use only after the user asks or confirms.',
			inputSchema: z.object({
				title: z.string().min(1),
				problem: z.string().min(1),
				targetUser: z.string().min(1)
			}),
			execute: log('createPrdArtifact')
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
		requestUserChoice: tool({
			description:
				'Canonical UI tool for asking the user one compact decision. Use instead of prose multiple-choice questions.',
			inputSchema: z.object({
				question: z.string().min(1),
				options: z
					.array(
						z.object({
							label: z.string().min(1),
							answer: z.string().min(1)
						})
					)
					.min(2)
					.max(3)
			}),
			execute: log('requestUserChoice')
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
		})
	};
}
