import type { UIMessage } from 'ai';

export type ToolStepPhase = 'running' | 'done' | 'error' | 'denied';

export type ToolStepView = {
	id: string;
	toolName: string;
	title: string;
	phase: ToolStepPhase;
	summary: string;
	detailJson: string;
	errorText?: string;
	actionLabel?: string;
	actionArtifactId?: string;
	actionVersionNumber?: number;
};

export type ChoiceCardOption = {
	label: string;
	answer: string;
	description?: string;
};

export type ChoiceCardView = {
	id: string;
	question: string;
	context?: string;
	options: ChoiceCardOption[];
	customPlaceholder: string;
};

export type AssistantSegment =
	| { kind: 'text'; text: string }
	| { kind: 'tools'; tools: ToolStepView[] }
	| { kind: 'choice'; choice: ChoiceCardView };

const WORKSPACE_TOOL_TITLES: Record<string, string> = {
	listThreadArtifacts: 'List thread artifacts',
	readThreadArtifact: 'Read thread artifact',
	listProjectArtifacts: 'List project artifacts',
	importProjectArtifactToThread: 'Use project artifact',
	createIdeaArtifact: 'Save idea artifact',
	createPrdArtifact: 'Save PRD artifact',
	createProjectFromThread: 'Promote chat to project',
	updateThreadArtifact: 'Update artifact',
	requestUserChoice: 'Choose next step',
	tavilySearch: 'Search web',
	tavilyExtract: 'Read web pages'
};

const WORKSPACE_RUNNING_SUMMARIES: Record<string, string> = {
	listThreadArtifacts: 'Checking thread artifacts…',
	readThreadArtifact: 'Reading artifact…',
	listProjectArtifacts: 'Checking project artifacts…',
	importProjectArtifactToThread: 'Adding artifact to this chat…',
	createIdeaArtifact: 'Saving idea artifact…',
	createPrdArtifact: 'Saving PRD artifact…',
	createProjectFromThread: 'Promoting chat to project…',
	updateThreadArtifact: 'Updating artifact…',
	requestUserChoice: 'Preparing choices…',
	tavilySearch: 'Searching the web…',
	tavilyExtract: 'Reading source pages…'
};

function toolTitleForName(toolName: string): string {
	if (WORKSPACE_TOOL_TITLES[toolName]) return WORKSPACE_TOOL_TITLES[toolName];
	return toolName
		.replace(/([A-Z])/g, ' $1')
		.replace(/^./, (s) => s.toUpperCase())
		.trim();
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

function summarizeTool(
	toolName: string,
	part: Record<string, unknown>,
	phase: ToolStepPhase
): {
	summary: string;
	detailJson: string;
	errorText?: string;
	actionLabel?: string;
	actionArtifactId?: string;
	actionVersionNumber?: number;
} {
	if (phase === 'error' && typeof part.errorText === 'string') {
		return {
			summary: 'Something went wrong.',
			detailJson: JSON.stringify({ input: part.input, errorText: part.errorText }, null, 2),
			errorText: part.errorText
		};
	}
	if (phase === 'denied') {
		const reason =
			part.approval && typeof part.approval === 'object' && part.approval !== null
				? (part.approval as { reason?: string }).reason
				: undefined;
		return {
			summary: reason ? `Not applied: ${reason}` : 'Update was not applied.',
			detailJson: JSON.stringify(part, null, 2)
		};
	}
	if (WORKSPACE_TOOL_TITLES[toolName]) {
		if (phase === 'running') {
			return {
				summary: WORKSPACE_RUNNING_SUMMARIES[toolName] ?? 'Running…',
				detailJson: JSON.stringify({ input: part.input }, null, 2)
			};
		}
		return summarizeWorkspaceTool(toolName, part.output);
	}
	if (phase === 'running') {
		return {
			summary: 'Running…',
			detailJson: JSON.stringify({ input: part.input }, null, 2)
		};
	}
	return {
		summary: 'Finished.',
		detailJson: JSON.stringify(part.output ?? {}, null, 2)
	};
}

function summarizeWorkspaceTool(
	toolName: string,
	output: unknown
): {
	summary: string;
	detailJson: string;
	actionLabel?: string;
	actionArtifactId?: string;
	actionVersionNumber?: number;
} {
	const detailJson = JSON.stringify(output ?? {}, null, 2);
	const out = output && typeof output === 'object' ? (output as Record<string, unknown>) : {};
	const title = typeof out.title === 'string' ? out.title : '';
	const name = typeof out.name === 'string' ? out.name : '';
	const artifacts = Array.isArray(out.artifacts) ? out.artifacts : null;
	const results = Array.isArray(out.results) ? out.results : null;
	const artifactId = typeof out.artifactId === 'string' ? out.artifactId : '';
	const versionNumber = typeof out.versionNumber === 'number' ? out.versionNumber : null;

	switch (toolName) {
		case 'tavilySearch':
			return {
				summary: `Found ${results?.length ?? 0} source${results?.length === 1 ? '' : 's'}.`,
				detailJson
			};
		case 'tavilyExtract':
			return {
				summary: `Read ${results?.length ?? 0} page${results?.length === 1 ? '' : 's'}.`,
				detailJson
			};
		case 'listThreadArtifacts':
		case 'listProjectArtifacts':
			return {
				summary: `Found ${artifacts?.length ?? 0} artifact${artifacts?.length === 1 ? '' : 's'}.`,
				detailJson
			};
		case 'readThreadArtifact':
			return { summary: title ? `Read ${title}.` : 'Read artifact.', detailJson };
		case 'importProjectArtifactToThread':
			return {
				summary: title ? `Added ${title} to this chat.` : 'Added artifact to this chat.',
				detailJson
			};
		case 'createIdeaArtifact':
			return {
				summary: title ? `Saved idea artifact: ${title}` : 'Saved idea artifact.',
				detailJson
			};
		case 'createPrdArtifact':
			return {
				summary: title ? `Saved PRD artifact: ${title}` : 'Saved PRD artifact.',
				detailJson
			};
		case 'createProjectFromThread': {
			const linkedArtifactCount =
				typeof out.linkedArtifactCount === 'number' ? out.linkedArtifactCount : 0;
			return {
				summary: name
					? `Promoted this chat to ${name} with ${linkedArtifactCount} linked artifact${linkedArtifactCount === 1 ? '' : 's'}.`
					: 'Promoted chat to project.',
				detailJson
			};
		}
		case 'updateThreadArtifact':
			return {
				summary: title ? `Updated ${title}.` : 'Updated artifact.',
				detailJson,
				...(artifactId && versionNumber !== null
					? {
							actionLabel: 'View changes',
							actionArtifactId: artifactId,
							actionVersionNumber: versionNumber
						}
					: {})
			};
		case 'requestUserChoice': {
			const question = typeof out.question === 'string' ? out.question : '';
			return { summary: question || 'Asked for a choice.', detailJson };
		}
		default:
			return { summary: 'Finished.', detailJson };
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
	const { summary, detailJson, errorText, actionLabel, actionArtifactId, actionVersionNumber } =
		summarizeTool(toolName, p, phase);

	return {
		id: toolCallId,
		toolName,
		title,
		phase,
		summary,
		detailJson,
		errorText,
		...(actionLabel ? { actionLabel } : {}),
		...(actionArtifactId ? { actionArtifactId } : {}),
		...(actionVersionNumber !== undefined ? { actionVersionNumber } : {})
	};
}

export function toolPartToChoiceCard(part: unknown): ChoiceCardView | null {
	if (!part || typeof part !== 'object') return null;
	const p = part as Record<string, unknown>;
	const toolName = parseToolName(p);
	if (toolName !== 'requestUserChoice') return null;
	if (p.state !== 'output-available') return null;

	const output =
		p.output && typeof p.output === 'object' ? (p.output as Record<string, unknown>) : {};
	const question = typeof output.question === 'string' ? output.question.trim() : '';
	const options = Array.isArray(output.options)
		? output.options
				.map((raw): ChoiceCardOption | null => {
					if (!raw || typeof raw !== 'object') return null;
					const option = raw as Record<string, unknown>;
					const label = typeof option.label === 'string' ? option.label.trim() : '';
					const answer = typeof option.answer === 'string' ? option.answer.trim() : '';
					const description =
						typeof option.description === 'string' ? option.description.trim() : '';
					if (!label || !answer) return null;
					return {
						label,
						answer,
						...(description ? { description } : {})
					};
				})
				.filter((option): option is ChoiceCardOption => option !== null)
		: [];

	if (!question || options.length < 2) return null;

	const toolCallId = typeof p.toolCallId === 'string' ? p.toolCallId : `choice-${question}`;
	const context = typeof output.context === 'string' ? output.context.trim() : '';
	const customPlaceholder =
		typeof output.customPlaceholder === 'string' && output.customPlaceholder.trim()
			? output.customPlaceholder.trim()
			: 'Write a custom answer...';

	return {
		id: toolCallId,
		question,
		...(context ? { context } : {}),
		options,
		customPlaceholder
	};
}

function isToolLikePart(part: { type?: unknown }): boolean {
	const t = part.type;
	if (typeof t !== 'string') return false;
	return t.startsWith('tool-') || t === 'dynamic-tool';
}

function flushTextBuffer(buf: string[]): string | null {
	const text = buf.join('').trim();
	buf.length = 0;
	return text.length ? text : null;
}

/** Ordered segments: merged text runs, grouped consecutive tool invocations. */
export function buildAssistantSegments(message: UIMessage): AssistantSegment[] {
	if (message.role !== 'assistant') return [];

	const out: AssistantSegment[] = [];
	const textBuf: string[] = [];

	const pushText = (text: string) => {
		out.push({ kind: 'text', text });
	};

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
		const typed = part as { type?: string; text?: string };

		if (typed.type === 'text' && typeof typed.text === 'string') {
			textBuf.push(typed.text);
			continue;
		}

		if (isToolLikePart(typed)) {
			const flushed = flushTextBuffer(textBuf);
			if (flushed) pushText(flushed);
			const choice = toolPartToChoiceCard(part);
			if (choice) {
				out.push({ kind: 'choice', choice });
				continue;
			}
			const view = toolPartToView(part);
			if (view) appendTool(view);
			continue;
		}
	}

	const tail = flushTextBuffer(textBuf);
	if (tail) pushText(tail);

	return out;
}

export function assistantSegmentsHaveContent(segments: AssistantSegment[]): boolean {
	for (const seg of segments) {
		if (seg.kind === 'text' && seg.text.trim()) return true;
		if (seg.kind === 'tools' && seg.tools.length > 0) return true;
		if (seg.kind === 'choice') return true;
	}
	return false;
}
