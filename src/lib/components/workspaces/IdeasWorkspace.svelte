<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { auth, getConvexClient } from '$lib/auth.svelte';
	import {
		Conversation,
		ConversationContent,
		ConversationScrollButton
	} from '$lib/components/ai-elements/conversation';
	import {
		Message,
		MessageContent,
		MessageResponse
	} from '$lib/components/ai-elements/new-message';
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
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { defaultIdeaAiModelId, ideaAiModels, type IdeaAiModelId } from '$lib/idea-ai-models';
	import {
		createIdeaWithInitialMessageMutation,
		getIdeaQuery,
		listIdeaMessagesQuery,
		saveIdeaMessagesMutation,
		updateIdeaTitleMutation
	} from '$lib/ideas';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import BoxIcon from '@lucide/svelte/icons/box';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import SearchIcon from '@lucide/svelte/icons/search';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import TargetIcon from '@lucide/svelte/icons/target';
	import { Chat } from '@ai-sdk/svelte';
	import { DefaultChatTransport, type UIMessage } from 'ai';
	import { useQuery } from 'convex-svelte';

	type Props = {
		showActions?: boolean;
		selectedIdeaId?: string | null;
		startInitialResponse?: boolean;
	};

	let { showActions = true, selectedIdeaId = null, startInitialResponse = false }: Props = $props();

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

	let ideaText = $state('');
	let chatText = $state('');
	let textareaRef = $state<HTMLTextAreaElement | null>(null);
	let chatTextareaRef = $state<HTMLTextAreaElement | null>(null);
	let submittedText = $state('');
	let modelSelectorOpen = $state(false);
	let chatModelSelectorOpen = $state(false);
	let selectedModelId = $state<IdeaAiModelId>(defaultIdeaAiModelId);
	let landingStatus = $state<'idle' | 'saving' | 'error'>('idle');
	let landingError = $state('');
	let saveError = $state('');
	let chatError = $state('');
	let chat = $state<Chat<UIMessage> | null>(null);
	let chatKey = $state('');
	let startedIdeaId = $state<string | null>(null);
	let titleRequestedIdeaId = $state<string | null>(null);

	const selectedModel = $derived(
		ideaAiModels.find((model) => model.id === selectedModelId) ?? ideaAiModels[0]
	);
	const selectedIdea = useQuery(getIdeaQuery, () =>
		auth.isAuthenticated && selectedIdeaId ? { ideaId: selectedIdeaId } : 'skip'
	);
	const ideaMessages = useQuery(listIdeaMessagesQuery, () =>
		auth.isAuthenticated && selectedIdeaId ? { ideaId: selectedIdeaId } : 'skip'
	);
	const isChatBusy = $derived(chat?.status === 'submitted' || chat?.status === 'streaming');
	const canSubmitLanding = $derived(Boolean(ideaText.trim()) && landingStatus !== 'saving');
	const canSubmitChat = $derived(Boolean(chatText.trim()) && Boolean(chat) && !isChatBusy);

	$effect(() => {
		if (!selectedIdeaId || !ideaMessages.data) {
			chat = null;
			chatKey = '';
			startedIdeaId = null;
			titleRequestedIdeaId = null;
			return;
		}

		const nextMessages = ideaMessages.data.map((row) => row.message);
		const nextKey = `${selectedIdeaId}:${ideaMessages.data
			.map((row) => `${row.messageId}:${row.updatedAt}`)
			.join('|')}`;

		if (chatKey === nextKey || isChatBusy) return;

		chat = createChat(selectedIdeaId, nextMessages);
		chatKey = nextKey;
		chatError = '';
		saveError = '';
	});

	$effect(() => {
		if (!startInitialResponse || !selectedIdeaId || !chat || startedIdeaId === selectedIdeaId) return;
		if (!ideaMessages.data || ideaMessages.data.length !== 1) return;
		if (chat.status !== 'ready') return;

		startedIdeaId = selectedIdeaId;
		void startInitialChat(selectedIdeaId);
	});

	const focusComposer = () => {
		requestAnimationFrame(() => textareaRef?.focus());
	};

	const focusChatComposer = () => {
		requestAnimationFrame(() => chatTextareaRef?.focus());
	};

	const fillComposer = (prompt: string) => {
		ideaText = prompt;
		focusComposer();
	};

	const submitIdea = async (message: PromptInputMessage) => {
		const text = message.text.trim();
		if (!text || landingStatus === 'saving') return;

		if (!auth.isAuthenticated) {
			await goto(resolve('/auth?redirectTo=/dashboard/ideas'));
			return;
		}

		landingStatus = 'saving';
		landingError = '';
		submittedText = text;

		try {
			const result = await getConvexClient().mutation(createIdeaWithInitialMessageMutation, {
				text,
				modelId: selectedModelId
			});
			await goto(resolve(`/dashboard/ideas?idea=${encodeURIComponent(result.ideaId)}&start=1`));
		} catch (error) {
			console.error(error);
			landingStatus = 'error';
			landingError = 'Could not start this idea chat. Please try again.';
		}
	};

	const submitChatMessage = async (message: PromptInputMessage) => {
		const text = message.text.trim();
		if (!chat || !text || isChatBusy) return;

		chatError = '';
		saveError = '';

		try {
			chatText = '';
			await chat.sendMessage({ text });
		} catch (error) {
			console.error(error);
			chatText = text;
			chatError = 'Could not send this message. Please try again.';
			throw error;
		}
	};

	const selectModel = (modelId: IdeaAiModelId, focus: 'landing' | 'chat' = 'landing') => {
		selectedModelId = modelId;
		modelSelectorOpen = false;
		chatModelSelectorOpen = false;

		if (focus === 'chat') {
			focusChatComposer();
		} else {
			focusComposer();
		}
	};

	function createChat(ideaId: string, messages: UIMessage[]) {
		return new Chat<UIMessage>({
			id: ideaId,
			messages,
			transport: new DefaultChatTransport<UIMessage>({
				api: '/api/ideas/chat',
				prepareSendMessagesRequest: ({ messages }) => ({
					body: {
						ideaId,
						modelId: selectedModelId,
						messages
					}
				})
			}),
			onFinish: ({ messages, isError }) => {
				if (isError) return;
				void persistMessages(ideaId, messages);
				void maybeGenerateTitle(ideaId, messages);
			}
		});
	}

	async function startInitialChat(ideaId: string) {
		try {
			await chat?.sendMessage();
			await goto(resolve(`/dashboard/ideas?idea=${encodeURIComponent(ideaId)}`), {
				replaceState: true,
				noScroll: true,
				keepFocus: true
			});
		} catch (error) {
			console.error(error);
			chatError = 'Could not start the assistant response. Please try again.';
		}
	}

	async function persistMessages(ideaId: string, messages: UIMessage[]) {
		try {
			await getConvexClient().mutation(saveIdeaMessagesMutation, {
				ideaId,
				messages,
				modelId: selectedModelId
			});
			saveError = '';
		} catch (error) {
			console.error(error);
			saveError = 'Chat saved locally for now. Send another message to retry syncing.';
		}
	}

	async function maybeGenerateTitle(ideaId: string, messages: UIMessage[]) {
		if (titleRequestedIdeaId === ideaId || selectedIdea.data?.titleGeneratedAt) return;
		if (!messages.some((message) => message.role === 'assistant')) return;

		titleRequestedIdeaId = ideaId;

		try {
			const response = await fetch('/api/ideas/title', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ideaId, modelId: selectedModelId, messages })
			});

			if (!response.ok) return;

			const result = (await response.json()) as { title?: string };
			if (!result.title) return;

			await getConvexClient().mutation(updateIdeaTitleMutation, {
				ideaId,
				title: result.title,
				modelId: selectedModelId
			});
		} catch (error) {
			console.error(error);
		}
	}

	function messageText(message: UIMessage) {
		return message.parts
			.filter((part) => part.type === 'text')
			.map((part) => part.text)
			.join('\n')
			.trim();
	}
</script>

{#if selectedIdeaId}
	<section class="flex h-full min-h-0 flex-col bg-background text-foreground">
		<header class="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-3 sm:px-6">
			<div class="min-w-0">
				<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Idea chat</p>
				{#if selectedIdea.data === undefined}
					<Skeleton class="mt-2 h-5 w-48" />
				{:else if selectedIdea.data}
					<h1 class="truncate text-base font-semibold tracking-tight sm:text-lg">
						{selectedIdea.data.title}
					</h1>
				{:else}
					<h1 class="text-base font-semibold tracking-tight sm:text-lg">Idea not found</h1>
				{/if}
			</div>
			<Button href={resolve('/dashboard/ideas')} variant="ghost" size="sm">New idea</Button>
		</header>

		{#if selectedIdea.data === undefined || ideaMessages.data === undefined}
			<div class="flex flex-1 items-center justify-center px-4">
				<div class="w-full max-w-2xl space-y-4">
					<Skeleton class="h-20 w-4/5 rounded-2xl" />
					<Skeleton class="ml-auto h-16 w-3/5 rounded-2xl" />
					<Skeleton class="h-24 w-5/6 rounded-2xl" />
				</div>
			</div>
		{:else if !selectedIdea.data}
			<div class="flex flex-1 items-center justify-center px-4 text-center">
				<div>
					<p class="text-sm font-semibold tracking-tight">This idea is not available.</p>
					<p class="mt-2 text-xs text-muted-foreground">It may have been removed or belongs to another workspace.</p>
				</div>
			</div>
		{:else}
			<Conversation class="min-h-0 flex-1">
				<ConversationContent class="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
					{#if chat}
						{#each chat.messages as message (message.id)}
							<Message from={message.role}>
								<MessageContent>
									{#if message.role === 'assistant'}
										<MessageResponse content={messageText(message) || 'Thinking...'} />
									{:else}
										<p class="whitespace-pre-wrap leading-6">{messageText(message)}</p>
									{/if}
								</MessageContent>
							</Message>
						{/each}

						{#if chat.status === 'submitted'}
							<Message from="assistant">
								<MessageContent class="flex-row items-center gap-2 text-sm text-muted-foreground">
									<LoaderCircleIcon class="size-4 animate-spin" />
									Thinking...
								</MessageContent>
							</Message>
						{/if}
					{/if}
				</ConversationContent>
				<ConversationScrollButton />
			</Conversation>

			<div class="shrink-0 border-t border-border/60 bg-background/95 px-4 py-4 backdrop-blur sm:px-6">
				<div class="mx-auto max-w-3xl space-y-2">
					{#if chatError || saveError}
						<p class="text-xs text-destructive">{chatError || saveError}</p>
					{/if}
					<PromptInput
						class="rounded-2xl border-border/70 bg-card shadow-lg shadow-foreground/5"
						clearOnSubmit={false}
						onSubmit={submitChatMessage}
					>
						<PromptInputTextarea
							bind:ref={chatTextareaRef}
							bind:value={chatText}
							class="min-h-20 px-4 py-4 text-sm"
							placeholder="Continue shaping this idea..."
						/>
						<PromptInputToolbar class="border-t border-border/60 px-2 py-2">
							<PromptInputTools>
								<Button type="button" variant="ghost" size="sm" class="gap-1.5 text-muted-foreground">
									<SearchIcon data-icon="inline-start" />
									Tools
									<ChevronDownIcon data-icon="inline-end" />
								</Button>
								<ModelSelector bind:open={chatModelSelectorOpen}>
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
														onclick={() => selectModel(model.id, 'chat')}
													>
														<ModelSelectorName>{model.label}</ModelSelectorName>
													</ModelSelectorItem>
												{/each}
											</ModelSelectorGroup>
										</ModelSelectorList>
									</ModelSelectorContent>
								</ModelSelector>
							</PromptInputTools>
							<PromptInputSubmit class="rounded-full" disabled={!canSubmitChat}>
								{#if isChatBusy}
									<LoaderCircleIcon class="size-4 animate-spin" />
								{:else}
									<ArrowUpIcon class="size-4" />
								{/if}
							</PromptInputSubmit>
						</PromptInputToolbar>
					</PromptInput>
				</div>
			</div>
		{/if}
	</section>
{:else}
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
					</PromptInputTools>
					<PromptInputSubmit class="rounded-full" disabled={!canSubmitLanding}>
						{#if landingStatus === 'saving'}
							<LoaderCircleIcon class="size-4 animate-spin" />
						{:else}
							<ArrowUpIcon class="size-4" />
						{/if}
					</PromptInputSubmit>
				</PromptInputToolbar>
			</PromptInput>

			{#if landingError}
				<p class="w-full text-left text-xs text-destructive">{landingError}</p>
			{/if}

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
						<p class="hidden text-xs text-muted-foreground sm:block">Starting idea chat...</p>
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
					Start with a rough note. Launchpad will open a dedicated idea chat and keep the
					conversation saved in your workspace.
				</p>
			{/if}
		</div>
	</section>
{/if}
