import { env } from '$env/dynamic/private';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { getThreadQuery } from '$lib/chat';
import {
	createArtifactMutation,
	linkArtifactToThreadMutation,
	listProjectArtifactsQuery,
	listThreadArtifactsQuery,
	searchArtifactsQuery,
	updateThreadArtifactMutation,
	type ArtifactSearchArgs,
	type SavedArtifact
} from '$lib/artifacts';
import { parseArtifactMentionIds } from '$lib/artifact-mention-tokens';
import { artifactPreview } from '$lib/artifact-display';
import { isIdeaAiModelId } from '$lib/idea-ai-models';
import { getProjectQuery } from '$lib/projects';
import {
	recordAiRunMutation,
	releaseAiBudgetReservationMutation,
	reserveAiBudgetMutation
} from '$lib/usage';
import { getMyUserSettingsQuery } from '$lib/user-settings';
import { createNotificationMutation } from '$lib/notifications';
import { uiMessageText } from '$lib/workspace-chat-message-actions';
import { getWorkspaceChatAi, traceWorkspaceChatRun } from '$lib/server/braintrust';
import { buildFullWorkspaceChatInstructions } from '$lib/server/workspace-chat-instructions';
import {
	OpenRouterNotConfiguredError,
	resolveWorkspaceLanguageModel
} from '$lib/server/resolve-workspace-language-model';
import { syncArtifactMemory } from '$lib/server/launchpad-memory';
import {
	getComposioToolsForChatRun,
	isComposioConfigured,
	parseComposioToolkits
} from '$lib/server/composio';
import {
	addProjectDecisionMemoryDocument,
	addThreadInsightMemoryDocument,
	addUserPreferenceMemoryDocument,
	buildSupermemoryProfileInstructions,
	composeRetrievedMemoryInstructions,
	deleteScopedSemanticMemoryDocument,
	inspectScopedMemoryDocument,
	listScopedMemoryDocuments,
	memoryLog,
	projectDecisionCategories,
	retrieveRelevantMemories,
	threadInsightCategories,
	userPreferenceCategories
} from '$lib/server/memory';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { tavilyExtract, tavilySearch } from '@tavily/ai-sdk';
import { ConvexHttpClient } from 'convex/browser';
import { safeValidateUIMessages, stepCountIs, tool, type UIMessage } from 'ai';
import type { Id } from '../../../../convex/_generated/dataModel';
import { z } from 'zod';

/** Max markdown chars per artifact when expanding @artifact: mentions (per request). */
const MAX_REFERENCED_ARTIFACT_CHARS = 14_000;

type WorkspaceProject = {
	_id: Id<'projects'>;
	name: string;
	summary?: string;
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const threadId = typeof body.threadId === 'string' ? body.threadId : '';

		if (!threadId) {
			return json({ error: 'Thread id is required' }, { status: 400 });
		}

		if (!isIdeaAiModelId(body.modelId)) {
			return json({ error: 'Unsupported model' }, { status: 400 });
		}

		const token = bearerToken(request.headers.get('authorization'));
		if (!token) {
			return json({ error: 'Authentication is required' }, { status: 401 });
		}

		const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);
		convex.setAuth(token);

		const thread = await convex.query(getThreadQuery, {
			threadId: threadId as Id<'chatThreads'>
		});

		if (!thread) {
			return json({ error: 'Thread not found' }, { status: 404 });
		}

		const project =
			thread.scopeType === 'project' && thread.projectId
				? await convex.query(getProjectQuery, { projectId: thread.projectId })
				: null;

		const validatedMessages = await safeValidateUIMessages({
			messages: body.messages
		});

		if (!validatedMessages.success) {
			return json({ error: 'Invalid chat messages' }, { status: 400 });
		}

		const lastUserText = lastUserMessageText(validatedMessages.data);
		const referenced = await buildReferencedArtifactInstructions(
			convex,
			thread._id,
			project?._id,
			lastUserText
		);
		if (referenced.error) {
			return json({ error: referenced.error }, { status: 400 });
		}

		const profileBlock = await buildSupermemoryProfileInstructions({
			ownerId: thread.ownerId,
			...(project?._id ? { projectId: project._id } : {})
		});

		const memories = await retrieveRelevantMemories({
			ownerId: thread.ownerId,
			...(project?._id ? { projectId: project._id } : {}),
			query: lastUserText
		});
		const memoryBlock = composeRetrievedMemoryInstructions(memories);
		const webSearchRequested = body.webSearchRequested === true;
		const selectedComposioToolkits = parseComposioToolkits(body.composioToolkits);
		const composioAvailable = isComposioConfigured();
		const webSearchApiKey = env.TAVILY_API_KEY?.trim() ?? '';
		const webSearchAvailable = Boolean(webSearchApiKey);
		const userSettingsRow = await convex.query(getMyUserSettingsQuery, {});
		const instructions = buildFullWorkspaceChatInstructions({
			project: project ? { name: project.name, summary: project.summary } : null,
			referencedBlock: referenced.block,
			profileBlock,
			memoryBlock,
			webSearchRequested,
			webSearchAvailable,
			composioToolkits: selectedComposioToolkits,
			composioAvailable,
			userSettings: userSettingsRow
		});

		const tools = workspaceTools({
			convex,
			threadId: thread._id,
			project: project as WorkspaceProject | null,
			ownerId: thread.ownerId,
			projectId: project?._id,
			webSearchAvailable,
			webSearchApiKey
		});

		try {
			Object.assign(
				tools,
				await getComposioToolsForChatRun({
					convex,
					thread,
					toolkits: selectedComposioToolkits
				})
			);
		} catch (error) {
			console.error('Could not load Composio tools', error);
		}

		let languageModel;
		try {
			languageModel = resolveWorkspaceLanguageModel(body.modelId);
		} catch (e) {
			if (e instanceof OpenRouterNotConfiguredError) {
				return json({ error: e.message }, { status: 400 });
			}
			throw e;
		}

		const reservation = await convex.mutation(reserveAiBudgetMutation, {
			sourceKind: 'chatThread',
			sourceId: thread._id,
			modelId: body.modelId
		});
		if (!reservation.ok) {
			return json(
				{
					error: 'Daily AI limit reached',
					capUsd: reservation.budget.capUsd,
					spentUsd: reservation.budget.spentUsd,
					dateKey: reservation.budget.dateKey
				},
				{ status: 429 }
			);
		}

		try {
			return traceWorkspaceChatRun(
				{
					threadId: thread._id,
					modelId: body.modelId,
					scopeType: thread.scopeType,
					...(thread.projectId ? { projectId: thread.projectId } : {}),
					webSearchRequested,
					composioToolkits: selectedComposioToolkits,
					hasReferencedArtifacts: referenced.block.length > 0,
					composioAvailable
				},
				() => {
					const { ToolLoopAgent, createAgentUIStreamResponse } = getWorkspaceChatAi();

					const agent = new ToolLoopAgent({
						model: languageModel,
						instructions,
						tools,
						stopWhen: stepCountIs(8)
					});

					const accumulatedUsage = {
						inputTokens: 0,
						outputTokens: 0,
						reasoningTokens: 0,
						cachedInputTokens: 0
					};
					let hasUsage = false;
					let didRecordUsage = false;
					let didCreateChatNotification = false;

					return createAgentUIStreamResponse({
						agent,
						uiMessages: validatedMessages.data,
						onStepFinish: async (step) => {
							const usage = step.usage ?? {};

							const inputTokens = usage.inputTokens ?? 0;
							const outputTokens = usage.outputTokens ?? 0;
							const reasoningTokens =
								usage.reasoningTokens ?? usage.outputTokenDetails?.reasoningTokens ?? 0;
							const cachedInputTokens =
								usage.cachedInputTokens ?? usage.inputTokenDetails?.cacheReadTokens ?? 0;

							accumulatedUsage.inputTokens += inputTokens;
							accumulatedUsage.outputTokens += outputTokens;
							accumulatedUsage.reasoningTokens += reasoningTokens;
							accumulatedUsage.cachedInputTokens += cachedInputTokens;

							if (
								usage.inputTokens !== undefined ||
								usage.outputTokens !== undefined ||
								usage.reasoningTokens !== undefined ||
								usage.cachedInputTokens !== undefined
							) {
								hasUsage = true;
							}

							const isFinalStep = step.finishReason !== 'tool-calls' || step.stepNumber === 7;
							if (!isFinalStep) return;

							if (!didRecordUsage && hasUsage) {
								didRecordUsage = true;
								await convex.mutation(recordAiRunMutation, {
									threadId: thread._id,
									modelId: body.modelId,
									occurredAt: Date.now(),
									usage: accumulatedUsage,
									reservationId: reservation.reservationId
								});
							}

							if (!didCreateChatNotification) {
								didCreateChatNotification = true;
								await createChatCompletionNotification(convex, thread._id);
							}
						}
					});
				}
			);
		} catch (error) {
			await convex.mutation(releaseAiBudgetReservationMutation, {
				reservationId: reservation.reservationId
			});
			throw error;
		}
	} catch (error) {
		console.error(error);
		return json({ error: 'Error generating workspace chat response' }, { status: 500 });
	}
};

function bearerToken(authorization: string | null) {
	if (!authorization?.startsWith('Bearer ')) return '';
	return authorization.slice('Bearer '.length).trim();
}

function workspaceTools({
	convex,
	threadId,
	project,
	ownerId,
	projectId,
	webSearchAvailable,
	webSearchApiKey
}: {
	convex: ConvexHttpClient;
	threadId: Id<'chatThreads'>;
	project: WorkspaceProject | null;
	ownerId: Id<'users'>;
	projectId?: Id<'projects'>;
	webSearchAvailable: boolean;
	webSearchApiKey: string;
}) {
	const artifactIdSchema = z.object({
		artifactId: z.string().describe('The artifact id.')
	});

	return {
		...(webSearchAvailable
			? {
					tavilySearch: tavilySearch({
						apiKey: webSearchApiKey,
						searchDepth: 'basic',
						maxResults: 5,
						includeAnswer: false,
						includeImages: false,
						includeFavicon: true
					}),
					tavilyExtract: tavilyExtract({
						apiKey: webSearchApiKey,
						extractDepth: 'basic',
						format: 'markdown',
						includeImages: false,
						chunksPerSource: 3,
						timeout: 10
					})
				}
			: {}),
		listThreadArtifacts: tool({
			description: 'List artifacts already linked to the active thread.',
			inputSchema: z.object({}),
			execute: async () => {
				const rows = await convex.query(listThreadArtifactsQuery, { threadId });

				return {
					artifacts: rows.map(({ link, artifact }) => artifactSummary(artifact, link.reason))
				};
			}
		}),
		readThreadArtifact: tool({
			description: 'Read the full markdown for an artifact already linked to the active thread.',
			inputSchema: artifactIdSchema,
			execute: async ({ artifactId }) => {
				const { artifact, reason } = await getThreadArtifact(convex, threadId, artifactId);

				return {
					...artifactSummary(artifact, reason),
					contentMarkdown: artifact.contentMarkdown
				};
			}
		}),
		listProjectArtifacts: tool({
			description:
				'List project artifacts when the user asks to find or import project memory. Only works in project chats.',
			inputSchema: z.object({}),
			execute: async () => {
				if (!project) {
					throw new Error('Project artifacts are only available in project chats.');
				}

				const artifacts = await convex.query(listProjectArtifactsQuery, { projectId: project._id });

				return {
					artifacts: artifacts.map((artifact) => artifactSummary(artifact))
				};
			}
		}),
		searchArtifacts: tool({
			description:
				'Search workspace artifacts by title, type, or markdown content. Use when the user asks to find, locate, look up, search, or recall artifacts without naming an exact thread-linked artifact.',
			inputSchema: z.object({
				query: z.string().optional().describe('Search text for artifact title, type, or content.'),
				type: z.string().nullable().optional().describe('Optional exact artifact type filter.'),
				projectScope: z
					.enum(['all', 'none', 'project'])
					.default('all')
					.describe(
						'Whether to search all artifacts, artifacts without a project, or current project artifacts.'
					),
				updatedAfter: z
					.number()
					.nullable()
					.optional()
					.describe(
						'Optional Unix timestamp in milliseconds; only return artifacts updated at or after this time.'
					),
				limit: z.number().int().min(1).max(25).default(10)
			}),
			execute: async ({ query, type, projectScope, updatedAfter, limit }) => {
				const resolvedProjectScope = projectScope ?? 'all';
				if (resolvedProjectScope === 'project' && !project) {
					throw new Error('Project-scoped artifact search is only available in project chats.');
				}

				const normalizedQuery = query?.trim() ?? '';
				const searchArgs: ArtifactSearchArgs = {
					type: type?.trim() || null,
					projectScope: resolvedProjectScope,
					projectId: resolvedProjectScope === 'project' && project ? project._id : null,
					updatedAfter: updatedAfter ?? null,
					limit: limit ?? 10
				};
				if (normalizedQuery) searchArgs.query = normalizedQuery;

				const artifacts = await convex.query(searchArtifactsQuery, searchArgs);

				return {
					artifacts: artifacts.map((artifact) => artifactSummary(artifact)),
					query: normalizedQuery,
					projectScope: resolvedProjectScope
				};
			}
		}),
		importProjectArtifactToThread: tool({
			description:
				'Import a project artifact into the active thread context after the user asks for it.',
			inputSchema: artifactIdSchema,
			execute: async ({ artifactId }) => {
				if (!project) {
					throw new Error('Project artifacts are only available in project chats.');
				}

				const artifact = await getProjectArtifact(convex, project._id, artifactId);

				await convex.mutation(linkArtifactToThreadMutation, {
					threadId,
					artifactId: artifact._id,
					reason: 'imported'
				});

				return artifactSummary(artifact, 'imported');
			}
		}),
		createIdeaArtifact: tool({
			description:
				'Create a loose idea artifact linked to the active thread. Use only after the user asks or confirms.',
			inputSchema: z.object({
				title: z.string().min(1),
				contentMarkdown: z.string().min(1)
			}),
			execute: async ({ title, contentMarkdown }) => {
				const result = await convex.mutation(createArtifactMutation, {
					type: 'idea',
					title,
					contentMarkdown,
					sourceThreadId: threadId,
					metadata: { source: 'workspace-chat-tool' },
					versionActor: 'ai',
					versionSource: 'chat'
				});
				await syncArtifactMemoryForTool(convex, result.artifactId);

				return {
					artifactId: result.artifactId,
					type: 'idea',
					title,
					summary: 'Created idea artifact.'
				};
			}
		}),
		createPrdArtifact: tool({
			description:
				'Create a PRD artifact linked to the active thread. Use only after the user asks or confirms.',
			inputSchema: z.object({
				title: z.string().min(1),
				problem: z.string().min(1),
				targetUser: z.string().min(1),
				goals: z.array(z.string()).default([]),
				mvpScope: z.array(z.string()).default([]),
				outOfScope: z.array(z.string()).default([]),
				testScenarios: z.array(z.string()).default([]),
				researchPlan: z.string().default('')
			}),
			execute: async (input) => {
				const contentMarkdown = formatPrdMarkdown(input);
				const result = await convex.mutation(createArtifactMutation, {
					type: 'prd',
					title: input.title,
					contentMarkdown,
					sourceThreadId: threadId,
					metadata: { source: 'workspace-chat-tool' },
					versionActor: 'ai',
					versionSource: 'chat'
				});
				await syncArtifactMemoryForTool(convex, result.artifactId);

				return {
					artifactId: result.artifactId,
					type: 'prd',
					title: input.title,
					summary: 'Created PRD artifact.',
					contentMarkdown
				};
			}
		}),
		prepareProjectPromotion: tool({
			description:
				'Prepare a non-mutating project promotion proposal for the active chat. Use when the user asks to turn this chat into a project; the user must review and confirm in the UI before creation.',
			inputSchema: z.object({
				name: z.string().min(1),
				summary: z.string().optional(),
				strengths: z.array(z.string()).default([]),
				missingInformation: z.array(z.string()).default([])
			}),
			execute: async ({ name, summary, strengths, missingInformation }) => {
				if (project) {
					throw new Error('This thread already belongs to a project.');
				}

				const rows = await convex.query(listThreadArtifactsQuery, { threadId });
				return {
					name: name.trim(),
					...(summary?.trim() ? { summary: summary.trim() } : {}),
					strengths: strengths
						.map((item) => item.trim())
						.filter(Boolean)
						.slice(0, 5),
					missingInformation: missingInformation
						.map((item) => item.trim())
						.filter(Boolean)
						.slice(0, 5),
					linkedArtifactCount: rows.length,
					requiresUserConfirmation: true
				};
			}
		}),
		updateThreadArtifact: tool({
			description:
				'Update a thread-linked artifact directly after the user explicitly asks for that artifact to be revised.',
			inputSchema: z.object({
				artifactId: z.string(),
				title: z.string().min(1),
				contentMarkdown: z.string().min(1),
				summary: z.string().optional()
			}),
			execute: async ({ artifactId, title, contentMarkdown, summary }) => {
				const { artifact } = await getThreadArtifact(convex, threadId, artifactId);
				const result = await convex.mutation(updateThreadArtifactMutation, {
					threadId,
					artifactId: artifact._id,
					title,
					contentMarkdown,
					...(summary?.trim() ? { summary: summary.trim() } : {})
				});
				await syncArtifactMemoryForTool(convex, artifact._id);

				return {
					artifactId: artifact._id,
					title,
					versionNumber: result.versionNumber,
					summary: summary?.trim() || 'Updated artifact.'
				};
			}
		}),
		rememberUserPreference: tool({
			description:
				'Save a durable global user preference. Use for communication, workflow, design taste, or stable work context; never for project-specific decisions.',
			inputSchema: z.object({
				category: z.enum(userPreferenceCategories),
				content: z.string().min(1).describe('Short preference statement to remember globally.'),
				evidence: z
					.string()
					.optional()
					.describe('Short evidence quote or summary from the conversation.'),
				confidence: z.enum(['explicit', 'high', 'inferred']).default('explicit')
			}),
			execute: async ({ category, content, evidence, confidence }) => {
				const result = await addUserPreferenceMemoryDocument({
					ownerId,
					threadId,
					category,
					content,
					...(evidence?.trim() ? { evidence: evidence.trim() } : {}),
					confidence
				});
				return semanticMemoryToolResult(result);
			}
		}),
		rememberProjectDecision: tool({
			description:
				'Save a high-confidence project decision, constraint, target customer, positioning, scope, architecture choice, tradeoff, or confirmed direction. Only works in project chats.',
			inputSchema: z.object({
				category: z.enum(projectDecisionCategories),
				content: z.string().min(1).describe('Short project decision to remember.'),
				evidence: z
					.string()
					.optional()
					.describe('Short evidence quote or summary from the conversation.'),
				confidence: z.enum(['explicit', 'high']).default('high')
			}),
			execute: async ({ category, content, evidence, confidence }) => {
				if (!projectId) {
					return {
						ok: false as const,
						reason: 'Project decisions are only available in project chats.'
					};
				}
				const result = await addProjectDecisionMemoryDocument({
					ownerId,
					projectId,
					threadId,
					category,
					content,
					...(evidence?.trim() ? { evidence: evidence.trim() } : {}),
					confidence
				});
				return semanticMemoryToolResult(result);
			}
		}),
		rememberThreadInsight: tool({
			description:
				'Conservatively save a durable synthesized thread takeaway that is not a user preference or project decision. Use only for open questions, exploration summaries, rationale, or follow-ups.',
			inputSchema: z.object({
				category: z.enum(threadInsightCategories),
				content: z.string().min(1).describe('Short durable thread insight.'),
				evidence: z
					.string()
					.optional()
					.describe('Short evidence quote or summary from the conversation.')
			}),
			execute: async ({ category, content, evidence }) => {
				const result = await addThreadInsightMemoryDocument({
					ownerId,
					...(projectId ? { projectId } : {}),
					threadId,
					category,
					content,
					...(evidence?.trim() ? { evidence: evidence.trim() } : {})
				});
				return semanticMemoryToolResult(result);
			}
		}),
		forgetUserMemory: tool({
			description:
				'Delete a user-scoped semantic memory only when the user explicitly asks. Cannot delete project or artifact memory.',
			inputSchema: z.object({
				documentId: z.string().min(1).describe('Supermemory document id.')
			}),
			execute: async ({ documentId }) => {
				const result = await deleteScopedSemanticMemoryDocument({
					documentId,
					ownerId,
					scope: 'user'
				});
				if (!result.ok) memoryLog('supermemory.forget_user_denied', { reason: result.reason });
				return result.ok ? { ok: true as const } : { ok: false as const, reason: result.reason };
			}
		}),
		forgetProjectMemory: tool({
			description:
				'Delete a project-scoped semantic memory only when the user explicitly asks. Only works in project chats and cannot delete artifact memory.',
			inputSchema: z.object({
				documentId: z.string().min(1).describe('Supermemory document id.')
			}),
			execute: async ({ documentId }) => {
				if (!projectId) {
					return {
						ok: false as const,
						reason: 'Project memory is only available in project chats.'
					};
				}
				const result = await deleteScopedSemanticMemoryDocument({
					documentId,
					ownerId,
					projectId,
					scope: 'project'
				});
				if (!result.ok) memoryLog('supermemory.forget_project_denied', { reason: result.reason });
				return result.ok ? { ok: true as const } : { ok: false as const, reason: result.reason };
			}
		}),
		listRelevantMemory: tool({
			description:
				'List or search relevant memory for transparency. With a query, returns semantic search results; without a query, lists scoped memories separated by user and project.',
			inputSchema: z.object({
				query: z.string().optional().describe('Optional query for semantic memory search.'),
				limit: z.number().int().min(1).max(20).default(10)
			}),
			execute: async ({ query, limit }) => {
				const cleanQuery = query?.trim() ?? '';
				if (cleanQuery) {
					const memories = await retrieveRelevantMemories({
						ownerId,
						...(projectId ? { projectId } : {}),
						query: cleanQuery
					});
					return { mode: 'search' as const, memories: memories.slice(0, limit) };
				}

				const result = await listScopedMemoryDocuments({
					ownerId,
					...(projectId ? { projectId } : {}),
					limit
				});
				return result;
			}
		}),
		inspectMemory: tool({
			description:
				'Inspect a specific memory document with sanitized structured metadata. Artifact memory is read-only and derived from canonical artifact content.',
			inputSchema: z.object({
				documentId: z.string().min(1).describe('Supermemory document id.')
			}),
			execute: async ({ documentId }) => {
				return inspectScopedMemoryDocument({
					documentId,
					ownerId,
					...(projectId ? { projectId } : {})
				});
			}
		})
	};
}

function semanticMemoryToolResult(
	result:
		| { status: 'synced'; documentId: string }
		| { status: 'blocked'; reason: string }
		| { status: 'disabled' }
		| { status: 'failed'; error: string }
) {
	if (result.status === 'synced') return { ok: true as const, documentId: result.documentId };
	if (result.status === 'disabled') {
		return { ok: false as const, reason: 'Memory service is not configured.' };
	}
	if (result.status === 'failed') return { ok: false as const, reason: result.error };
	return { ok: false as const, reason: result.reason };
}

async function syncArtifactMemoryForTool(convex: ConvexHttpClient, artifactId: Id<'artifacts'>) {
	const result = await syncArtifactMemory(convex, artifactId);
	if (result && result.status !== 'synced' && result.status !== 'disabled') {
		console.info('Artifact memory sync skipped', result);
	}
}

async function createChatCompletionNotification(
	convex: ConvexHttpClient,
	threadId: Id<'chatThreads'>
) {
	try {
		await convex.mutation(createNotificationMutation, {
			type: 'ai_chat_activity',
			state: 'activity',
			title: 'AI response completed',
			body: 'Open the chat to continue from the latest response.',
			targetKind: 'chatThread',
			targetId: threadId
		});
	} catch (error) {
		console.info('Chat notification skipped', error);
	}
}

function artifactSummary(artifact: SavedArtifact, reason?: string) {
	return {
		artifactId: artifact._id,
		type: artifact.type,
		title: artifact.title,
		reason,
		preview: artifactPreview(artifact.contentMarkdown),
		updatedAt: artifact.updatedAt
	};
}

async function getThreadArtifact(
	convex: ConvexHttpClient,
	threadId: Id<'chatThreads'>,
	artifactId: string
) {
	const rows = await convex.query(listThreadArtifactsQuery, { threadId });
	const row = rows.find((item) => item.artifact._id === artifactId);

	if (!row) {
		throw new Error('Artifact is not linked to this thread.');
	}

	return {
		artifact: row.artifact,
		reason: row.link.reason
	};
}

function lastUserMessageText(messages: UIMessage[]): string {
	for (let i = messages.length - 1; i >= 0; i--) {
		if (messages[i].role === 'user') {
			return uiMessageText(messages[i], '');
		}
	}
	return '';
}

async function buildReferencedArtifactInstructions(
	convex: ConvexHttpClient,
	threadId: Id<'chatThreads'>,
	projectId: Id<'projects'> | undefined,
	lastUserText: string
): Promise<{ block: string; error: string | null }> {
	const ids = parseArtifactMentionIds(lastUserText);
	if (ids.length === 0) {
		return { block: '', error: null };
	}

	const sections: string[] = [];
	for (const id of ids) {
		try {
			const artifact = await getReferencedArtifact(convex, threadId, projectId, id);
			let md = artifact.contentMarkdown;
			let truncated = false;
			if (md.length > MAX_REFERENCED_ARTIFACT_CHARS) {
				md = md.slice(0, MAX_REFERENCED_ARTIFACT_CHARS);
				truncated = true;
			}
			let block = `#### ${artifact.title}\nArtifact id: \`${artifact._id}\`\n\n${md}`;
			if (truncated) {
				block += `\n\n_[Content truncated for length. Use the readThreadArtifact tool with this artifact id for the full markdown.]_`;
			}
			sections.push(block);
		} catch {
			return {
				block: '',
				error: `Referenced artifact is not available in this thread or project: ${id}`
			};
		}
	}

	const block = [
		'### Explicitly referenced thread artifacts',
		'The user included @artifact: tokens in their latest message. Treat the following markdown as primary context for this turn (in addition to any tools you call).',
		'',
		sections.join('\n\n---\n\n')
	].join('\n');

	return { block, error: null };
}

async function getReferencedArtifact(
	convex: ConvexHttpClient,
	threadId: Id<'chatThreads'>,
	projectId: Id<'projects'> | undefined,
	artifactId: string
) {
	try {
		const { artifact } = await getThreadArtifact(convex, threadId, artifactId);
		return artifact;
	} catch (error) {
		if (!projectId) throw error;
		return await getProjectArtifact(convex, projectId, artifactId);
	}
}

async function getProjectArtifact(
	convex: ConvexHttpClient,
	projectId: Id<'projects'>,
	artifactId: string
) {
	const artifacts = await convex.query(listProjectArtifactsQuery, { projectId });
	const artifact = artifacts.find((item) => item._id === artifactId);

	if (!artifact) {
		throw new Error('Artifact is not linked to this project.');
	}

	return artifact;
}

function formatPrdMarkdown(input: {
	title: string;
	problem: string;
	targetUser: string;
	goals: string[];
	mvpScope: string[];
	outOfScope: string[];
	testScenarios: string[];
	researchPlan: string;
}) {
	return [
		`# ${input.title}`,
		'',
		'## Problem',
		input.problem,
		'',
		'## Target user',
		input.targetUser,
		'',
		'## Goals',
		formatList(input.goals),
		'',
		'## MVP scope',
		formatList(input.mvpScope),
		'',
		'## Out of scope',
		formatList(input.outOfScope),
		'',
		'## Test scenarios',
		formatList(input.testScenarios),
		'',
		'## Research plan',
		input.researchPlan.trim() || 'No research plan yet.'
	]
		.join('\n')
		.trim();
}

function formatList(items: string[]) {
	const cleanItems = items.map((item) => item.trim()).filter(Boolean);
	if (cleanItems.length === 0) return '- Not specified yet.';
	return cleanItems.map((item) => `- ${item}`).join('\n');
}
