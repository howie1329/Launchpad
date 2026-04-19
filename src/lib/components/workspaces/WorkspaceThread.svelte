<script lang="ts">
	import { browser } from '$app/environment'
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { page } from '$app/stores'
	import { auth, getConvexClient } from '$lib/auth.svelte'
	import { createArtifactMutation, listThreadArtifactsQuery } from '$lib/artifacts'
	import {
		artifactPreview,
		artifactTypeLabel,
		groupArtifacts,
		linkReasonLabel,
		threadArtifactDoc
	} from '$lib/artifact-display'
	import { listMessagesQuery, saveMessagesMutation } from '$lib/chat'
	import IdeaChatToolSteps from '$lib/components/idea-chat/IdeaChatToolSteps.svelte'
	import WorkspaceArtifactReader from '$lib/components/workspaces/WorkspaceArtifactReader.svelte'
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
	import { Message, MessageContent, MessageResponse } from '$lib/components/ai-elements/new-message'
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
	import { Handle, Pane, PaneGroup } from '$lib/components/ui/resizable'
	import {
		defaultIdeaAiModelId,
		ideaAiModels,
		isIdeaAiModelId,
		type IdeaAiModelId
	} from '$lib/idea-ai-models'
	import {
		assistantSegmentsHaveContent,
		buildAssistantSegments
	} from '$lib/idea-chat-assistant-parts'
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up'
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
	import FileTextIcon from '@lucide/svelte/icons/file-text'
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle'
	import SearchIcon from '@lucide/svelte/icons/search'
	import XIcon from '@lucide/svelte/icons/x'
	import { Chat } from '@ai-sdk/svelte'
	import { DefaultChatTransport, type UIMessage } from 'ai'
	import { useQuery } from 'convex-svelte'
	import type { Id } from '../../../convex/_generated/dataModel'

	let composerText = $state('')
	let textareaRef = $state<HTMLTextAreaElement | null>(null)
	let chat = $state<Chat<UIMessage> | null>(null)
	let chatKey = $state('')
	let startedThreadId = $state('')
	let modelSelectorOpen = $state(false)
	let selectedModelId = $state<IdeaAiModelId>(defaultIdeaAiModelId)
	let isSavingIdea = $state(false)
	let artifactError = $state('')
	let chatError = $state('')
	let saveError = $state('')
	let contextArtifactId = $state('')
	let lastThreadIdForContext = $state('')
	/** Matches Tailwind `lg` — used so we only mount one chat + one context split (no duplicate Conversation). */
	let mediaMinLg = $state(false)

	const activeThreadId = $derived($page.url.searchParams.get('thread')?.trim() ?? '')
	const activeProjectId = $derived($page.url.searchParams.get('project')?.trim() ?? '')
	const contextPanelOpen = $derived($page.url.searchParams.get('context') === '1')
	const startRequested = $derived($page.url.searchParams.get('start') === '1')
	const selectedModel = $derived(
		ideaAiModels.find((model) => model.id === selectedModelId) ?? ideaAiModels[0]
	)
	const threadMessages = useQuery(listMessagesQuery, () =>
		auth.isAuthenticated && activeThreadId
			? { threadId: activeThreadId as Id<'chatThreads'> }
			: 'skip'
	)
	const threadArtifacts = useQuery(listThreadArtifactsQuery, () =>
		auth.isAuthenticated && activeThreadId
			? { threadId: activeThreadId as Id<'chatThreads'> }
			: 'skip'
	)
	const groupedThreadArtifacts = $derived(
		groupArtifacts(threadArtifacts.data ?? [], threadArtifactDoc)
	)
	const selectedThreadArtifact = $derived(
		contextArtifactId
			? (threadArtifacts.data?.find((item) => item.artifact._id === contextArtifactId) ?? null)
			: null
	)
	const selectedContextArtifact = $derived(
		contextArtifactId
			? threadArtifacts.data === undefined
				? undefined
				: (selectedThreadArtifact?.artifact ?? null)
			: null
	)
	const selectedContextLinkReason = $derived(selectedThreadArtifact?.link.reason)
	const isChatBusy = $derived(chat?.status === 'submitted' || chat?.status === 'streaming')
	const canSubmit = $derived(Boolean(composerText.trim()) && Boolean(chat) && !isChatBusy)
	const canSaveIdea = $derived(Boolean(activeThreadId) && !isSavingIdea)
	const contextText = $derived(
		`${chat?.messages.map(messageText).join('\n') ?? ''}\n${composerText}`
	)
	const estimatedInputTokens = $derived(Math.ceil(contextText.trim().length / 4))

	$effect(() => {
		if (!browser) return
		const mq = window.matchMedia('(min-width: 1024px)')
		mediaMinLg = mq.matches
		const onChange = () => {
			mediaMinLg = mq.matches
		}
		mq.addEventListener('change', onChange)
		return () => mq.removeEventListener('change', onChange)
	})

	$effect(() => {
		if (activeThreadId !== lastThreadIdForContext) {
			lastThreadIdForContext = activeThreadId
			contextArtifactId = ''
		}
	})

	$effect(() => {
		if (!activeThreadId || !threadMessages.data) {
			chat = null
			chatKey = ''
			return
		}

		const savedModelId = threadMessages.data.map((row) => row.modelId).find(isIdeaAiModelId)
		const nextMessages = threadMessages.data.map((row) => row.message)
		const nextKey = `${activeThreadId}:${threadMessages.data
			.map((row) => `${row.messageId}:${row.updatedAt}`)
			.join('|')}`

		if (savedModelId) {
			selectedModelId = savedModelId
		}

		if (chatKey === nextKey || isChatBusy) return

		chat = createChat(activeThreadId, nextMessages)
		chatKey = nextKey
		chatError = ''
		saveError = ''
	})

	$effect(() => {
		if (!startRequested || !activeThreadId || !chat || startedThreadId === activeThreadId) return
		if (!threadMessages.data || threadMessages.data.length !== 1) return
		if (chat.status !== 'ready') return

		startedThreadId = activeThreadId
		void startInitialChat(activeThreadId)
	})

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
		if (!chat || !text || isChatBusy) return

		chatError = ''
		saveError = ''

		try {
			composerText = ''
			await chat.sendMessage({ text })
		} catch (error) {
			console.error(error)
			composerText = text
			chatError = buildChatErrorMessage(error)
			throw error
		}
	}

	function buildChatErrorMessage(error: unknown) {
		if (error instanceof Error) {
			try {
				const parsed = JSON.parse(error.message) as unknown
				if (parsed && typeof parsed === 'object') {
					const data = parsed as {
						error?: unknown
						capUsd?: unknown
						spentUsd?: unknown
						dateKey?: unknown
					}

					if (typeof data.error === 'string') {
						const capUsd = typeof data.capUsd === 'number' ? data.capUsd : undefined
						const spentUsd = typeof data.spentUsd === 'number' ? data.spentUsd : undefined
						const dateKey = typeof data.dateKey === 'string' ? data.dateKey : undefined

						if (capUsd !== undefined && spentUsd !== undefined) {
							const money = new Intl.NumberFormat('en-US', {
								style: 'currency',
								currency: 'USD'
							})
							const base = `${data.error} (${money.format(spentUsd)} / ${money.format(capUsd)})`
							return dateKey ? `${base} for ${dateKey}.` : `${base}.`
						}

						return data.error
					}
				}
			} catch {
				// Ignore parse failures, fall through.
			}
		}

		return 'Could not send this message. Please try again.'
	}

	const saveThreadAsIdea = async () => {
		if (!canSaveIdea || !chat) return

		artifactError = ''
		isSavingIdea = true

		try {
			await getConvexClient().mutation(createArtifactMutation, {
				type: 'idea',
				title: createArtifactTitle(chat.messages),
				contentMarkdown: createArtifactMarkdown(chat.messages),
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

	const openThreadArtifact = async (artifactId: string) => {
		if (contextPanelOpen) {
			contextArtifactId = artifactId
			return
		}

		const projectQuery = activeProjectId ? `project=${encodeURIComponent(activeProjectId)}&` : ''

		await goto(
			resolve(
				`/workspace?${projectQuery}thread=${encodeURIComponent(activeThreadId)}&context=1` as `/workspace?${string}`
			),
			{
				noScroll: true,
				keepFocus: true
			}
		)
		contextArtifactId = artifactId
	}

	const closeThreadArtifact = () => {
		contextArtifactId = ''
	}

	function createChat(threadId: string, messages: UIMessage[]) {
		return new Chat<UIMessage>({
			id: threadId,
			messages,
			transport: new DefaultChatTransport<UIMessage>({
				api: '/api/workspace/chat',
				prepareSendMessagesRequest: ({ messages }) => ({
					body: {
						threadId,
						modelId: selectedModelId,
						messages
					},
					headers: authHeaders()
				})
			}),
			onFinish: ({ messages, isError }) => {
				if (isError) return
				void persistMessages(threadId, messages)
			}
		})
	}

	async function startInitialChat(threadId: string) {
		try {
			await removeStartParam(threadId)
			await chat?.sendMessage()
		} catch (error) {
			console.error(error)
			chatError = 'Could not start the assistant response. Please try again.'
		}
	}

	async function removeStartParam(threadId: string) {
		const projectQuery = activeProjectId ? `project=${encodeURIComponent(activeProjectId)}&` : ''

		await goto(
			resolve(
				`/workspace?${projectQuery}thread=${encodeURIComponent(threadId)}` as `/workspace?${string}`
			),
			{
				replaceState: true,
				noScroll: true,
				keepFocus: true
			}
		)
	}

	async function persistMessages(threadId: string, messages: UIMessage[]) {
		try {
			await getConvexClient().mutation(saveMessagesMutation, {
				threadId: threadId as Id<'chatThreads'>,
				messages,
				modelId: selectedModelId
			})
			saveError = ''
		} catch (error) {
			console.error(error)
			saveError = 'Chat saved locally for now. Send another message to retry syncing.'
		}
	}

	function authHeaders(): Record<string, string> {
		if (!auth.token) return {}
		return { Authorization: `Bearer ${auth.token}` }
	}

	function messageText(message: UIMessage) {
		return message.parts
			.filter((part) => part.type === 'text')
			.map((part) => part.text)
			.join('\n')
			.trim()
	}

	function assistantAwaitingStreamContent(
		message: UIMessage,
		messageIndex: number,
		messages: UIMessage[]
	) {
		if (message.role !== 'assistant') return false
		if (messageIndex !== messages.length - 1) return false
		if (chat?.status !== 'submitted' && chat?.status !== 'streaming') return false
		return !assistantSegmentsHaveContent(buildAssistantSegments(message))
	}

	const createArtifactTitle = (messages: UIMessage[]) => {
		const firstUserMessage = messages.find((message) => message.role === 'user')
		const firstLine =
			messageText(firstUserMessage ?? messages[0])
				.split('\n')[0]
				?.trim() ?? ''

		if (!firstLine) return 'Untitled idea'
		return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine
	}

	const createArtifactMarkdown = (messages: UIMessage[]) =>
		messages
			.map((message) => {
				const speaker = message.role === 'user' ? 'User' : 'Assistant'
				return `## ${speaker}\n\n${messageText(message)}`
			})
			.join('\n\n')
</script>

<section class="flex h-full min-h-0 flex-col bg-background text-foreground">
	<div class="flex min-h-0 flex-1 flex-col">
		{#if threadMessages.data === undefined || !chat}
			<div class="flex flex-1 items-center justify-center px-4">
				<div class="text-center">
					<p class="text-sm font-semibold tracking-tight">Loading thread.</p>
					<p class="mt-2 text-xs leading-5 text-muted-foreground">
						Pulling the saved conversation into the workspace.
					</p>
				</div>
			</div>
		{:else}
			{#snippet threadConversation()}
				{#if chat}
					<Conversation class="min-h-0 flex-1">
						<ConversationContent
							class="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-5 sm:px-6"
						>
							{#each chat.messages as message, messageIndex (message.id)}
							<Message from={message.role}>
								<MessageContent>
									{#if message.role === 'assistant'}
										{@const segments = buildAssistantSegments(message)}
										{#if assistantSegmentsHaveContent(segments)}
											<div class="flex w-full min-w-0 flex-col gap-3">
												{#each segments as segment, segmentIndex (segmentIndex)}
													{#if segment.kind === 'text'}
														<MessageResponse
															content={segment.text}
															class="text-xs leading-relaxed"
														/>
													{:else}
														<IdeaChatToolSteps tools={segment.tools} />
													{/if}
												{/each}
											</div>
										{:else if assistantAwaitingStreamContent(message, messageIndex, chat.messages)}
											<MessageResponse
												content="Thinking..."
												class="text-xs leading-relaxed text-muted-foreground"
											/>
										{:else}
											<p class="text-xs text-muted-foreground">No response yet.</p>
										{/if}
									{:else}
										<p class="text-xs leading-5 whitespace-pre-wrap">{messageText(message)}</p>
									{/if}
								</MessageContent>
							</Message>
						{/each}

						{#if chat.status === 'submitted'}
							<Message from="assistant">
								<MessageContent class="flex-row items-center gap-2 text-xs text-muted-foreground">
									<LoaderCircleIcon class="size-3.5 animate-spin" />
									Thinking...
								</MessageContent>
							</Message>
						{/if}
						</ConversationContent>
						<ConversationScrollButton />
					</Conversation>
				{/if}
			{/snippet}

			{#snippet threadContextAside(asideClass: string)}
				<aside class="flex min-h-0 flex-col bg-background {asideClass}" aria-label="Thread context">
					{#if contextArtifactId}
						<WorkspaceArtifactReader
							artifact={selectedContextArtifact}
							linkReason={selectedContextLinkReason}
							compact
							onBack={closeThreadArtifact}
							onClose={closeContextPanel}
						/>
					{:else}
						<div
							class="flex shrink-0 items-start justify-between gap-3 border-b border-border/50 px-4 py-3"
						>
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
							{#if threadArtifacts.data === undefined}
								<p class="px-2 py-1.5 text-xs text-muted-foreground">Loading artifacts...</p>
							{:else if threadArtifacts.data.length === 0}
								<p class="px-2 py-1.5 text-xs leading-5 text-muted-foreground">
									No artifacts attached to this thread yet.
								</p>
							{:else}
								<div class="space-y-4">
									{#each groupedThreadArtifacts as group (group.key)}
										<div class="space-y-1">
											<p
												class="px-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
											>
												{group.label}
											</p>
											{#if group.artifacts.length === 0}
												<p class="px-2 py-1.5 text-xs text-muted-foreground">No artifacts yet</p>
											{:else}
												{#each group.artifacts as item (item.link._id)}
													<button
														type="button"
														class="group flex w-full gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
														onclick={() => openThreadArtifact(item.artifact._id)}
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
									{/each}
								</div>
							{/if}
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
					{/if}
				</aside>
			{/snippet}

			<div class="flex min-h-0 flex-1 flex-col">
				{#if !contextPanelOpen || !mediaMinLg}
					{#if !contextPanelOpen}
						<div class="flex min-h-0 flex-1 flex-col">
							{@render threadConversation()}
						</div>
					{:else}
						<div class="flex min-h-0 flex-1 flex-col">
							<div class="flex min-h-0 flex-1 flex-col">
								{@render threadConversation()}
							</div>
							{@render threadContextAside(
								'max-h-[min(44vh,25rem)] w-full shrink-0 border-t border-border/50'
							)}
						</div>
					{/if}
				{:else}
					<PaneGroup
						direction="horizontal"
						autoSaveId="workspace-thread-context"
						class="min-h-0 w-full flex-1 overflow-hidden"
					>
						<Pane defaultSize={72} minSize={35} class="flex min-h-0 min-w-0 flex-col">
							{@render threadConversation()}
						</Pane>
						<Handle withHandle />
						<Pane defaultSize={28} minSize={15} maxSize={50} class="flex min-h-0 min-w-0 flex-col">
							{@render threadContextAside(
								'h-full min-h-0 min-w-0 overflow-hidden border-l border-border/50'
							)}
						</Pane>
					</PaneGroup>
				{/if}
			</div>

			<div class="shrink-0 border-t border-border/50 bg-background px-4 py-4 sm:px-6">
				<div class="w-full space-y-2">
					{#if chatError || saveError}
						<p class="text-xs text-destructive">{chatError || saveError}</p>
					{/if}

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
						<PromptInputToolbar class="border-t border-border/50 px-2 py-2">
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
									<ContextTrigger
										size="sm"
										class="h-6 gap-1 px-2 text-xs text-muted-foreground"
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
							<PromptInputSubmit class="rounded-full" disabled={!canSubmit}>
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
	</div>
</section>

