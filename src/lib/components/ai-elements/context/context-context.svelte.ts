import { getContext, setContext } from "svelte";

export const PERCENT_MAX = 100;
export const ICON_RADIUS = 10;
export const ICON_VIEWBOX = 24;
export const ICON_CENTER = 12;
export const ICON_STROKE_WIDTH = 2;
const TOKENS_PER_MILLION = 1_000_000;

const modelCostsPerMillionTokens: Record<
	string,
	{ input: number; output: number; reasoning?: number; cacheRead?: number }
> = {
	'openai/gpt-5.4-nano': { input: 0.2, output: 1.25, cacheRead: 0.02 },
	'openai/gpt-5.4-mini': { input: 0.75, output: 4.5, cacheRead: 0.075 },
	'openai/gpt-5.4': { input: 2.5, output: 15, cacheRead: 0.25 },
};

export type LanguageModelUsage = {
	inputTokens?: number;
	outputTokens?: number;
	reasoningTokens?: number;
	cachedInputTokens?: number;
};

export type ModelId = string;

export type ContextSchema = {
	usedTokens: number;
	maxTokens: number;
	usage?: LanguageModelUsage;
	modelId?: ModelId;
};

export class ContextClass {
	usedTokens = $state(0);
	maxTokens = $state(0);
	usage = $state<LanguageModelUsage | undefined>(undefined);
	modelId = $state<ModelId | undefined>(undefined);

	constructor(props: ContextSchema) {
		this.usedTokens = props.usedTokens;
		this.maxTokens = props.maxTokens;
		this.usage = props.usage;
		this.modelId = props.modelId;
	}

	get usedPercent() {
		return this.usedTokens / this.maxTokens;
	}

	get displayPercent() {
		return new Intl.NumberFormat("en-US", {
			style: "percent",
			maximumFractionDigits: 1,
		}).format(this.usedPercent);
	}

	get usedTokensFormatted() {
		return new Intl.NumberFormat("en-US", {
			notation: "compact",
		}).format(this.usedTokens);
	}

	get maxTokensFormatted() {
		return new Intl.NumberFormat("en-US", {
			notation: "compact",
		}).format(this.maxTokens);
	}

	get circumference() {
		return 2 * Math.PI * ICON_RADIUS;
	}

	get dashOffset() {
		return this.circumference * (1 - this.usedPercent);
	}
}

let CONTEXT_KEY = Symbol("context");

export function setContextValue(contextInstance: ContextClass) {
	setContext(CONTEXT_KEY, contextInstance);
}

export function getContextValue(): ContextClass {
	const context = getContext<ContextClass>(CONTEXT_KEY);

	if (!context) {
		throw new Error("Context components must be used within Context");
	}

	return context;
}

// Mock function for tokenlens - you'll need to install the actual package
export function estimateCost(params: {
	modelId: string;
	usage: {
		input?: number;
		output?: number;
		reasoningTokens?: number;
		cacheReads?: number;
	};
}) {
	const cost = modelCostsPerMillionTokens[params.modelId];
	if (!cost) return { totalUSD: 0 };

	const inputCost = ((params.usage.input || 0) / TOKENS_PER_MILLION) * cost.input;
	const outputCost = ((params.usage.output || 0) / TOKENS_PER_MILLION) * cost.output;
	const reasoningCost =
		((params.usage.reasoningTokens || 0) / TOKENS_PER_MILLION) * (cost.reasoning ?? cost.output);
	const cacheCost =
		((params.usage.cacheReads || 0) / TOKENS_PER_MILLION) * (cost.cacheRead ?? cost.input);

	return {
		totalUSD: inputCost + outputCost + reasoningCost + cacheCost,
	};
}
