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
		ModelSelectorLogo,
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
	import {
		defaultIdeaAiModelId,
		getModelSelectorLogoProvider,
		ideaAiModels,
		listIdeaModelsByProvider,
		type IdeaAiModelId
	} from '$lib/idea-ai-models';
	import { ideaAiModelProviderGroups } from '$lib/idea-ai-model-selector';
	import { prefersReducedMotion } from '$lib/prefers-reduced-motion.svelte';
	import { ArrowDown01Icon, ArrowUp01Icon } from '@hugeicons/core-free-icons';
	import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/svelte';
	import { backOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';

	type ChatLandingSuggestion = {
		label: string;
		prompt: string;
	};

	type ChatLandingExample = {
		title: string;
		description: string;
		prompt: string;
		icon: IconSvgElement;
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

	const heroIn = $derived({
		y: 8,
		easing: backOut,
		delay: prefersReducedMotion.current ? 0 : 0,
		duration: prefersReducedMotion.current ? 0 : 220
	});
	const promptIn = $derived({
		y: 8,
		easing: backOut,
		delay: prefersReducedMotion.current ? 0 : 50,
		duration: prefersReducedMotion.current ? 0 : 220
	});
	const startersIn = $derived({
		y: 8,
		easing: backOut,
		delay: prefersReducedMotion.current ? 0 : 100,
		duration: prefersReducedMotion.current ? 0 : 220
	});
</script>

<section class="flex h-full min-h-0 flex-col overflow-y-auto bg-background text-foreground">
	<div class="flex flex-1 flex-col justify-center px-4 py-5 sm:px-6 lg:px-8">
		<div class="mx-auto flex w-full max-w-3xl flex-col gap-4">
			<div class="text-center" in:fly={heroIn}>
				<p class="mb-1.5 text-[11px] font-medium text-muted-foreground">{kicker}</p>
				<h1 class="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{title}</h1>
				<p class="mx-auto mt-2 max-w-lg text-xs leading-5 text-pretty text-muted-foreground">
					{description}
				</p>
			</div>

			<div class="w-full" in:fly={promptIn}>
				<PromptInput
					class="w-full overflow-hidden rounded-xl border border-border/70 bg-card shadow-none"
					clearOnSubmit={false}
					onSubmit={submitMessage}
				>
					<PromptInputTextarea
						bind:ref={textareaRef}
						bind:value={text}
						class="min-h-28 px-3.5 py-3.5 text-sm leading-6 focus-visible:ring-0 sm:min-h-32"
						{placeholder}
					/>
					<PromptInputToolbar class="flex items-center gap-2 border-t border-border/60 px-3 py-2">
						<PromptInputTools class="min-w-0 flex-1 flex-wrap gap-1.5">
							<ModelSelector bind:open={modelSelectorOpen}>
								<ModelSelectorTrigger
									class="inline-flex h-7 max-w-full min-w-0 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors [transition-duration:150ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:bg-accent/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
								>
									<ModelSelectorLogo
										provider={getModelSelectorLogoProvider(selectedModel)}
										class="size-3 shrink-0"
									/>
									<span class="truncate">{selectedModel.label}</span>
									<HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} class="size-3 shrink-0" />
								</ModelSelectorTrigger>
								<ModelSelectorContent class="w-[min(20rem,calc(100vw-2rem))] sm:max-w-sm">
									<ModelSelectorInput
										placeholder="Search models..."
										class="border-0 border-b border-border/70 bg-transparent"
									/>
									<ModelSelectorList>
										<ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
										{#each ideaAiModelProviderGroups as group (group.provider)}
											<ModelSelectorGroup heading={group.heading}>
												{#each listIdeaModelsByProvider(group.provider) as model (model.id)}
													<ModelSelectorItem
														value={model.id}
														data-checked={selectedModelId === model.id}
														onclick={() => selectModel(model.id)}
													>
														<ModelSelectorLogo provider={group.logoProvider} class="shrink-0" />
														<ModelSelectorName>{model.label}</ModelSelectorName>
													</ModelSelectorItem>
												{/each}
											</ModelSelectorGroup>
										{/each}
									</ModelSelectorList>
								</ModelSelectorContent>
							</ModelSelector>
							<Context
								usedTokens={estimatedInputTokens}
								maxTokens={maxContextTokens}
								usage={{ inputTokens: estimatedInputTokens }}
								modelId={selectedModelId}
							>
								<ContextTrigger
									size="sm"
									class="h-7 shrink-0 gap-1 rounded-md px-2 text-xs text-muted-foreground shadow-none"
								/>
								<ContextContent align="start">
									<ContextContentHeader />
									<ContextContentBody>
										<ContextInputUsage />
									</ContextContentBody>
									<ContextContentFooter />
								</ContextContent>
							</Context>
						</PromptInputTools>
						<PromptInputSubmit class="size-8 shrink-0 rounded-md shadow-none" disabled={!canSubmit}>
							<HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} class="size-4" />
						</PromptInputSubmit>
					</PromptInputToolbar>
				</PromptInput>

				<div class="min-h-6 pt-2">
					{#if submitError}
						<p class="w-full text-left text-xs text-destructive">{submitError}</p>
					{/if}
				</div>
			</div>

			<div class="w-full" in:fly={startersIn}>
				<Suggestions class="gap-1.5 py-0" scrollbarXClasses="hidden">
					{#each suggestions as suggestion (suggestion.label)}
						<Suggestion
							suggestion={suggestion.label}
							variant="ghost"
							class="h-6 px-2.5 text-[11px] text-muted-foreground hover:bg-accent/50 hover:text-foreground"
							onclick={() => fillComposer(suggestion.prompt)}
						>
							{suggestion.label}
						</Suggestion>
					{/each}
				</Suggestions>

				<div class="w-full scroll-mt-8 pt-4 pb-6 sm:pb-8">
					<div class="grid gap-1.5 sm:grid-cols-2">
						{#each examples as example (example.title)}
							<button
								type="button"
								class="group flex min-h-16 items-start gap-2 rounded-lg border border-border/60 bg-card/45 p-2.5 text-left transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
								onclick={() => fillComposer(example.prompt)}
							>
								<HugeiconsIcon
									icon={example.icon}
									strokeWidth={2}
									class="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
								/>
								<span class="min-w-0">
									<span class="block text-[11px] leading-snug font-medium tracking-tight">
										{example.title}
									</span>
									<span class="mt-0.5 block text-[10px] leading-relaxed text-muted-foreground">
										{example.description}
									</span>
								</span>
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
