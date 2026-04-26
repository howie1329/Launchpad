<script lang="ts">
	import { browser } from '$app/environment';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { auth, getConvexClient } from '$lib/auth.svelte';
	import {
		linkArtifactToThreadMutation,
		listMentionableArtifactsQuery,
		listThreadArtifactsQuery,
		type MentionableArtifact
	} from '$lib/artifacts';
	import {
		buildOutgoingUserMessageWithTokens,
		formatArtifactMentionToken,
		parseComposedUserMessage
	} from '$lib/artifact-mention-tokens';
	import { cn } from '$lib/utils';
	import { artifactTypeLabel, formatArtifactCreatedAt } from '$lib/artifact-display';
	import {
		forkThreadFromMessageMutation,
		listMessagesQuery,
		saveMessagesMutation
	} from '$lib/chat';
	import IdeaChatChoiceCard from '$lib/components/idea-chat/IdeaChatChoiceCard.svelte';
	import IdeaChatToolSteps from '$lib/components/idea-chat/IdeaChatToolSteps.svelte';
	import WorkspaceArtifactReader from '$lib/components/workspaces/WorkspaceArtifactReader.svelte';
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
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { NativeSelect, NativeSelectOption } from '$lib/components/ui/native-select';
	import { Handle, Pane, PaneGroup } from '$lib/components/ui/resizable';
	import {
		defaultIdeaAiModelId,
		getModelSelectorLogoProvider,
		ideaAiModels,
		isIdeaAiModelId,
		listIdeaModelsByProvider,
		type IdeaAiModelId
	} from '$lib/idea-ai-models';
	import { ideaAiModelProviderGroups } from '$lib/idea-ai-model-selector';
	import {
		assistantSegmentsHaveContent,
		buildAssistantSegments
	} from '$lib/idea-chat-assistant-parts';
	import WorkspaceMessageActions from '$lib/components/workspaces/WorkspaceMessageActions.svelte';
	import {
		buildAssistantMessageCopyText,
		buildUserMessageCopyText,
		truncateMessagesAfterUserMessage
	} from '$lib/workspace-chat-message-actions';
	import { consumeThreadAutoStart } from '$lib/workspace-thread-start';
	import { workspaceThreadHref, workspaceThreadViewHref } from '$lib/workspace-route-contract';
	import {
		ArrowDown01Icon,
		ArrowUp01Icon,
		Cancel01Icon,
		GlobeIcon,
		Loading03Icon
	} from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Chat } from '@ai-sdk/svelte';
	import { DefaultChatTransport, type UIMessage } from 'ai';
	import { prefersReducedMotion } from '$lib/prefers-reduced-motion.svelte';
	import { useQuery } from 'convex-svelte';
	import { tick } from 'svelte';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { backOut } from 'svelte/easing';
	import { fade, fly } from 'svelte/transition';

	let composerText = $state('');
	let textareaRef = $state<HTMLTextAreaElement | null>(null);
	let chat = $state<Chat<UIMessage> | null>(null);
	let chatKey = $state('');
	let startedThreadId = $state('');
	let modelSelectorOpen = $state(false);
	let selectedModelId = $state<IdeaAiModelId>(defaultIdeaAiModelId);
	let webSearchRequested = $state(false);
	let chatError = $state('');
	let saveError = $state('');
	let copiedMessageId = $state('');
	let copyToastClear: ReturnType<typeof setTimeout> | 0 = 0;
	let contextArtifactId = $state('');
	let lastThreadIdForContext = $state('');
	let contextSearch = $state('');
	let contextTypeFilter = $state('all');
	let contextDateSort = $state<'newest' | 'oldest'>('newest');
	/** Matches Tailwind `lg` — used so we only mount one chat + one context split (no duplicate Conversation). */
	let mediaMinLg = $state(false);

	/** @artifact mention picker (thread-linked artifacts only) */
	let mentionOpen = $state(false);
	let mentionStart = $state(0);
	let mentionFilter = $state('');
	let mentionHighlight = $state(0);
	/** Composer chips (persisted as trailing @artifact: lines on send) */
	let mentionChips = $state<Array<{ id: string; title: string }>>([]);
	let pendingAutoStartThreadId = $state('');

	const activeThreadId = $derived($page.params.threadId?.trim() ?? '');
	const contextPanelOpen = $derived($page.url.searchParams.get('context') === '1');
	const selectedModel = $derived(
		ideaAiModels.find((model) => model.id === selectedModelId) ?? ideaAiModels[0]
	);
	const threadMessages = useQuery(listMessagesQuery, () =>
		auth.isAuthenticated && activeThreadId
			? { threadId: activeThreadId as Id<'chatThreads'> }
			: 'skip'
	);
	const threadArtifacts = useQuery(listThreadArtifactsQuery, () =>
		auth.isAuthenticated && activeThreadId
			? { threadId: activeThreadId as Id<'chatThreads'> }
			: 'skip'
	);
	const mentionableArtifacts = useQuery(listMentionableArtifactsQuery, () =>
		auth.isAuthenticated && activeThreadId
			? { threadId: activeThreadId as Id<'chatThreads'> }
			: 'skip'
	);
	const sortedThreadArtifacts = $derived(
		threadArtifacts.data
			? [...threadArtifacts.data].sort((a, b) => b.artifact.createdAt - a.artifact.createdAt)
			: []
	);
	const contextArtifactTypes = $derived.by(() => {
		const types: string[] = [];
		for (const item of threadArtifacts.data ?? []) {
			const type = item.artifact.type.trim();
			if (type && !types.includes(type)) types.push(type);
		}
		return types.sort((a, b) => artifactTypeLabel(a).localeCompare(artifactTypeLabel(b)));
	});
	const filteredContextArtifacts = $derived.by(() => {
		const query = contextSearch.trim().toLowerCase();
		const rows = sortedThreadArtifacts.filter((item) => {
			const type = item.artifact.type.trim();
			const typeLabel = artifactTypeLabel(type);
			const matchesType = contextTypeFilter === 'all' || type === contextTypeFilter;
			const matchesQuery =
				!query ||
				item.artifact.title.toLowerCase().includes(query) ||
				type.toLowerCase().includes(query) ||
				typeLabel.toLowerCase().includes(query);

			return matchesType && matchesQuery;
		});

		if (contextDateSort === 'oldest') {
			return [...rows].sort((a, b) => a.artifact.createdAt - b.artifact.createdAt);
		}

		return rows;
	});
	const mentionListboxId = $derived(
		activeThreadId
			? `workspace-thread-mention-listbox-${activeThreadId}`
			: 'workspace-thread-mention-listbox'
	);

	const filteredMentionArtifacts = $derived.by(() => {
		const rows = mentionableArtifacts.data ?? [];
		const q = mentionFilter.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter((item) => item.artifact.title.toLowerCase().includes(q));
	});

	const mentionActiveOptionId = $derived.by(() => {
		if (!mentionOpen) return undefined;
		const item = filteredMentionArtifacts[mentionHighlight];
		if (!item) return undefined;
		return `workspace-mention-opt-${item.artifact._id}`;
	});

	$effect(() => {
		if (!mentionOpen) return;
		void mentionFilter;
		mentionHighlight = 0;
	});
	const selectedThreadArtifact = $derived(
		contextArtifactId
			? (threadArtifacts.data?.find((item) => item.artifact._id === contextArtifactId) ?? null)
			: null
	);
	const selectedContextArtifact = $derived(
		contextArtifactId
			? threadArtifacts.data === undefined
				? undefined
				: (selectedThreadArtifact?.artifact ?? null)
			: null
	);
	const isChatBusy = $derived(chat?.status === 'submitted' || chat?.status === 'streaming');
	const canSubmit = $derived(
		Boolean((composerText.trim() || mentionChips.length > 0) && chat && !isChatBusy)
	);
	const contextText = $derived(
		`${chat?.messages.map(messageText).join('\n') ?? ''}\n${composerText}\n${mentionChips.map((c) => formatArtifactMentionToken(c.id)).join('\n')}`
	);
	const estimatedInputTokens = $derived(Math.ceil(contextText.trim().length / 4));
	const artifactMentionPill =
		'inline-flex w-fit max-w-full items-center gap-1.5 rounded-md bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground';

	$effect(() => {
		if (!browser) return;
		const mq = window.matchMedia('(min-width: 1024px)');
		mediaMinLg = mq.matches;
		const onChange = () => {
			mediaMinLg = mq.matches;
		};
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});

	$effect(() => {
		if (activeThreadId !== lastThreadIdForContext) {
			lastThreadIdForContext = activeThreadId;
			contextArtifactId = '';
		}
	});

	$effect(() => {
		if (!activeThreadId || !threadMessages.data) {
			chat = null;
			chatKey = '';
			return;
		}

		const savedModelId = threadMessages.data.map((row) => row.modelId).find(isIdeaAiModelId);
		const nextMessages = threadMessages.data.map((row) => row.message);
		const nextKey = `${activeThreadId}:${threadMessages.data
			.map((row) => `${row.messageId}:${row.updatedAt}`)
			.join('|')}`;

		if (savedModelId) {
			selectedModelId = savedModelId;
		}

		if (chatKey === nextKey || isChatBusy) return;

		chat = createChat(activeThreadId, nextMessages);
		chatKey = nextKey;
		chatError = '';
		saveError = '';
	});

	$effect(() => {
		void activeThreadId;
		mentionChips = [];
		copiedMessageId = '';
		if (copyToastClear) {
			clearTimeout(copyToastClear);
			copyToastClear = 0;
		}
	});

	$effect(() => {
		if (!activeThreadId) {
			pendingAutoStartThreadId = '';
			return;
		}
		pendingAutoStartThreadId = consumeThreadAutoStart(activeThreadId) ? activeThreadId : '';
	});

	$effect(() => {
		if (!pendingAutoStartThreadId || !activeThreadId || !chat || startedThreadId === activeThreadId) {
			return;
		}
		if (pendingAutoStartThreadId !== activeThreadId) return;
		if (!threadMessages.data || threadMessages.data.length !== 1) return;
		if (chat.status !== 'ready') return;

		startedThreadId = activeThreadId;
		pendingAutoStartThreadId = '';
		void startInitialChat(activeThreadId);
	});

	const focusComposer = () => {
		requestAnimationFrame(() => textareaRef?.focus());
	};

	function syncMentionFromComposer(el: HTMLTextAreaElement) {
		const text = el.value;
		const cursor = el.selectionStart ?? text.length;
		const before = text.slice(0, cursor);
		const lastAt = before.lastIndexOf('@');
		if (lastAt === -1) {
			mentionOpen = false;
			return;
		}
		if (lastAt > 0) {
			const ch = text[lastAt - 1];
			if (ch && !/\s/.test(ch)) {
				mentionOpen = false;
				return;
			}
		}
		const afterAt = before.slice(lastAt + 1);
		if (afterAt.includes('\n')) {
			mentionOpen = false;
			return;
		}
		mentionStart = lastAt;
		mentionFilter = afterAt;
		mentionOpen = true;
	}

	function handleComposerInputPost(event: Event & { currentTarget: HTMLTextAreaElement }) {
		syncMentionFromComposer(event.currentTarget);
	}

	function handleComposerKeyDown(e: KeyboardEvent): boolean {
		if (!mentionOpen) return false;
		const list = filteredMentionArtifacts;
		if (e.key === 'Escape') {
			e.preventDefault();
			mentionOpen = false;
			return true;
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			mentionHighlight = Math.min(mentionHighlight + 1, Math.max(0, list.length - 1));
			return true;
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			mentionHighlight = Math.max(mentionHighlight - 1, 0);
			return true;
		}
		if (e.key === 'Enter' && !e.shiftKey && list.length > 0) {
			e.preventDefault();
			const item = list[mentionHighlight];
			if (item) void pickArtifactMention(item);
			return true;
		}
		return false;
	}

	function removeMentionChip(artifactId: string) {
		mentionChips = mentionChips.filter((c) => c.id !== artifactId);
	}

	async function pickArtifactMention(item: MentionableArtifact) {
		const el = textareaRef;
		if (!el) return;
		const text = composerText;
		const cursor = el.selectionStart ?? text.length;
		const start = mentionStart;
		const next = text.slice(0, start) + text.slice(cursor);
		composerText = next;
		if (!mentionChips.some((c) => c.id === item.artifact._id)) {
			mentionChips = [...mentionChips, { id: item.artifact._id, title: item.artifact.title }];
		}
		mentionOpen = false;
		await tick();
		el.setSelectionRange(start, start);
		el.focus();
	}

	const selectModel = (modelId: IdeaAiModelId) => {
		selectedModelId = modelId;
		modelSelectorOpen = false;
		focusComposer();
	};

	const submitMessage = async (message: PromptInputMessage) => {
		const prose = message.text.trim();
		const outgoing = buildOutgoingUserMessageWithTokens(
			prose,
			mentionChips.map((c) => c.id)
		);
		if (!chat || !outgoing || isChatBusy) return;

		chatError = '';
		saveError = '';

		const prevProse = prose;
		const prevChips = mentionChips.slice();
		const prevWebSearchRequested = webSearchRequested;

		try {
			if (activeThreadId) {
				await importMentionedArtifacts(
					activeThreadId,
					prevChips.map((c) => c.id)
				);
			}
			composerText = '';
			mentionChips = [];
			await chat.sendMessage({ text: outgoing });
			webSearchRequested = false;
		} catch (error) {
			console.error(error);
			composerText = prevProse;
			mentionChips = prevChips;
			webSearchRequested = prevWebSearchRequested;
			chatError = buildChatErrorMessage(error);
			throw error;
		}
	};

	async function submitChoiceAnswer(answer: string) {
		if (!chat || isChatBusy) return;
		const prevWebSearchRequested = webSearchRequested;
		chatError = '';
		saveError = '';
		try {
			await chat.sendMessage({ text: answer.trim() });
			webSearchRequested = false;
		} catch (error) {
			console.error(error);
			webSearchRequested = prevWebSearchRequested;
			chatError = buildChatErrorMessage(error);
			throw error;
		}
	}

	async function importMentionedArtifacts(threadId: string, artifactIds: string[]) {
		const rows = mentionableArtifacts.data ?? [];
		for (const artifactId of artifactIds) {
			const item = rows.find((row) => row.artifact._id === artifactId);
			if (!item || item.linkedToThread) continue;
			await getConvexClient().mutation(linkArtifactToThreadMutation, {
				threadId: threadId as Id<'chatThreads'>,
				artifactId: item.artifact._id,
				reason: 'imported'
			});
		}
	}

	function artifactTitleForId(artifactId: string): string {
		return (
			mentionableArtifacts.data?.find((x) => x.artifact._id === artifactId)?.artifact.title ??
			threadArtifacts.data?.find((x) => x.artifact._id === artifactId)?.artifact.title ??
			'Artifact'
		);
	}

	function buildChatErrorMessage(error: unknown) {
		if (error instanceof Error) {
			try {
				const parsed = JSON.parse(error.message) as unknown;
				if (parsed && typeof parsed === 'object') {
					const data = parsed as {
						error?: unknown;
						capUsd?: unknown;
						spentUsd?: unknown;
						dateKey?: unknown;
					};

					if (typeof data.error === 'string') {
						const capUsd = typeof data.capUsd === 'number' ? data.capUsd : undefined;
						const spentUsd = typeof data.spentUsd === 'number' ? data.spentUsd : undefined;
						const dateKey = typeof data.dateKey === 'string' ? data.dateKey : undefined;

						if (capUsd !== undefined && spentUsd !== undefined) {
							const money = new Intl.NumberFormat('en-US', {
								style: 'currency',
								currency: 'USD'
							});
							const base = `${data.error} (${money.format(spentUsd)} / ${money.format(capUsd)})`;
							return dateKey ? `${base} for ${dateKey}.` : `${base}.`;
						}

						return data.error;
					}
				}
			} catch {
				// Ignore parse failures, fall through.
			}
		}

		return 'Could not send this message. Please try again.';
	}

	const openThreadArtifact = async (artifactId: string) => {
		if (contextPanelOpen) {
			contextArtifactId = artifactId;
			return;
		}

		await goto(
			resolve(
				workspaceThreadViewHref({
					threadId: activeThreadId,
					withContext: true
				}) as `/workspace/thread/${string}?${string}`
			),
			{
				noScroll: true,
				keepFocus: true
			}
		);
		contextArtifactId = artifactId;
	};

	const closeThreadArtifact = () => {
		contextArtifactId = '';
	};

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
						messages,
						webSearchRequested
					},
					headers: authHeaders()
				})
			}),
			onFinish: ({ messages, isError }) => {
				if (isError) return;
				void persistMessages(threadId, messages);
				void requestThreadTitleGeneration(threadId);
			}
		});
	}

	async function startInitialChat(threadId: string) {
		try {
			await chat?.sendMessage();
		} catch (error) {
			console.error(error);
			chatError = 'Could not start the assistant response. Please try again.';
		}
	}

	async function persistMessages(threadId: string, messages: UIMessage[]): Promise<boolean> {
		try {
			await getConvexClient().mutation(saveMessagesMutation, {
				threadId: threadId as Id<'chatThreads'>,
				messages,
				modelId: selectedModelId
			});
			saveError = '';
			return true;
		} catch (error) {
			console.error(error);
			saveError =
				'Could not save messages to the server. Your latest replies may not persist after refresh—try again or send another message to retry sync.';
			return false;
		}
	}

	async function retrySaveMessages() {
		if (!chat || !activeThreadId) return;
		await persistMessages(activeThreadId, chat.messages);
	}

	function scheduleCopiedReset() {
		if (copyToastClear) clearTimeout(copyToastClear);
		copyToastClear = setTimeout(() => {
			copiedMessageId = '';
			copyToastClear = 0;
		}, 2000);
	}

	async function copyMessageDisplay(message: UIMessage) {
		const text =
			message.role === 'user'
				? buildUserMessageCopyText(message)
				: buildAssistantMessageCopyText(message);
		if (!text) {
			chatError = 'Nothing to copy for this message yet.';
			return;
		}
		try {
			await navigator.clipboard.writeText(text);
			copiedMessageId = message.id;
			scheduleCopiedReset();
		} catch {
			chatError = 'Could not copy to the clipboard. Check browser permissions and try again.';
		}
	}

	async function retryFromUserMessage(userMessageId: string) {
		if (!auth.isAuthenticated || !chat || !activeThreadId || isChatBusy) return;
		chatError = '';
		saveError = '';
		try {
			const truncated = truncateMessagesAfterUserMessage(chat.messages, userMessageId);
			const ok = await persistMessages(activeThreadId, truncated);
			if (!ok) return;
			await tick();
			if (!chat || isChatBusy) return;
			await chat.sendMessage();
		} catch (error) {
			console.error(error);
			chatError = buildChatErrorMessage(error);
		}
	}

	async function forkFromMessage(messageId: string) {
		if (!auth.isAuthenticated || !activeThreadId || isChatBusy) return;
		chatError = '';
		try {
			const { threadId } = await getConvexClient().mutation(forkThreadFromMessageMutation, {
				threadId: activeThreadId as Id<'chatThreads'>,
				messageId
			});
			await goto(resolve(workspaceThreadHref(threadId) as `/workspace/thread/${string}`), {
				noScroll: true,
				keepFocus: true
			});
		} catch (error) {
			console.error(error);
			chatError = 'Could not fork this thread. Try again.';
		}
	}

	function dismissChatAlerts() {
		chatError = '';
		saveError = '';
		chat?.clearError();
	}

	async function retryAssistantRequest() {
		if (!chat || isChatBusy) return;
		chat.clearError();
		chatError = '';
		try {
			await chat.sendMessage();
		} catch (error) {
			console.error(error);
			chatError = buildChatErrorMessage(error);
		}
	}

	const showStreamFailure = $derived(Boolean(chatError) || chat?.status === 'error');

	function authHeaders(): Record<string, string> {
		if (!auth.token) return {};
		return { Authorization: `Bearer ${auth.token}` };
	}

	async function requestThreadTitleGeneration(threadId: string) {
		if (!auth.token) return;
		try {
			const response = await fetch('/api/workspace/thread/generate-title', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...authHeaders()
				},
				body: JSON.stringify({ threadId })
			});
			if (response.ok) {
				void invalidateAll();
			}
		} catch {
			// Non-blocking; sidebar keeps placeholder until next visit or retry.
		}
	}

	function messageText(message: UIMessage) {
		return message.parts
			.filter((part) => part.type === 'text')
			.map((part) => part.text)
			.join('\n')
			.trim();
	}

	function assistantAwaitingStreamContent(
		message: UIMessage,
		messageIndex: number,
		messages: UIMessage[]
	) {
		if (message.role !== 'assistant') return false;
		if (messageIndex !== messages.length - 1) return false;
		if (chat?.status !== 'submitted' && chat?.status !== 'streaming') return false;
		return !assistantSegmentsHaveContent(buildAssistantSegments(message));
	}

	const threadStateFade = $derived({
		duration: prefersReducedMotion.current ? 0 : 160
	});
	const threadStateFadeOut = $derived({
		duration: prefersReducedMotion.current ? 0 : 120
	});
	const threadReadyIn = $derived({
		y: 8,
		duration: prefersReducedMotion.current ? 0 : 220,
		easing: backOut
	});
	const threadReadyOut = $derived({
		duration: prefersReducedMotion.current ? 0 : 130
	});
</script>

<section class="flex h-full min-h-0 flex-col bg-background text-foreground">
	<div class="flex min-h-0 flex-1 flex-col">
		{#if threadMessages.error}
			<div
				class="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-8"
				in:fade|local={threadStateFade}
				out:fade|local={threadStateFadeOut}
			>
				<div class="max-w-sm text-center">
					<p class="text-sm font-semibold tracking-tight">Could not load this thread</p>
					<p class="mt-2 text-xs leading-5 text-muted-foreground">
						{threadMessages.error.message}
					</p>
				</div>
				<div class="flex flex-wrap items-center justify-center gap-2">
					<Button
						type="button"
						variant="secondary"
						size="sm"
						onclick={() => {
							void invalidateAll();
						}}
					>
						Try again
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onclick={() => goto(resolve('/workspace'))}
					>
						Back to workspace
					</Button>
				</div>
			</div>
		{:else if threadMessages.isLoading || threadMessages.data === undefined || !chat}
			<div
				class="flex flex-1 items-center justify-center px-4"
				in:fade|local={threadStateFade}
				out:fade|local={threadStateFadeOut}
			>
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
							class="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 sm:px-6"
						>
							{#if chat.messages.length === 0 && chat.status === 'ready'}
								<div
									class="flex flex-col items-center justify-center gap-2 py-12 text-center"
									aria-live="polite"
								>
									<p class="text-sm font-semibold tracking-tight">Start this thread</p>
									<p class="max-w-sm text-xs leading-5 text-muted-foreground">
										Ask a question or describe what you want to build. Use @ to cite artifacts when
										you want the assistant to read them.
									</p>
								</div>
							{:else}
								{#each chat.messages as message, messageIndex (message.id)}
									<Message from={message.role}>
										<MessageContent>
											{#if message.role === 'assistant'}
												{@const segments = buildAssistantSegments(message)}
												{#if assistantSegmentsHaveContent(segments)}
													<!-- gap-2: prose vs tools within one assistant turn; message gap-5 separates turns -->
													<div class="flex w-full min-w-0 flex-col gap-2">
														{#each segments as segment, segmentIndex (segmentIndex)}
															{#if segment.kind === 'text'}
																<MessageResponse
																	content={segment.text}
																	class="text-xs leading-relaxed"
																/>
															{:else}
																<div class="border-l border-border/40 pl-4 sm:pl-5">
																	{#if segment.kind === 'tools'}
																		<IdeaChatToolSteps tools={segment.tools} />
																	{:else}
																		<IdeaChatChoiceCard
																			choice={segment.choice}
																			disabled={isChatBusy}
																			onAnswer={submitChoiceAnswer}
																		/>
																	{/if}
																</div>
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
												{@const composed = parseComposedUserMessage(messageText(message))}
												<div class="flex w-full min-w-0 flex-col gap-2">
													{#if composed.artifactIds.length > 0}
														<div class="flex flex-wrap gap-1.5" aria-label="Referenced artifacts">
															{#each composed.artifactIds as aid (aid)}
																<span class={artifactMentionPill}>
																	<span
																		class="size-1.5 shrink-0 rounded-full bg-primary/70"
																		aria-hidden="true"
																	></span>
																	<span class="max-w-56 min-w-0 truncate"
																		>{artifactTitleForId(aid)}</span
																	>
																</span>
															{/each}
														</div>
													{/if}
													{#if composed.body}
														<p class="text-xs leading-5 whitespace-pre-wrap">{composed.body}</p>
													{/if}
												</div>
											{/if}
										</MessageContent>
										<WorkspaceMessageActions
											role={message.role === 'assistant' ? 'assistant' : 'user'}
											allowRetry={auth.isAuthenticated}
											allowFork={auth.isAuthenticated}
											disabled={isChatBusy || !auth.isAuthenticated}
											copyDisabled={!(message.role === 'user'
												? buildUserMessageCopyText(message)
												: buildAssistantMessageCopyText(message))}
											copied={copiedMessageId === message.id}
											onCopy={() => void copyMessageDisplay(message)}
											onFork={() => void forkFromMessage(message.id)}
											onRetry={message.role === 'user'
												? () => void retryFromUserMessage(message.id)
												: undefined}
										/>
									</Message>
								{/each}
							{/if}

							{#if chat.status === 'submitted'}
								<Message from="assistant">
									<MessageContent
										class="flex w-full min-w-0 flex-row items-center gap-2 text-muted-foreground"
									>
										<HugeiconsIcon
											icon={Loading03Icon}
											strokeWidth={2}
											class="size-3.5 motion-safe:animate-spin"
										/>
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
							compact
							onBack={closeThreadArtifact}
						/>
					{:else}
						<div class="flex min-h-0 flex-1 flex-col">
							<div class="shrink-0 space-y-2 border-b border-border/50 px-3 py-3">
								<div>
									<p class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
										Chat context
									</p>
									<p class="mt-1 text-[11px] text-muted-foreground">
										Artifacts linked to this thread.
									</p>
								</div>
								<Input
									bind:value={contextSearch}
									type="search"
									placeholder="Search title or type"
									class="h-7 text-xs"
								/>
								<div class="grid grid-cols-2 gap-2">
									<NativeSelect bind:value={contextTypeFilter} size="sm" class="w-full">
										<NativeSelectOption value="all">All types</NativeSelectOption>
										{#each contextArtifactTypes as type (type)}
											<NativeSelectOption value={type}>{artifactTypeLabel(type)}</NativeSelectOption
											>
										{/each}
									</NativeSelect>
									<NativeSelect bind:value={contextDateSort} size="sm" class="w-full">
										<NativeSelectOption value="newest">Newest first</NativeSelectOption>
										<NativeSelectOption value="oldest">Oldest first</NativeSelectOption>
									</NativeSelect>
								</div>
							</div>

							<div class="min-h-0 flex-1 overflow-y-auto px-2 py-2">
								{#if threadArtifacts.error}
									<div class="space-y-2 px-2 py-2">
										<p class="text-xs text-destructive">{threadArtifacts.error.message}</p>
										<Button
											type="button"
											variant="secondary"
											size="sm"
											class="h-7 text-xs"
											onclick={() => {
												void invalidateAll();
											}}
										>
											Retry
										</Button>
									</div>
								{:else if threadArtifacts.data === undefined}
									<p class="px-2 py-1.5 text-xs text-muted-foreground">Loading artifacts...</p>
								{:else}
									<div class="space-y-3">
										{#if threadArtifacts.data.length === 0}
											<p class="px-2 py-1.5 text-xs leading-5 text-muted-foreground">
												No artifacts in this chat yet. Ask Launchpad to save an idea or draft a PRD
												when the shape is clear.
											</p>
										{:else if filteredContextArtifacts.length === 0}
											<p class="px-2 py-1.5 text-xs leading-5 text-muted-foreground">
												No artifacts match those filters.
											</p>
										{:else}
											<div class="space-y-1">
												{#each filteredContextArtifacts as item (item.link._id)}
													<button
														type="button"
														class="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
														onclick={() => openThreadArtifact(item.artifact._id)}
													>
														<span class="size-1.5 shrink-0 rounded-full bg-primary/70"></span>
														<span
															class="min-w-0 flex-1 truncate text-xs font-medium tracking-tight"
														>
															{item.artifact.title}
														</span>
														<span class="shrink-0 text-[10px] text-muted-foreground">
															{artifactTypeLabel(item.artifact.type)}
														</span>
														<span class="shrink-0 text-[10px] text-muted-foreground">
															{formatArtifactCreatedAt(item.artifact.createdAt)}
														</span>
													</button>
												{/each}
											</div>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</aside>
			{/snippet}

			{#snippet threadComposer()}
				<div class="shrink-0 bg-background px-4 py-4 sm:px-6">
					<div class="relative mx-auto w-full max-w-3xl space-y-2">
						{#if showStreamFailure || saveError}
							<div
								class="flex flex-col gap-2 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 sm:flex-row sm:items-start sm:justify-between"
								role="alert"
							>
								<div class="min-w-0 flex-1 space-y-2 text-xs">
									{#if showStreamFailure}
										<div class="space-y-1">
											<p class="font-medium text-destructive">Assistant reply failed</p>
											<p class="leading-5 text-muted-foreground">
												{chatError ||
													chat?.error?.message ||
													'Something went wrong. You can retry or keep typing.'}
											</p>
										</div>
									{/if}
									{#if saveError}
										<div class="space-y-1">
											<p class="font-medium text-destructive">Could not save to the server</p>
											<p class="leading-5 text-muted-foreground">{saveError}</p>
										</div>
									{/if}
								</div>
								<div class="flex flex-wrap items-center gap-2">
									{#if showStreamFailure}
										<Button
											type="button"
											variant="secondary"
											size="sm"
											class="h-7 text-xs"
											disabled={isChatBusy}
											onclick={() => void retryAssistantRequest()}
										>
											Retry send
										</Button>
									{/if}
									{#if saveError}
										<Button
											type="button"
											variant="secondary"
											size="sm"
											class="h-7 text-xs"
											onclick={() => void retrySaveMessages()}
										>
											Retry sync
										</Button>
									{/if}
									<Button
										type="button"
										variant="ghost"
										size="sm"
										class="h-7 text-xs"
										onclick={dismissChatAlerts}
									>
										Dismiss
									</Button>
								</div>
							</div>
						{/if}

						{#if mentionOpen}
							<div
								id={mentionListboxId}
								class="absolute bottom-full left-0 z-20 mb-2 max-h-48 w-[min(28rem,100%)] overflow-y-auto rounded-lg border border-border/70 bg-popover p-1 text-popover-foreground shadow-none"
								role="listbox"
								aria-label="Artifacts"
							>
								{#if mentionableArtifacts.error}
									<p class="px-2 py-2 text-xs text-destructive">
										{mentionableArtifacts.error.message}
									</p>
								{:else if mentionableArtifacts.data === undefined}
									<p class="px-2 py-2 text-xs text-muted-foreground">Loading artifacts…</p>
								{:else if filteredMentionArtifacts.length === 0}
									<p class="px-2 py-2 text-xs text-muted-foreground">No matching artifacts.</p>
								{:else}
									{#each filteredMentionArtifacts as item, i (item.artifact._id)}
										<button
											type="button"
											id={`workspace-mention-opt-${item.artifact._id}`}
											role="option"
											aria-selected={i === mentionHighlight}
											class={cn(
												'flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors',
												i === mentionHighlight
													? 'bg-accent/50 text-accent-foreground'
													: 'hover:bg-accent/40'
											)}
											onmouseenter={() => {
												mentionHighlight = i;
											}}
											onclick={() => void pickArtifactMention(item)}
										>
											<span
												class={cn(
													'size-1.5 shrink-0 rounded-full',
													i === mentionHighlight ? 'bg-primary' : 'bg-muted-foreground/50'
												)}
												aria-hidden="true"
											></span>
											<span class="min-w-0 flex-1 truncate font-medium">{item.artifact.title}</span>
											{#if !item.linkedToThread}
												<span class="shrink-0 text-[10px] text-muted-foreground">Project</span>
											{/if}
											<span class="shrink-0 text-[10px] text-muted-foreground">
												{formatArtifactCreatedAt(item.artifact.createdAt)}
											</span>
										</button>
									{/each}
								{/if}
							</div>
						{/if}

						<PromptInput
							class="overflow-hidden rounded-lg border-0 bg-card/80 shadow-none ring-1 ring-border/70 backdrop-blur-sm"
							clearOnSubmit={false}
							onSubmit={submitMessage}
						>
							{#if mentionChips.length > 0}
								<div
									class="flex flex-wrap gap-1.5 px-3 pt-2"
									aria-label="Artifacts to include in this message"
								>
									{#each mentionChips as chip (chip.id)}
										<span class={artifactMentionPill}>
											<span class="size-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden="true"
											></span>
											<span class="max-w-56 min-w-0 truncate">{chip.title}</span>
											<button
												type="button"
												class="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
												aria-label="Remove artifact reference"
												onclick={() => removeMentionChip(chip.id)}
											>
												<HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} class="size-3" />
											</button>
										</span>
									{/each}
								</div>
							{/if}
							<PromptInputTextarea
								bind:ref={textareaRef}
								bind:value={composerText}
								class="min-h-12 px-3 py-3 text-sm leading-5 focus-visible:ring-0"
								placeholder="Continue shaping this thread... (@ to cite an artifact)"
								onInputPost={handleComposerInputPost}
								onKeyDownIntercept={handleComposerKeyDown}
								role="combobox"
								aria-expanded={mentionOpen}
								aria-controls={mentionOpen ? mentionListboxId : undefined}
								aria-autocomplete="list"
								aria-activedescendant={mentionActiveOptionId}
							/>
							<PromptInputToolbar class="gap-2 px-3 py-2">
								<PromptInputTools class="min-w-0 flex-1 flex-wrap">
									<button
										type="button"
										class={cn(
											'inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
											webSearchRequested
												? 'bg-muted text-foreground'
												: 'text-muted-foreground hover:bg-muted hover:text-foreground'
										)}
										aria-pressed={webSearchRequested}
										disabled={isChatBusy}
										onclick={() => {
											webSearchRequested = !webSearchRequested;
											focusComposer();
										}}
									>
										<HugeiconsIcon
											icon={GlobeIcon}
											strokeWidth={2}
											class="size-3"
											aria-hidden="true"
										/>
										Search web
									</button>
									<ModelSelector bind:open={modelSelectorOpen}>
										<ModelSelectorTrigger
											class="inline-flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors [transition-duration:150ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:bg-accent/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
										>
											<ModelSelectorLogo
												provider={getModelSelectorLogoProvider(selectedModel)}
												class="size-3 shrink-0"
											/>
											<span class="truncate">{selectedModel.label}</span>
											<HugeiconsIcon
												icon={ArrowDown01Icon}
												strokeWidth={2}
												class="size-3 shrink-0"
											/>
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
										maxTokens={selectedModel.maxContextTokens}
										usage={{ inputTokens: estimatedInputTokens }}
										modelId={selectedModelId}
									>
										<ContextTrigger
											size="sm"
											class="h-7 gap-1 px-2 text-xs text-muted-foreground"
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
								<PromptInputSubmit class="size-8 shrink-0" disabled={!canSubmit}>
									{#if isChatBusy}
										<HugeiconsIcon
											icon={Loading03Icon}
											strokeWidth={2}
											class="size-4 animate-spin"
										/>
									{:else}
										<HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} class="size-4" />
									{/if}
								</PromptInputSubmit>
							</PromptInputToolbar>
						</PromptInput>
					</div>
				</div>
			{/snippet}

			<div
				class="flex min-h-0 flex-1 flex-col"
				in:fly|local={threadReadyIn}
				out:fade|local={threadReadyOut}
			>
				{#if !contextPanelOpen || !mediaMinLg}
					{#if !contextPanelOpen}
						<div class="flex min-h-0 min-w-0 flex-1 flex-col">
							<div class="min-h-0 min-w-0 flex-1">
								{@render threadConversation()}
							</div>
							{@render threadComposer()}
						</div>
					{:else}
						<div class="flex min-h-0 min-w-0 flex-1 flex-col">
							<div class="flex min-h-0 min-w-0 flex-1 flex-col">
								<div class="min-h-0 min-w-0 flex-1">
									{@render threadConversation()}
								</div>
								{@render threadComposer()}
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
						<Pane defaultSize={60} minSize={15} class="flex min-h-0 min-w-0 flex-col">
							<div class="flex min-h-0 min-w-0 flex-1 flex-col">
								<div class="min-h-0 min-w-0 flex-1">
									{@render threadConversation()}
								</div>
								{@render threadComposer()}
							</div>
						</Pane>
						<Handle withHandle />
						<Pane defaultSize={40} minSize={15} maxSize={90} class="flex min-h-0 min-w-0 flex-col">
							{@render threadContextAside(
								'h-full min-h-0 min-w-0 overflow-hidden border-l border-border/50'
							)}
						</Pane>
					</PaneGroup>
				{/if}
			</div>
		{/if}
	</div>
</section>
