<script lang="ts">
	import { page } from '$app/stores'
	import { auth } from '$lib/auth.svelte'
	import { listThreadArtifactsQuery } from '$lib/artifacts'
	import { formatArtifactCreatedAt } from '$lib/artifact-display'
	import {
		Context,
		ContextContent,
		ContextContentBody,
		ContextContentFooter,
		ContextContentHeader,
		ContextInputUsage,
		ContextTrigger
	} from '$lib/components/ai-elements/context'
	import {
		Conversation,
		ConversationContent,
		ConversationScrollButton
	} from '$lib/components/ai-elements/conversation'
	import {
		Message,
		MessageContent,
		MessageResponse
	} from '$lib/components/ai-elements/new-message'
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
	} from '$lib/components/ai-elements/model-selector'
	import {
		PromptInput,
		PromptInputSubmit,
		PromptInputTextarea,
		PromptInputToolbar,
		PromptInputTools,
		type PromptInputMessage
	} from '$lib/components/ai-elements/prompt-input'
	import { Button } from '$lib/components/ui/button'
	import { defaultIdeaAiModelId, ideaAiModels, type IdeaAiModelId } from '$lib/idea-ai-models'
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up'
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle'
	import SearchIcon from '@lucide/svelte/icons/search'
	import { useQuery } from 'convex-svelte'
	import type { Id } from '../../../convex/_generated/dataModel'

	type MockMessage = {
		id: string
		role: 'user' | 'assistant'
		content: string
	}

	type MockArtifactRow = {
		title: string
		dateLabel: string
	}

	const starterMessages: MockMessage[] = [
		{
			id: 'm1',
			role: 'user',
			content:
				'I keep hearing from solo founders that their notes, customer quotes, and half-written PRDs are scattered everywhere. It feels like they lose the thread before they know what to build.'
		},
		{
			id: 'm2',
			role: 'assistant',
			content:
				'The sharp version: builders are not short on ideas; they are short on continuity. The first useful workflow is a chat that keeps the reasoning visible, then turns stable decisions into lightweight artifacts.\n\nI would start by separating three things: the painful moment, the artifact that captures the decision, and the next test that proves the idea is worth scoping.'
		},
		{
			id: 'm3',
			role: 'user',
			content:
				'The painful moment is probably after a customer call. They have a quote, a rough product thought, and no clean way to turn it into a buildable next step.'
		},
		{
			id: 'm4',
			role: 'assistant',
			content:
				'Good. For the MVP, keep the loop narrow:\n\n1. Drop the messy note into chat.\n2. Extract the problem, audience, and riskiest assumption.\n3. Save the thread as a loose idea only when it has signal.\n4. Generate a PRD when the builder is ready to scope.\n\nThe important design rule is that artifacts should feel like memory from the conversation, not a separate file manager.'
		}
	]

	const mockThreadArtifacts: MockArtifactRow[] = [
		{ title: 'Problem sketch', dateLabel: 'Apr 12, 2026' },
		{ title: 'Audience notes', dateLabel: 'Apr 11, 2026' },
		{ title: 'MVP constraints', dateLabel: 'Apr 10, 2026' }
	]

	let composerText = $state('')
	let textareaRef = $state<HTMLTextAreaElement | null>(null)
	let messages = $state<MockMessage[]>(starterMessages)
	let modelSelectorOpen = $state(false)
	let selectedModelId = $state<IdeaAiModelId>(defaultIdeaAiModelId)
	let isAdding = $state(false)

	const selectedModel = $derived(
		ideaAiModels.find((model) => model.id === selectedModelId) ?? ideaAiModels[0]
	)
	const contextText = $derived(
		`${messages.map((message) => message.content).join('\n')}\n${composerText}`
	)
	const estimatedInputTokens = $derived(Math.ceil(contextText.trim().length / 4))
	const canSubmit = $derived(Boolean(composerText.trim()) && !isAdding)
	const activeThreadId = $derived($page.url.searchParams.get('thread')?.trim() || 'demo')
	const activeProjectId = $derived($page.url.searchParams.get('project')?.trim() ?? '')
	const contextPanelOpen = $derived($page.url.searchParams.get('context') === '1')
	const threadArtifacts = useQuery(listThreadArtifactsQuery, () =>
		auth.isAuthenticated && activeThreadId && activeThreadId !== 'demo'
			? { threadId: activeThreadId as Id<'chatThreads'> }
			: 'skip'
	)
	const sortedThreadArtifacts = $derived(
		threadArtifacts.data
			? [...threadArtifacts.data].sort(
					(a, b) => b.artifact.createdAt - a.artifact.createdAt
				)
			: []
	)

	const focusComposer = () => {
		requestAnimationFrame(() => textareaRef?.focus())
	}

	const selectModel = (modelId: IdeaAiModelId) => {
		selectedModelId = modelId
		modelSelectorOpen = false
		focusComposer()
	}

	const submitMessage = async (message: PromptInputMessage) => {
		const text = message.text.trim()
		if (!text || isAdding) return

		isAdding = true
		messages = [
			...messages,
			{
				id: `local-${Date.now()}`,
				role: 'user',
				content: text
			}
		]
		composerText = ''
		isAdding = false
	}

</script>

<section class="flex h-full min-h-0 flex-col bg-background text-foreground">
	<div class="flex min-h-0 flex-1 flex-col lg:flex-row">
		<div class="flex min-h-0 min-w-0 flex-1 flex-col">
			<Conversation class="min-h-0 flex-1">
				<ConversationContent
					class="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-5 sm:px-6"
				>
					{#each messages as message (message.id)}
						<Message from={message.role}>
							<MessageContent>
								{#if message.role === 'assistant'}
									<MessageResponse content={message.content} class="text-xs leading-relaxed" />
								{:else}
									<p class="text-xs leading-5 whitespace-pre-wrap">{message.content}</p>
								{/if}
							</MessageContent>
						</Message>
					{/each}

					{#if isAdding}
						<Message from="assistant">
							<MessageContent class="flex-row items-center gap-2 text-xs text-muted-foreground">
								<LoaderCircleIcon class="size-3.5 animate-spin" />
								Adding note...
							</MessageContent>
						</Message>
					{/if}
				</ConversationContent>
				<ConversationScrollButton />
			</Conversation>

			<div class="shrink-0 bg-background px-4 py-4 sm:px-6">
				<div class="mx-auto max-w-3xl space-y-3">
					<PromptInput
						class="rounded-lg border-border/70 bg-background shadow-none"
						clearOnSubmit={false}
						onSubmit={submitMessage}
					>
						<PromptInputTextarea
							bind:ref={textareaRef}
							bind:value={composerText}
							class="min-h-20 px-4 py-4 text-sm"
							placeholder="Continue shaping this thread..."
						/>
						<PromptInputToolbar class="px-2 py-1">
							<PromptInputTools>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									class="gap-1.5 text-muted-foreground"
								>
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
								<Context
									usedTokens={estimatedInputTokens}
									maxTokens={selectedModel.maxContextTokens}
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

					<p class="text-[11px] leading-4 text-muted-foreground">
						Mock thread only. Messages stay local until real workspace threads are wired.
					</p>
				</div>
			</div>
		</div>

		{#if contextPanelOpen}
			<aside
				class="flex max-h-[min(44vh,25rem)] min-h-0 w-full shrink-0 flex-col border-t border-border/50 bg-background lg:max-h-none lg:w-[22rem] lg:border-t-0 lg:border-l"
				aria-label="Thread context"
			>
				<div class="min-h-0 flex-1 overflow-y-auto px-2 py-2">
					<div class="space-y-1">
						{#if activeThreadId === 'demo'}
							{#each mockThreadArtifacts as artifact (artifact.title)}
								<button
									type="button"
									class="flex w-full flex-col gap-0.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
								>
									<span class="truncate text-xs font-medium tracking-tight">{artifact.title}</span>
									<span class="text-[11px] text-muted-foreground">{artifact.dateLabel}</span>
								</button>
							{/each}
						{:else if threadArtifacts.data === undefined}
							<p class="px-2 py-1.5 text-xs text-muted-foreground">Loading artifacts...</p>
						{:else if threadArtifacts.data.length === 0}
							<p class="px-2 py-1.5 text-xs leading-5 text-muted-foreground">
								No artifacts attached to this thread yet.
							</p>
						{:else}
							{#each sortedThreadArtifacts as item (item.link._id)}
								<button
									type="button"
									class="flex w-full flex-col gap-0.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
								>
									<span class="truncate text-xs font-medium tracking-tight">
										{item.artifact.title}
									</span>
									<span class="text-[11px] text-muted-foreground">
										{formatArtifactCreatedAt(item.artifact.createdAt)}
									</span>
								</button>
							{/each}
						{/if}
					</div>
				</div>
			</aside>
		{/if}
	</div>
</section>
