import type { UIMessage } from 'ai';

export type ToolStepPhase = 'running' | 'done' | 'error' | 'denied';

export type ToolSourceView = {
	title: string;
	url: string;
	domain?: string;
};

export type ToolStepView = {
	id: string;
	toolName: string;
	title: string;
	phase: ToolStepPhase;
	summary: string;
	compactSummary: string;
	detailJson: string;
	sources?: ToolSourceView[];
	errorText?: string;
	actionLabel?: string;
	actionArtifactId?: string;
	actionVersionNumber?: number;
};

export type PromotionProposalView = {
	id: string;
	name: string;
	summary?: string;
	strengths: string[];
	missingInformation: string[];
	linkedArtifactCount: number;
};

export type AssistantSegment =
	| { kind: 'tools'; tools: ToolStepView[] }
	| { kind: 'promotionProposal'; proposal: PromotionProposalView };

const WORKSPACE_TOOL_META: Record<string, { title: string; running: string }> = {
	listThreadArtifacts: { title: 'List thread artifacts', running: 'Checking thread artifacts…' },
	readThreadArtifact: { title: 'Read thread artifact', running: 'Reading artifact…' },
	listProjectArtifacts: { title: 'List project artifacts', running: 'Checking project artifacts…' },
	searchArtifacts: { title: 'Search artifacts', running: 'Searching artifacts…' },
	importProjectArtifactToThread: {
		title: 'Use project artifact',
		running: 'Adding artifact to this chat…'
	},
	createIdeaArtifact: { title: 'Save idea artifact', running: 'Saving idea artifact…' },
	createPrdArtifact: { title: 'Save PRD artifact', running: 'Saving PRD artifact…' },
	createVisualArtifact: { title: 'Save visual artifact', running: 'Saving visual artifact…' },
	prepareProjectPromotion: {
		title: 'Prepare project promotion',
		running: 'Reviewing project readiness…'
	},
	updateThreadArtifact: { title: 'Update artifact', running: 'Updating artifact…' },
	requestUserChoice: { title: 'Past choice', running: 'Past choice card…' },
	tavilySearch: { title: 'Search the web', running: 'Searching the web…' },
	tavilyExtract: { title: 'Read web pages', running: 'Reading source pages…' }
};

const MAX_DETAIL_TEXT_LENGTH = 320;

type ToolSummary = {
	summary: string;
	compactSummary: string;
	detailJson: string;
	sources?: ToolSourceView[];
	errorText?: string;
	actionLabel?: string;
	actionArtifactId?: string;
	actionVersionNumber?: number;
};

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function textValue(value: unknown, maxLength = MAX_DETAIL_TEXT_LENGTH): string | undefined {
	if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
		return undefined;
	}

	const text = String(value).trim();
	return text ? text.slice(0, maxLength) : undefined;
}

function detailJson(value: Record<string, unknown>): string {
	return JSON.stringify(value, null, 2);
}

function trimSentence(value: string): string {
	return value.trim().replace(/[.!?]+$/, '');
}

function validHttpUrl(value: unknown): string | undefined {
	const text = textValue(value, 2000);
	if (!text) return undefined;

	try {
		const url = new URL(text);
		return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password
			? url.toString()
			: undefined;
	} catch {
		return undefined;
	}
}

function sourceDomain(url: string): string | undefined {
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return undefined;
	}
}

function sourceViewsFromResults(value: unknown): ToolSourceView[] {
	if (!Array.isArray(value)) return [];

	const seen = new Set<string>();
	const sources: ToolSourceView[] = [];
	for (const item of value) {
		const result = asRecord(item);
		const url = validHttpUrl(result.url);
		if (!url || seen.has(url)) continue;

		const domain = sourceDomain(url);
		const title = textValue(result.title, 240) ?? domain ?? url;
		sources.push({ title, url, ...(domain ? { domain } : {}) });
		seen.add(url);
	}

	return sources;
}

function sourceViewsFromUrls(value: unknown): ToolSourceView[] {
	if (!Array.isArray(value)) return [];

	return sourceViewsFromResults(value.map((url) => ({ url })));
}

function sourceDetails(sources: ToolSourceView[]): Array<Record<string, string>> {
	return sources.map(({ title, domain }) => ({
		title,
		...(domain ? { domain } : {})
	}));
}

function countLabel(count: number, singular: string, plural = `${singular}s`): string {
	return `${count} ${count === 1 ? singular : plural}`;
}

function humanizeToolName(toolName: string): string {
	return toolName
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toolTitleForName(toolName: string): string {
	const meta = WORKSPACE_TOOL_META[toolName];
	if (meta) return meta.title;
	return humanizeToolName(toolName);
}

function phaseFromState(state: string | undefined): ToolStepPhase {
	switch (state) {
		case 'output-available':
			return 'done';
		case 'output-error':
			return 'error';
		case 'output-denied':
			return 'denied';
		default:
			return 'running';
	}
}

function parseToolName(part: Record<string, unknown>): string | null {
	const type = part.type;
	if (type === 'dynamic-tool' && typeof part.toolName === 'string') {
		return part.toolName.length ? part.toolName : null;
	}
	if (typeof type === 'string' && type.startsWith('tool-')) {
		const name = type.slice('tool-'.length);
		return name.length ? name : null;
	}
	return null;
}

function externalToolDetails(
	title: string,
	input: Record<string, unknown>,
	output: Record<string, unknown>
): Record<string, unknown> {
	const app = textValue(output.app ?? output.toolkit ?? input.app ?? input.toolkit, 120);
	const action = textValue(output.action ?? input.action, 160);
	const target = textValue(
		output.target ?? input.target ?? output.targetId ?? input.targetId ?? output.id ?? input.id,
		240
	);
	const success =
		output.success === true || output.ok === true
			? true
			: output.success === false || output.ok === false
				? false
				: undefined;

	return {
		status: success === false ? 'Failed' : 'Completed',
		action: action ?? title,
		...(app ? { app } : {}),
		...(target ? { target } : {}),
		...(success !== undefined ? { success } : {})
	};
}

function summarizeTool(
	toolName: string,
	part: Record<string, unknown>,
	phase: ToolStepPhase
): ToolSummary {
	const title = toolTitleForName(toolName);
	const input = asRecord(part.input);

	if (phase === 'error' && typeof part.errorText === 'string') {
		const errorText = textValue(part.errorText) ?? 'The tool failed.';
		return {
			summary: 'Something went wrong.',
			compactSummary: `${title} failed`,
			detailJson: detailJson({ status: 'Failed', error: errorText }),
			errorText
		};
	}
	if (phase === 'denied') {
		const reason =
			part.approval && typeof part.approval === 'object' && part.approval !== null
				? (part.approval as { reason?: string }).reason
				: undefined;
		const safeReason = textValue(reason) ?? 'The action was not applied.';
		return {
			summary: `Not applied: ${safeReason}`,
			compactSummary: `${title} not run`,
			detailJson: detailJson({ status: 'Not run', reason: safeReason })
		};
	}
	const meta = WORKSPACE_TOOL_META[toolName];
	if (meta) {
		if (phase === 'running') {
			return {
				summary: meta.running,
				compactSummary: meta.running,
				detailJson: detailJson({ status: 'Running', action: title })
			};
		}
		return summarizeWorkspaceTool(toolName, input, part.output);
	}
	if (phase === 'running') {
		return {
			summary: `Running ${title}…`,
			compactSummary: `Running ${title}…`,
			detailJson: detailJson({ status: 'Running', action: title })
		};
	}

	const output = asRecord(part.output);
	const details = externalToolDetails(title, input, output);
	const failed = details.status === 'Failed';
	return {
		summary: failed ? 'Failed.' : 'Completed successfully.',
		compactSummary: failed ? `${title} failed` : `${title} · Completed successfully`,
		detailJson: detailJson(details)
	};
}

function summarizeWorkspaceTool(
	toolName: string,
	input: Record<string, unknown>,
	output: unknown
): ToolSummary {
	const out = output && typeof output === 'object' ? (output as Record<string, unknown>) : {};
	const title = typeof out.title === 'string' ? out.title : '';
	const name = typeof out.name === 'string' ? out.name : '';
	const artifacts = Array.isArray(out.artifacts) ? out.artifacts : null;
	const results = Array.isArray(out.results) ? out.results : null;
	const artifactId = typeof out.artifactId === 'string' ? out.artifactId : '';
	const versionNumber = typeof out.versionNumber === 'number' ? out.versionNumber : null;
	const artifactType = textValue(out.type ?? out.artifactType, 80);
	const requiresUserConfirmation = out.requiresUserConfirmation === true;

	switch (toolName) {
		case 'tavilySearch': {
			const sourceCount = results?.length ?? 0;
			const sources = sourceViewsFromResults(results);
			return {
				summary: `Found ${countLabel(sourceCount, 'source')}.`,
				compactSummary: `Searched the web · ${countLabel(sourceCount, 'source')}`,
				detailJson: detailJson({
					query: textValue(input.query) ?? '',
					searchDepth: textValue(input.searchDepth) ?? 'basic',
					resultCount: sourceCount,
					sources: sourceDetails(sources)
				}),
				...(sources.length > 0 ? { sources } : {})
			};
		}
		case 'tavilyExtract': {
			const extractedSources = sourceViewsFromResults(results);
			const sources =
				extractedSources.length > 0 ? extractedSources : sourceViewsFromUrls(input.urls);
			const pageCount = extractedSources.length > 0 ? extractedSources.length : sources.length;
			return {
				summary: `Read ${countLabel(pageCount, 'page')}.`,
				compactSummary: `Read ${countLabel(pageCount, 'page')}`,
				detailJson: detailJson({
					requestedUrls: Array.isArray(input.urls)
						? input.urls.map(validHttpUrl).filter((url): url is string => Boolean(url))
						: [],
					extractDepth: textValue(input.extractDepth) ?? 'basic',
					pageCount,
					sources: sourceDetails(sources)
				}),
				...(sources.length > 0 ? { sources } : {})
			};
		}
		case 'listThreadArtifacts':
		case 'listProjectArtifacts': {
			const count = artifacts?.length ?? 0;
			return {
				summary: `Found ${countLabel(count, 'artifact')}.`,
				compactSummary: `${toolTitleForName(toolName)} · ${countLabel(count, 'artifact')} found`,
				detailJson: detailJson({ status: 'Completed', resultCount: count })
			};
		}
		case 'searchArtifacts': {
			const count = artifacts?.length ?? 0;
			return {
				summary: `Found ${countLabel(count, 'artifact')}.`,
				compactSummary: `Searched artifacts · ${countLabel(count, 'artifact')} found`,
				detailJson: detailJson({
					query: textValue(input.query) ?? '',
					projectScope: textValue(input.projectScope) ?? 'all',
					resultCount: count
				})
			};
		}
		case 'readThreadArtifact': {
			const summary = title ? `Read ${title}.` : 'Read artifact.';
			return {
				summary,
				compactSummary: trimSentence(summary),
				detailJson: detailJson({
					status: 'Completed',
					...(title ? { title } : {}),
					...(artifactType ? { artifactType } : {}),
					...(versionNumber !== null ? { version: versionNumber } : {}),
					...(typeof out.contentFormat === 'string' ? { contentFormat: out.contentFormat } : {})
				})
			};
		}
		case 'importProjectArtifactToThread': {
			const summary = title ? `Added ${title} to this chat.` : 'Added artifact to this chat.';
			return {
				summary,
				compactSummary: trimSentence(summary),
				detailJson: detailJson({
					status: 'Added to chat',
					...(title ? { title } : {}),
					...(artifactType ? { artifactType } : {}),
					...(versionNumber !== null ? { version: versionNumber } : {})
				})
			};
		}
		case 'createIdeaArtifact':
		case 'createPrdArtifact':
		case 'createVisualArtifact': {
			const artifactType =
				typeof out.type === 'string'
					? out.type
					: toolName.replace(/^create/, '').replace(/Artifact$/, '');
			const summary = title
				? `Saved ${artifactType.toLowerCase()} artifact: ${title}.`
				: `Saved ${artifactType.toLowerCase()} artifact.`;
			return {
				summary,
				compactSummary: trimSentence(summary),
				detailJson: detailJson({
					status: 'Completed',
					...(title ? { title } : {}),
					artifactType,
					...(versionNumber !== null ? { version: versionNumber } : {})
				}),
				...(artifactId
					? {
							actionLabel: 'Open artifact',
							actionArtifactId: artifactId,
							...(versionNumber !== null ? { actionVersionNumber: versionNumber } : {})
						}
					: {})
			};
		}
		case 'prepareProjectPromotion': {
			const linkedArtifactCount =
				typeof out.linkedArtifactCount === 'number' ? out.linkedArtifactCount : 0;
			const summary = name
				? `Ready to review ${name} with ${linkedArtifactCount} linked artifact${linkedArtifactCount === 1 ? '' : 's'}.`
				: 'Ready for project review.';
			return {
				summary,
				compactSummary: trimSentence(summary),
				detailJson: detailJson({
					status: 'Ready for review',
					...(name ? { name } : {}),
					linkedArtifactCount,
					requiresUserConfirmation
				}),
				...(requiresUserConfirmation ? { actionLabel: 'Review and create project' } : {})
			};
		}
		case 'updateThreadArtifact': {
			const summary = title ? `Updated ${title}.` : 'Updated artifact.';
			return {
				summary,
				compactSummary: trimSentence(summary),
				detailJson: detailJson({
					status: 'Completed',
					...(title ? { title } : {}),
					...(versionNumber !== null ? { version: versionNumber } : {})
				}),
				...(artifactId && versionNumber !== null
					? {
							actionLabel: 'View changes',
							actionArtifactId: artifactId,
							actionVersionNumber: versionNumber
						}
					: {})
			};
		}
		case 'requestUserChoice':
			return {
				summary: 'Past choice card (no longer interactive).',
				compactSummary: 'Past choice card',
				detailJson: detailJson({ status: 'No longer interactive' })
			};
		default: {
			const title = toolTitleForName(toolName);
			return {
				summary: 'Finished.',
				compactSummary: `${title} · Finished`,
				detailJson: detailJson({ status: 'Finished', action: title })
			};
		}
	}
}

export function toolPartToView(part: unknown): ToolStepView | null {
	if (!part || typeof part !== 'object') return null;
	const p = part as Record<string, unknown>;
	const toolName = parseToolName(p);
	if (!toolName) return null;

	const state = typeof p.state === 'string' ? p.state : undefined;
	const phase = phaseFromState(state);
	const toolCallId = typeof p.toolCallId === 'string' ? p.toolCallId : `tool-${toolName}`;
	const title = toolTitleForName(toolName);
	const {
		summary,
		compactSummary,
		detailJson,
		sources,
		errorText,
		actionLabel,
		actionArtifactId,
		actionVersionNumber
	} = summarizeTool(toolName, p, phase);

	return {
		id: toolCallId,
		toolName,
		title,
		phase,
		summary,
		compactSummary,
		detailJson,
		...(sources ? { sources } : {}),
		errorText,
		...(actionLabel ? { actionLabel } : {}),
		...(actionArtifactId ? { actionArtifactId } : {}),
		...(actionVersionNumber !== undefined ? { actionVersionNumber } : {})
	};
}

export function formatToolActivitySummary(tools: ToolStepView[]): string {
	if (tools.length === 0) return 'No activity';

	const runningCount = tools.filter((tool) => tool.phase === 'running').length;
	const completedCount = tools.filter((tool) => tool.phase === 'done').length;
	const failedCount = tools.filter((tool) => tool.phase === 'error').length;
	const deniedCount = tools.filter((tool) => tool.phase === 'denied').length;

	if (tools.length === 1) {
		const tool = tools[0];
		if (!tool) return 'No activity';
		if (tool.phase === 'running') return tool.compactSummary;
		if (tool.phase === 'error') return `${tool.title} failed`;
		if (tool.phase === 'denied') return `${tool.title} not run`;
		return tool.compactSummary;
	}

	if (runningCount > 0) {
		const terminalCount = completedCount + failedCount + deniedCount;
		return terminalCount > 0
			? `Working · ${terminalCount} of ${tools.length} actions`
			: `Working · ${tools.length} actions`;
	}

	if (failedCount > 0 || deniedCount > 0) {
		const problems = [
			failedCount > 0 ? `${failedCount} failed` : '',
			deniedCount > 0 ? `${deniedCount} not run` : ''
		].filter(Boolean);
		return `Completed ${completedCount} of ${tools.length} actions · ${problems.join(' · ')}`;
	}

	return `Completed ${tools.length} actions`;
}

export function toolPartToPromotionProposal(part: unknown): PromotionProposalView | null {
	if (!part || typeof part !== 'object') return null;
	const p = part as Record<string, unknown>;
	const toolName = parseToolName(p);
	if (toolName !== 'prepareProjectPromotion') return null;
	if (p.state !== 'output-available') return null;

	const output =
		p.output && typeof p.output === 'object' ? (p.output as Record<string, unknown>) : {};
	if (output.requiresUserConfirmation !== true) return null;

	const name = typeof output.name === 'string' ? output.name.trim() : '';
	if (!name) return null;

	const summary = typeof output.summary === 'string' ? output.summary.trim() : '';
	const strengths = Array.isArray(output.strengths)
		? output.strengths.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
		: [];
	const missingInformation = Array.isArray(output.missingInformation)
		? output.missingInformation
				.map((item) => (typeof item === 'string' ? item.trim() : ''))
				.filter(Boolean)
		: [];
	const linkedArtifactCount =
		typeof output.linkedArtifactCount === 'number' ? output.linkedArtifactCount : 0;
	const toolCallId = typeof p.toolCallId === 'string' ? p.toolCallId : `promotion-${name}`;

	return {
		id: toolCallId,
		name,
		...(summary ? { summary } : {}),
		strengths,
		missingInformation,
		linkedArtifactCount
	};
}

function isToolLikePart(part: { type?: unknown }): boolean {
	const t = part.type;
	if (typeof t !== 'string') return false;
	return t.startsWith('tool-') || t === 'dynamic-tool';
}

/** Tool and promotion segments from assistant message parts (OpenUI text is handled separately). */
export function buildAssistantSegments(message: UIMessage): AssistantSegment[] {
	if (message.role !== 'assistant') return [];

	const out: AssistantSegment[] = [];

	const appendTool = (step: ToolStepView) => {
		const last = out[out.length - 1];
		if (last?.kind === 'tools') {
			last.tools.push(step);
		} else {
			out.push({ kind: 'tools', tools: [step] });
		}
	};

	for (const part of message.parts) {
		if (!part || typeof part !== 'object') continue;
		const typed = part as { type?: string };

		if (isToolLikePart(typed)) {
			const promotionProposal = toolPartToPromotionProposal(part);
			if (promotionProposal) {
				out.push({ kind: 'promotionProposal', proposal: promotionProposal });
			}
			const view = toolPartToView(part);
			if (view) appendTool(view);
		}
	}

	return out;
}

export function assistantSegmentsHaveContent(segments: AssistantSegment[]): boolean {
	for (const seg of segments) {
		if (seg.kind === 'tools' && seg.tools.length > 0) return true;
		if (seg.kind === 'promotionProposal') return true;
	}
	return false;
}
