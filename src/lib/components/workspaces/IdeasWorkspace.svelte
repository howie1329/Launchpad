<script lang="ts">
	import {
		PromptInput,
		PromptInputSubmit,
		PromptInputTextarea,
		PromptInputToolbar,
		PromptInputTools,
		type PromptInputMessage
	} from '$lib/components/ai-elements/prompt-input';
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
	import { Suggestion, Suggestions } from '$lib/components/ai-elements/suggestion';
	import { Button } from '$lib/components/ui/button';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import BoxIcon from '@lucide/svelte/icons/box';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
	import SearchIcon from '@lucide/svelte/icons/search';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import TargetIcon from '@lucide/svelte/icons/target';

	let { showActions = true }: { showActions?: boolean } = $props();

	const tools = [
		{
			label: 'Ask next question',
			prompt: 'Ask me the next best question to sharpen this idea.'
		},
		{
			label: 'Score idea',
			prompt: 'Score this idea by pain, urgency, monetization, distribution, and build effort.'
		},
		{
			label: 'Find similar',
			prompt: 'Find similar ideas I may have already captured and explain the overlap.'
		},
		{
			label: 'Make PRD',
			prompt: 'Turn this idea into a focused first-version PRD.'
		},
		{
			label: 'Scope MVP',
			prompt: 'Reduce this idea to the smallest useful MVP scope.'
		}
	] as const;

	const examples = [
		{
			title: 'Capture a raw idea',
			description: 'Turn a messy thought into a clearer problem',
			prompt:
				'I keep noticing a messy workflow that might be a product idea. Help me turn the rough thought into a clear problem and audience.',
			icon: BoxIcon
		},
		{
			title: 'Validate the pain',
			description: 'Find the riskiest assumption to test first',
			prompt:
				'I have an idea, but I am not sure if the pain is real. Help me find the riskiest assumption and the fastest validation path.',
			icon: TargetIcon
		},
		{
			title: 'Draft a PRD',
			description: 'Shape a promising idea into buildable scope',
			prompt:
				'This idea feels promising. Help me shape it into a practical first-version PRD with clear must-haves and non-goals.',
			icon: ClipboardListIcon
		}
	] as const;

	const models = [
		{ id: 'gpt-5.4-nano', label: 'GPT-5.4 Nano' },
		{ id: 'gpt-5.4-mini', label: 'GPT-5.4 Mini' },
		{ id: 'gpt-5.4', label: 'GPT-5.4' }
	] as const;

	let ideaText = $state('');
	let textareaRef = $state<HTMLTextAreaElement | null>(null);
	let submittedText = $state('');
	let modelSelectorOpen = $state(false);
	let selectedModelId = $state<(typeof models)[number]['id']>('gpt-5.4-nano');

	const selectedModel = $derived(models.find((model) => model.id === selectedModelId) ?? models[0]);

	const focusComposer = () => {
		requestAnimationFrame(() => textareaRef?.focus());
	};

	const fillComposer = (prompt: string) => {
		ideaText = prompt;
		focusComposer();
	};

	const submitIdea = (message: PromptInputMessage) => {
		submittedText = message.text.trim();
	};

	const selectModel = (modelId: (typeof models)[number]['id']) => {
		selectedModelId = modelId;
		modelSelectorOpen = false;
		focusComposer();
	};
</script>

<section
	class="relative flex h-full min-h-0 items-center overflow-y-auto bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8"
>
	<div
		class="pointer-events-none absolute inset-x-0 top-0 h-64 bg-radial-[ellipse_at_top] from-muted/70 via-background to-background"
	></div>

	<div class="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-5">
		<div class="flex flex-col items-center text-center">
			<div
				class="mb-5 flex size-12 items-center justify-center rounded-full border border-border/70 bg-background shadow-sm"
				aria-hidden="true"
			>
				<SparklesIcon class="size-5 text-muted-foreground" />
			</div>
			<p class="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
				Idea workspace
			</p>
			<h1 class="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
				What idea are you thinking about?
			</h1>
			<p class="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
				Dump a rough thought. Launchpad will help shape it into something clear.
			</p>
		</div>

		<PromptInput
			class="w-full rounded-2xl border-border/70 bg-card shadow-lg shadow-foreground/5"
			clearOnSubmit={false}
			onSubmit={submitIdea}
		>
			<PromptInputTextarea
				bind:ref={textareaRef}
				bind:value={ideaText}
				class="min-h-28 px-4 py-4 text-sm sm:min-h-32"
				placeholder="Paste a thought, rant, tweet, customer quote, or half-formed idea..."
			/>
			<PromptInputToolbar class="border-t border-border/60 px-2 py-2">
				<PromptInputTools>
					<Button type="button" variant="ghost" size="sm" class="gap-1.5 text-muted-foreground">
						<SearchIcon data-icon="inline-start" />
						Tools
						<ChevronDownIcon data-icon="inline-end" />
					</Button>
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
									{#each models as model (model.id)}
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
				</PromptInputTools>
				<PromptInputSubmit class="rounded-full" disabled={!ideaText.trim()}>
					<ArrowUpIcon class="size-4" />
				</PromptInputSubmit>
			</PromptInputToolbar>
		</PromptInput>

		<Suggestions class="py-1" scrollbarXClasses="hidden">
			{#each tools as tool (tool.label)}
				<Suggestion suggestion={tool.label} onclick={() => fillComposer(tool.prompt)}>
					{tool.label}
				</Suggestion>
			{/each}
		</Suggestions>

		<div class="w-full pt-2">
			<div class="mb-3 flex items-center justify-between gap-3">
				<p class="text-xs font-medium text-muted-foreground">Get started with an example</p>
				{#if submittedText}
					<p class="hidden text-xs text-muted-foreground sm:block">Draft captured locally</p>
				{/if}
			</div>

			<div class="grid gap-3 sm:grid-cols-3">
				{#each examples as example (example.title)}
					<button
						type="button"
						class="group flex min-h-32 flex-col items-start rounded-xl border border-border/70 bg-card p-4 text-left shadow-sm transition-colors hover:border-border hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						onclick={() => fillComposer(example.prompt)}
					>
						<example.icon
							class="mb-7 size-4 text-muted-foreground transition-colors group-hover:text-foreground"
						/>
						<span class="text-sm font-semibold tracking-tight">{example.title}</span>
						<span class="mt-1 text-xs leading-5 text-muted-foreground">{example.description}</span>
					</button>
				{/each}
			</div>
		</div>

		{#if showActions}
			<p class="max-w-lg text-center text-xs leading-5 text-muted-foreground">
				This first version is a visual shell. The chat tools will become active once the idea
				workflow is wired up.
			</p>
		{/if}
	</div>
</section>
