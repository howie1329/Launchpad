<script lang="ts">
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { page } from '$app/stores'
	import { auth, getConvexClient } from '$lib/auth.svelte'
	import { createArtifactMutation, listThreadArtifactsQuery } from '$lib/artifacts'
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
	import FileTextIcon from '@lucide/svelte/icons/file-text'
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle'
	import MessageSquareTextIcon from '@lucide/svelte/icons/message-square-text'
	import SearchIcon from '@lucide/svelte/icons/search'
	import XIcon from '@lucide/svelte/icons/x'
	import { useQuery } from 'convex-svelte'
	import type { Id } from '../../../convex/_generated/dataModel'

	type MockMessage = {
		id: string
		role: 'user' | 'assistant'
		content: string
	}

	type ThreadArtifact = {
		title: string
		type: string
		status: string
		description: string
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

	const mockThreadArtifacts: ThreadArtifact[] = [
		{
			title: 'Problem sketch',
			type: 'Loose idea',
			status: 'Created in this thread',
			description: 'Founders lose continuity between raw notes and buildable product scope.'
		},
		{
			title: 'Audience notes',
			type: 'Context',
			status: 'Referenced here',
			description: 'Solo builders and small teams turning customer pain into first-version software.'
		},
		{
			title: 'MVP constraints',
			type: 'PRD draft',
			status: 'Attached explicitly',
			description: 'Chat first, explicit context, editable PRD, no background research automation.'
		}
	]

	let composerText = $state('')
	let textareaRef = $state<HTMLTextAreaElement | null>(null)
	let messages = $state<MockMessage[]>(starterMessages)
	let modelSelectorOpen = $state(false)
	let selectedModelId = $state<IdeaAiModelId>(defaultIdeaAiModelId)
	let isAdding = $state(false)
	let isSavingIdea = $state(false)
	let artifactError = $state('')

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
	const canSaveIdea = $derived(activeThreadId !== 'demo' && !isSavingIdea)
	const threadArtifacts = useQuery(listThreadArtifactsQuery, () =>
		auth.isAuthenticated && activeThreadId && activeThreadId !== 'demo'
			? { threadId: activeThreadId as Id<'chatThreads'> }
			: 'skip'
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

	const saveThreadAsIdea = async () => {
		if (!canSaveIdea) return

		artifactError = ''
		isSavingIdea = true

		try {
			await getConvexClient().mutation(createArtifactMutation, {
				type: 'idea',
				title: createArtifactTitle(),
				contentMarkdown: createArtifactMarkdown(),
				sourceThreadId: activeThreadId as Id<'chatThreads'>,
				metadata: {
					source: 'workspace-thread'
				}
			})
		} catch (error) {
			console.error(error)
			artifactError = 'Could not save this idea. Please try again.'
		} finally {
			isSavingIdea = false
		}
	}

	const closeContextPanel = async () => {
		const projectQuery = activeProjectId ? `project=${encodeURIComponent(activeProjectId)}&` : ''

		await goto(
			resolve(
				`/workspace?${projectQuery}thread=${encodeURIComponent(activeThreadId)}` as `/workspace?${string}`
			),
			{
				noScroll: true,
				keepFocus: true
			}
		)
	}

	const artifactTypeLabel = (type: string) => {
		if (type === 'prd') return 'PRD'
		if (type === 'idea') return 'Idea'
		if (type === 'research') return 'Research'
		if (type === 'markdown') return 'Markdown'
		return type
	}

	const linkReasonLabel = (reason: 'created' | 'referenced' | 'imported') => {
		if (reason === 'created') return 'Created in this thread'
		if (reason === 'referenced') return 'Referenced here'
		return 'Imported to this thread'
	}

	const artifactPreview = (contentMarkdown: string) => {
		const firstLine = contentMarkdown
			.split('\n')
			.map((line) => line.trim())
			.find(Boolean)

		if (!firstLine) return 'No content yet.'
		return firstLine.length > 140 ? `${firstLine.slice(0, 137)}...` : firstLine
	}

	const createArtifactTitle = () => {
		const firstUserMessage = messages.find((message) => message.role === 'user')?.content.trim() ?? ''
		if (!firstUserMessage) return 'Untitled idea'
		const firstLine = firstUserMessage.split('\n')[0]?.trim() ?? ''
		return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine
	}

	const createArtifactMarkdown = () =>
		messages
			.map((message) => {
				const speaker = message.role === 'user' ? 'User' : 'Assistant'
				return `## ${speaker}\n\n${message.content.trim()}`
			})
			.join('\n\n')
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
				<div class="flex shrink-0 items-start justify-between gap-3 border-b border-border/50 px-4 py-3">
					<div class="min-w-0">
						<p class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
							Thread context
						</p>
						<h2 class="mt-0.5 text-base font-semibold tracking-tight">Attached memory</h2>
						<p class="mt-1 text-xs leading-5 text-muted-foreground">
							Only artifacts created, referenced, or attached in this thread.
						</p>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						class="size-8 shrink-0"
						aria-label="Close thread context"
						onclick={closeContextPanel}
					>
						<XIcon class="size-3.5" />
					</Button>
				</div>

				<div class="min-h-0 flex-1 overflow-y-auto px-2 py-2">
					<div class="space-y-1">
						{#if activeThreadId === 'demo'}
							{#each mockThreadArtifacts as artifact (artifact.title)}
								<button
									type="button"
									class="group flex w-full gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
								>
									<div
										class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-muted-foreground group-hover:text-foreground"
									>
										{#if artifact.type === 'Context'}
											<MessageSquareTextIcon class="size-3.5" />
										{:else}
											<FileTextIcon class="size-3.5" />
										{/if}
									</div>
									<span class="min-w-0 flex-1">
										<span class="flex items-center justify-between gap-2">
											<span class="truncate text-xs font-medium tracking-tight">{artifact.title}</span>
											<span class="shrink-0 text-[10px] text-muted-foreground">{artifact.type}</span>
										</span>
										<span class="mt-1 block text-[11px] leading-4 text-muted-foreground">
											{artifact.status}
										</span>
										<span class="mt-1 block text-xs leading-5 text-foreground">
											{artifact.description}
										</span>
									</span>
								</button>
							{/each}
						{:else if threadArtifacts.data === undefined}
							<p class="px-2 py-1.5 text-xs text-muted-foreground">Loading artifacts...</p>
						{:else if threadArtifacts.data.length === 0}
							<p class="px-2 py-1.5 text-xs leading-5 text-muted-foreground">
								No artifacts attached to this thread yet.
							</p>
						{:else}
							{#each threadArtifacts.data as item (item.link._id)}
								<button
									type="button"
									class="group flex w-full gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
								>
									<div
										class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-muted-foreground group-hover:text-foreground"
									>
										<FileTextIcon class="size-3.5" />
									</div>
									<span class="min-w-0 flex-1">
										<span class="flex items-center justify-between gap-2">
											<span class="truncate text-xs font-medium tracking-tight">
												{item.artifact.title}
											</span>
											<span class="shrink-0 text-[10px] text-muted-foreground">
												{artifactTypeLabel(item.artifact.type)}
											</span>
										</span>
										<span class="mt-1 block text-[11px] leading-4 text-muted-foreground">
											{linkReasonLabel(item.link.reason)}
										</span>
										<span class="mt-1 line-clamp-2 block text-xs leading-5 text-foreground">
											{artifactPreview(item.artifact.contentMarkdown)}
										</span>
									</span>
								</button>
							{/each}
						{/if}
					</div>
				</div>

				<div class="shrink-0 border-t border-border/50 px-4 py-3">
					{#if artifactError}
						<p class="mb-2 text-xs text-destructive">{artifactError}</p>
					{/if}
					<Button
						type="button"
						variant="secondary"
						size="sm"
						class="w-full justify-center text-xs"
						disabled={!canSaveIdea}
						onclick={saveThreadAsIdea}
					>
						{isSavingIdea ? 'Saving idea...' : 'Save as idea'}
					</Button>
				</div>
			</aside>
		{/if}
	</div>
</section>
