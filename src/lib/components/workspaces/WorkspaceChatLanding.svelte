<script lang="ts">
	import {
		Context,
		ContextContent,
		ContextContentBody,
		ContextContentFooter,
		ContextContentHeader,
		ContextInputUsage,
		ContextTrigger
	} from '$lib/components/ai-elements/context';
	import {
		ModelSelector,
		ModelSelectorContent,
		ModelSelectorEmpty,
		ModelSelectorGroup,
		ModelSelectorInput,
		ModelSelectorItem,
		ModelSelectorList,
		ModelSelectorName,
		ModelSelectorTrigger
	} from '$lib/components/ai-elements/model-selector';
	import {
		PromptInput,
		PromptInputSubmit,
		PromptInputTextarea,
		PromptInputToolbar,
		PromptInputTools,
		type PromptInputMessage
	} from '$lib/components/ai-elements/prompt-input';
	import { Suggestion, Suggestions } from '$lib/components/ai-elements/suggestion';
	import { defaultIdeaAiModelId, ideaAiModels, type IdeaAiModelId } from '$lib/idea-ai-models';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import type { Component } from 'svelte';

	type ChatLandingSuggestion = {
		label: string;
		prompt: string;
	};

	type ChatLandingExample = {
		title: string;
		description: string;
		prompt: string;
		icon: Component;
	};

	type SubmitPayload = {
		text: string;
		modelId: IdeaAiModelId;
	};

	type Props = {
		kicker?: string;
		title: string;
		description: string;
		placeholder: string;
		suggestions: readonly ChatLandingSuggestion[];
		examples: readonly ChatLandingExample[];
		onSubmit?: (payload: SubmitPayload) => void | Promise<void>;
	};

	let {
		kicker = 'Workspace',
		title,
		description,
		placeholder,
		suggestions,
		examples,
		onSubmit
	}: Props = $props();

	let text = $state('');
	let textareaRef = $state<HTMLTextAreaElement | null>(null);
	let modelSelectorOpen = $state(false);
	let selectedModelId = $state<IdeaAiModelId>(defaultIdeaAiModelId);
	let submitError = $state('');

	const selectedModel = $derived(
		ideaAiModels.find((model) => model.id === selectedModelId) ?? ideaAiModels[0]
	);
	const canSubmit = $derived(Boolean(text.trim()));
	const estimatedInputTokens = $derived(Math.ceil(text.trim().length / 4));
	const maxContextTokens = $derived(selectedModel.maxContextTokens);

	const focusComposer = () => {
		requestAnimationFrame(() => textareaRef?.focus());
	};

	const fillComposer = (prompt: string) => {
		text = prompt;
		submitError = '';
		focusComposer();
	};

	const selectModel = (modelId: IdeaAiModelId) => {
		selectedModelId = modelId;
		modelSelectorOpen = false;
		focusComposer();
	};

	const submitMessage = async (message: PromptInputMessage) => {
		const nextText = message.text.trim();
		if (!nextText) return;

		submitError = '';

		try {
			await onSubmit?.({ text: nextText, modelId: selectedModelId });
		} catch (error) {
			console.error(error);
			submitError = 'Could not start this chat. Please try again.';
		}
	};
</script>

<section
	class="flex h-full min-h-0 items-center overflow-y-auto bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8"
>
	<div class="mx-auto flex w-full max-w-2xl flex-col gap-4">
		<div class="text-center">
			<p class="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
				{kicker}
			</p>
			<h1 class="text-xl font-semibold tracking-tight text-balance">{title}</h1>
			<p class="mx-auto mt-2 max-w-md text-xs leading-5 text-muted-foreground">
				{description}
			</p>
		</div>

		<PromptInput
			class="w-full rounded-lg border-border/70 bg-background shadow-none"
			clearOnSubmit={false}
			onSubmit={submitMessage}
		>
			<PromptInputTextarea
				bind:ref={textareaRef}
				bind:value={text}
				class="min-h-28 px-4 py-4 text-sm sm:min-h-32"
				{placeholder}
			/>
			<PromptInputToolbar class="border-t border-border/50 px-2 py-2">
				<PromptInputTools>
					<ModelSelector bind:open={modelSelectorOpen}>
						<ModelSelectorTrigger
							class="inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						>
							{selectedModel.label}
							<ChevronDownIcon class="size-3" />
						</ModelSelectorTrigger>
						<ModelSelectorContent class="max-w-sm">
							<ModelSelectorInput placeholder="Search models..." />
							<ModelSelectorList>
								<ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
								<ModelSelectorGroup heading="Models">
									{#each ideaAiModels as model (model.id)}
										<ModelSelectorItem
											value={model.id}
											data-checked={selectedModelId === model.id}
											onclick={() => selectModel(model.id)}
										>
											<ModelSelectorName>{model.label}</ModelSelectorName>
										</ModelSelectorItem>
									{/each}
								</ModelSelectorGroup>
							</ModelSelectorList>
						</ModelSelectorContent>
					</ModelSelector>
					<Context
						usedTokens={estimatedInputTokens}
						maxTokens={maxContextTokens}
						usage={{ inputTokens: estimatedInputTokens }}
						modelId={selectedModelId}
					>
						<ContextTrigger size="sm" class="h-6 gap-1 px-2 text-xs text-muted-foreground" />
						<ContextContent align="start">
							<ContextContentHeader />
							<ContextContentBody>
								<ContextInputUsage />
							</ContextContentBody>
							<ContextContentFooter />
						</ContextContent>
					</Context>
				</PromptInputTools>
				<PromptInputSubmit class="rounded-full" disabled={!canSubmit}>
					<ArrowUpIcon class="size-4" />
				</PromptInputSubmit>
			</PromptInputToolbar>
		</PromptInput>

		{#if submitError}
			<p class="w-full text-left text-xs text-destructive">{submitError}</p>
		{/if}

		<Suggestions class="py-1" scrollbarXClasses="hidden">
			{#each suggestions as suggestion (suggestion.label)}
				<Suggestion
					suggestion={suggestion.label}
					variant="ghost"
					class="h-7 rounded-full px-3 text-xs text-muted-foreground hover:bg-accent/70 hover:text-foreground"
					onclick={() => fillComposer(suggestion.prompt)}
				>
					{suggestion.label}
				</Suggestion>
			{/each}
		</Suggestions>

		<div class="w-full pt-2">
			<div class="mb-2 flex items-center justify-between gap-3">
				<p class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
					Examples
				</p>
			</div>

			<div class="grid gap-1.5 sm:grid-cols-3">
				{#each examples as example (example.title)}
					<button
						type="button"
						class="group flex min-h-24 flex-col items-start rounded-md border border-transparent p-3 text-left transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						onclick={() => fillComposer(example.prompt)}
					>
						<example.icon
							class="mb-4 size-3.5 text-muted-foreground transition-colors group-hover:text-foreground"
						/>
						<span class="text-xs font-medium tracking-tight">{example.title}</span>
						<span class="mt-1 text-[11px] leading-4 text-muted-foreground">
							{example.description}
						</span>
					</button>
				{/each}
			</div>
		</div>
	</div>
</section>
