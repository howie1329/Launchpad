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
	import IdeaChatPromotionCard from '$lib/components/idea-chat/IdeaChatPromotionCard.svelte';
	import IdeaChatToolSteps from '$lib/components/idea-chat/IdeaChatToolSteps.svelte';
	import OpenUIResponse from '$lib/openui/OpenUIResponse.svelte';
	import WorkspaceArtifactReader from '$lib/components/workspaces/WorkspaceArtifactReader.svelte';
	import { Marker, MarkerContent, MarkerIcon } from '$lib/components/ui/marker';
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
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Input } from '$lib/components/ui/input';
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
	import { buildAssistantSegments } from '$lib/idea-chat-assistant-parts';
	import WorkspaceMessageActions from '$lib/components/workspaces/WorkspaceMessageActions.svelte';
	import {
		assistantMessageHasVisibleContent,
		assistantMessageWasInterrupted,
		buildAssistantMessageCopyText,
		buildUserMessageCopyText,
		markAssistantMessageInterrupted,
		truncateMessagesAfterUserMessage,
		uiMessageText
	} from '$lib/workspace-chat-message-actions';
	import { logOpenUIFallbackIfNeeded } from '$lib/openui/response';
	import { consumeThreadAutoStart } from '$lib/workspace-thread-start';
	import { workspaceThreadHref, workspaceThreadViewHref } from '$lib/workspace-route-contract';
	import {
		Add01Icon,
		ArrowDown01Icon,
		ArrowUp01Icon,
		Cancel01Icon,
		GlobeIcon,
		Loading03Icon,
		Plug02Icon,
		SquareIcon
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
	let composioPickerOpen = $state(false);
	let composioToolkitsLoading = $state(false);
	let composioToolkitsError = $state('');
	let composioToolkitsAvailable = $state(false);
	let composioToolkitsLoadedForThread = $state('');
	let composioToolkits = $state<ComposioToolkitStatus[]>([]);
	let selectedComposioToolkits = $state<AllowedComposioToolkit[]>([]);
	let chatError = $state('');
	let saveError = $state('');
	let copiedMessageId = $state('');
	let copyToastClear: ReturnType<typeof setTimeout> | 0 = 0;
	let contextArtifactId = $state('');
	let lastThreadIdForContext = $state('');
	let contextSearch = $state('');
	let contextListRef = $state<HTMLDivElement | null>(null);
	let contextListScrollTop = $state(0);
	/** Matches Tailwind `lg` — used so we only mount one chat + one context split (no duplicate Conversation). */
	let mediaMinLg = $state(false);

	type AllowedComposioToolkit =
		| 'github'
		| 'linear'
		| 'slack'
		| 'gmail'
		| 'notion'
		| 'googledrive'
		| 'googledocs'
		| 'googlecalendar'
		| 'googlesheets';
	type ComposioToolkitStatus = {
		slug: AllowedComposioToolkit;
		name: string;
		logo?: string;
		connected: boolean;
		connectionStatus?: string;
	};

	const fallbackComposioToolkits: ComposioToolkitStatus[] = [
		{ slug: 'github', name: 'GitHub', connected: false },
		{ slug: 'linear', name: 'Linear', connected: false },
		{ slug: 'slack', name: 'Slack', connected: false },
		{ slug: 'gmail', name: 'Gmail', connected: false },
		{ slug: 'notion', name: 'Notion', connected: false },
		{ slug: 'googledrive', name: 'Google Drive', connected: false },
		{ slug: 'googledocs', name: 'Google Docs', connected: false },
		{ slug: 'googlecalendar', name: 'Google Calendar', connected: false },
		{ slug: 'googlesheets', name: 'Google Sheets', connected: false }
	];

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
	const linkedArtifactCount = $derived(threadArtifacts.data?.length ?? 0);
	const showContextSearch = $derived(linkedArtifactCount >= 8);
	const filteredContextArtifacts = $derived.by(() => {
		const query = showContextSearch ? contextSearch.trim().toLowerCase() : '';
		return sortedThreadArtifacts.filter((item) => {
			const type = item.artifact.type.trim();
			const typeLabel = artifactTypeLabel(type);
			return (
				!query ||
				item.artifact.title.toLowerCase().includes(query) ||
				type.toLowerCase().includes(query) ||
				typeLabel.toLowerCase().includes(query)
			);
		});
	});
	const visibleComposioToolkits = $derived(
		composioToolkits.length > 0 ? composioToolkits : fallbackComposioToolkits
	);
	const connectedComposioToolkits = $derived(
		visibleComposioToolkits.filter((toolkit) => toolkit.connected)
	);
	const disconnectedComposioToolkits = $derived(
		visibleComposioToolkits.filter((toolkit) => !toolkit.connected)
	);
	const orderedComposioToolkits = $derived([
		...connectedComposioToolkits,
		...disconnectedComposioToolkits
	]);
	const selectedComposioToolkitRows = $derived(
		selectedComposioToolkits.map(
			(slug) =>
				visibleComposioToolkits.find((toolkit) => toolkit.slug === slug) ?? toolkitFallback(slug)
		)
	);
	const composioScopeLabel = $derived(
		selectedComposioToolkits.length > 0
			? `Only ${selectedComposioToolkits.length} selected ${selectedComposioToolkits.length === 1 ? 'app' : 'apps'}`
			: 'All app tools'
	);
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

	$effect(() => {
		void activeThreadId;
		selectedComposioToolkits = [];
		composioPickerOpen = false;
		composioToolkitsError = '';
	});

	$effect(() => {
		if (!composioPickerOpen || !activeThreadId) return;
		if (composioToolkitsLoadedForThread === activeThreadId || composioToolkitsLoading) return;
		void loadComposioToolkits();
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
		`${chat?.messages.map((message) => uiMessageText(message)).join('\n') ?? ''}\n${composerText}\n${mentionChips.map((c) => formatArtifactMentionToken(c.id)).join('\n')}`
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
			contextSearch = '';
			contextListScrollTop = 0;
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
		if (
			!pendingAutoStartThreadId ||
			!activeThreadId ||
			!chat ||
			startedThreadId === activeThreadId
		) {
			return;
		}
		if (pendingAutoStartThreadId !== activeThreadId) return;
		if (!threadMessages.data || threadMessages.data.length !== 1) return;
		if (chat.status !== 'ready') return;

		startedThreadId = activeThreadId;
		pendingAutoStartThreadId = '';
		void startInitialChat();
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

	function clearContextSearch() {
		contextSearch = '';
	}

	function requestCreateArtifact() {
		if (!browser) return;
		window.dispatchEvent(new CustomEvent('launchpad:create-artifact'));
	}

	function citeArtifact(artifactId: string, title: string) {
		if (!mentionChips.some((chip) => chip.id === artifactId)) {
			mentionChips = [...mentionChips, { id: artifactId, title }];
		}
		focusComposer();
	}

	function linkReasonLabel(reason: string) {
		if (reason === 'created') return 'Created here';
		if (reason === 'imported') return 'Imported';
		return 'Referenced';
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

	async function loadComposioToolkits() {
		if (!activeThreadId || !auth.token) return;

		composioToolkitsLoading = true;
		composioToolkitsError = '';
		try {
			const response = await fetch(
				`/api/workspace/composio/toolkits?threadId=${encodeURIComponent(activeThreadId)}`,
				{ headers: authHeaders() }
			);
			const data = (await response.json()) as {
				available?: boolean;
				toolkits?: ComposioToolkitStatus[];
				error?: string;
			};

			if (!response.ok) {
				throw new Error(data.error ?? 'Could not load app tools.');
			}

			composioToolkitsAvailable = data.available === true;
			composioToolkits = normalizeComposioToolkits(data.toolkits);
			composioToolkitsLoadedForThread = activeThreadId;
			if (!composioToolkitsAvailable) {
				selectedComposioToolkits = [];
			}
		} catch (error) {
			console.error(error);
			composioToolkitsError = 'External app tools are unavailable.';
			composioToolkitsAvailable = false;
			composioToolkits = [];
			selectedComposioToolkits = [];
		} finally {
			composioToolkitsLoading = false;
		}
	}

	function normalizeComposioToolkits(value: unknown): ComposioToolkitStatus[] {
		if (!Array.isArray(value)) return [];
		return value.filter(isComposioToolkitStatus);
	}

	function isComposioToolkitStatus(value: unknown): value is ComposioToolkitStatus {
		if (!value || typeof value !== 'object') return false;
		const row = value as Partial<ComposioToolkitStatus>;
		return isAllowedComposioToolkit(row.slug) && typeof row.name === 'string';
	}

	function isAllowedComposioToolkit(value: unknown): value is AllowedComposioToolkit {
		return fallbackComposioToolkits.some((toolkit) => toolkit.slug === value);
	}

	function toolkitFallback(slug: AllowedComposioToolkit): ComposioToolkitStatus {
		return (
			fallbackComposioToolkits.find((toolkit) => toolkit.slug === slug) ??
			fallbackComposioToolkits[0]
		);
	}

	function clearComposioToolkits() {
		if (isChatBusy) return;
		selectedComposioToolkits = [];
		focusComposer();
	}

	function toggleComposioToolkit(slug: AllowedComposioToolkit) {
		if (!composioToolkitsAvailable || isChatBusy) return;
		selectedComposioToolkits = selectedComposioToolkits.includes(slug)
			? selectedComposioToolkits.filter((item) => item !== slug)
			: [...selectedComposioToolkits, slug];
		focusComposer();
	}

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
		const prevComposioToolkits = selectedComposioToolkits.slice();

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
			selectedComposioToolkits = prevComposioToolkits;
			chatError = buildChatErrorMessage(error);
			throw error;
		}
	};

	async function submitChoiceAnswer(answer: string) {
		if (!chat || isChatBusy) return;
		const prevWebSearchRequested = webSearchRequested;
		const prevComposioToolkits = selectedComposioToolkits.slice();
		chatError = '';
		saveError = '';
		try {
			await chat.sendMessage({ text: answer.trim() });
			webSearchRequested = false;
		} catch (error) {
			console.error(error);
			webSearchRequested = prevWebSearchRequested;
			selectedComposioToolkits = prevComposioToolkits;
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
		contextListScrollTop = contextListRef?.scrollTop ?? 0;
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

	const closeThreadArtifact = async () => {
		contextArtifactId = '';
		await tick();
		if (contextListRef) contextListRef.scrollTop = contextListScrollTop;
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
						webSearchRequested,
						composioToolkits: selectedComposioToolkits
					},
					headers: authHeaders()
				})
			}),
			onFinish: ({ messages, isError }) => {
				if (isError) return;
				const last = messages.at(-1);
				if (last?.role === 'assistant') {
					logOpenUIFallbackIfNeeded(uiMessageText(last, ''), threadId);
				}
				void persistMessages(threadId, messages).then((saved) => {
					if (saved) void requestThreadTitleGeneration(threadId);
				});
			}
		});
	}

	async function startInitialChat() {
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

	async function stopAssistantGeneration() {
		if (!chat || !isChatBusy) return;

		chatError = '';
		try {
			await chat.stop();
			await tick();

			const lastMessage = chat.lastMessage;
			if (lastMessage?.role !== 'assistant') return;

			chat.messages = chat.messages.map((message) =>
				message.id === lastMessage.id ? markAssistantMessageInterrupted(message) : message
			);
			if (activeThreadId) await persistMessages(activeThreadId, chat.messages);
		} catch (error) {
			console.error(error);
			chatError = 'Could not stop the assistant response. Try again.';
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
			if (!response.ok) {
				console.error('Could not generate thread title', response.status, await response.text());
				return;
			}
			void invalidateAll();
		} catch {
			// Non-blocking; sidebar keeps placeholder until next visit or retry.
		}
	}

	function assistantAwaitingStreamContent(
		message: UIMessage,
		messageIndex: number,
		messages: UIMessage[]
	) {
		if (message.role !== 'assistant') return false;
		if (messageIndex !== messages.length - 1) return false;
		if (chat?.status !== 'submitted' && chat?.status !== 'streaming') return false;
		return !assistantMessageHasVisibleContent(message);
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
												{@const assistantText = uiMessageText(message, '')}
												{#if assistantMessageHasVisibleContent(message)}
													<!-- Tool state stays explicit; final assistant text is one progressively rendered OpenUI document. -->
													<div class="flex w-full min-w-0 flex-col gap-2">
														{#each segments as segment, segmentIndex (segmentIndex)}
															{#if segment.kind === 'tools'}
																<IdeaChatToolSteps
																	tools={segment.tools}
																	deemphasized={Boolean(assistantText)}
																	hasAssistantText={Boolean(assistantText)}
																/>
															{:else}
																<div class="border-l border-border/40 pl-4 sm:pl-5">
																	<IdeaChatPromotionCard proposal={segment.proposal} />
																</div>
															{/if}
														{/each}
														{#if assistantText}
															<OpenUIResponse
																response={assistantText}
																isStreaming={messageIndex === chat.messages.length - 1 &&
																	(chat.status === 'submitted' || chat.status === 'streaming')}
																onSend={submitChoiceAnswer}
																onRetry={() => void retryAssistantRequest()}
																reducedMotion={prefersReducedMotion.current}
															/>
														{/if}
													</div>
												{:else if assistantAwaitingStreamContent(message, messageIndex, chat.messages)}
													<MessageResponse
														content="Working…"
														class="text-sm leading-6 text-muted-foreground"
													/>
												{:else}
													<p class="text-xs text-muted-foreground">No response yet.</p>
												{/if}
												{#if assistantMessageWasInterrupted(message)}
													<p class="text-xs leading-5 text-muted-foreground">Interrupted</p>
												{/if}
											{:else}
												{@const composed = parseComposedUserMessage(uiMessageText(message))}
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
														<p class="text-sm leading-6 whitespace-pre-wrap">{composed.body}</p>
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
										<Marker role="status">
											<MarkerIcon>
												<HugeiconsIcon
													icon={Loading03Icon}
													strokeWidth={2}
													class="motion-safe:animate-spin"
												/>
											</MarkerIcon>
											<MarkerContent>Working…</MarkerContent>
										</Marker>
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
							<div
								class="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-border/50 px-3 py-2.5"
							>
								<div class="flex min-w-0 items-center gap-2">
									<h2 class="truncate text-sm font-semibold tracking-tight">Context</h2>
									<span
										class="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] leading-4 font-medium text-muted-foreground tabular-nums"
										aria-label={`${linkedArtifactCount} linked artifact${linkedArtifactCount === 1 ? '' : 's'}`}
									>
										{linkedArtifactCount}
									</span>
								</div>
								<Button
									type="button"
									variant="secondary"
									size="sm"
									class="h-7 shrink-0 gap-1.5 px-2 text-xs"
									onclick={requestCreateArtifact}
								>
									<HugeiconsIcon icon={Add01Icon} strokeWidth={2} class="size-3" />
									Create artifact
								</Button>
							</div>

							{#if showContextSearch}
								<div class="shrink-0 border-b border-border/40 px-3 py-2.5">
									<Input
										bind:value={contextSearch}
										type="search"
										aria-label="Search linked artifacts"
										placeholder="Search linked artifacts"
										class="h-8 text-xs"
									/>
								</div>
							{/if}

							<div bind:this={contextListRef} class="min-h-0 flex-1 overflow-y-auto">
								{#if threadArtifacts.error}
									<div class="space-y-2 px-4 py-5">
										<p class="text-xs font-medium text-destructive">Couldn’t load context</p>
										<p class="max-w-sm text-[11px] leading-4 text-muted-foreground">
											The artifacts linked to this thread are unavailable right now.
										</p>
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
									<div class="divide-y divide-border/40" aria-label="Loading thread context">
										{#each Array.from({ length: 4 }, (_, index) => index) as index (index)}
											<div class="space-y-2 px-3 py-3.5">
												<div class="h-3 w-2/3 rounded-sm bg-muted"></div>
												<div class="h-2.5 w-1/2 rounded-sm bg-muted/70"></div>
											</div>
										{/each}
									</div>
								{:else if threadArtifacts.data.length === 0}
									<div class="space-y-2 px-4 py-5">
										<p class="text-xs font-medium">No artifacts linked</p>
										<p class="max-w-sm text-[11px] leading-4 text-muted-foreground">
											Artifacts linked to this chat will appear here.
										</p>
										<Button
											type="button"
											variant="secondary"
											size="sm"
											class="h-7 gap-1.5 px-2 text-xs"
											onclick={requestCreateArtifact}
										>
											<HugeiconsIcon icon={Add01Icon} strokeWidth={2} class="size-3" />
											Create artifact
										</Button>
									</div>
								{:else if filteredContextArtifacts.length === 0}
									<div class="space-y-2 px-4 py-5">
										<p class="text-xs font-medium">No matching artifacts</p>
										<p class="text-[11px] leading-4 text-muted-foreground">
											Try another title or artifact type.
										</p>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											class="h-7 px-2 text-xs"
											onclick={clearContextSearch}
										>
											Clear search
										</Button>
									</div>
								{:else}
									<div class="divide-y divide-border/40">
										{#each filteredContextArtifacts as item (item.link._id)}
											<div
												class="group/context-row relative min-w-0 transition-colors focus-within:bg-accent/45 hover:bg-accent/45"
											>
												<button
													type="button"
													class="block w-full min-w-0 px-3 py-3 pr-16 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
													onclick={() => openThreadArtifact(item.artifact._id)}
												>
													<span class="block truncate text-xs font-medium tracking-tight">
														{item.artifact.title}
													</span>
													<span
														class="mt-1 block truncate text-[10px] leading-4 text-muted-foreground"
													>
														{artifactTypeLabel(item.artifact.type)} · {linkReasonLabel(
															item.link.reason
														)} ·
														{formatArtifactCreatedAt(item.artifact.createdAt)}
													</span>
												</button>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													class="absolute top-1/2 right-2 h-7 -translate-y-1/2 px-2 text-[11px] text-muted-foreground opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within/context-row:opacity-100 sm:group-hover/context-row:opacity-100"
													aria-label={`Cite ${item.artifact.title}`}
													onclick={() => citeArtifact(item.artifact._id, item.artifact.title)}
												>
													Cite
												</Button>
											</div>
										{/each}
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
							{#if mentionChips.length > 0 || selectedComposioToolkitRows.length > 0}
								<div
									class="flex flex-wrap gap-1.5 px-3 pt-2"
									aria-label="Context and app tools to include in this message"
								>
									{#each selectedComposioToolkitRows as toolkit (toolkit.slug)}
										<span class={artifactMentionPill}>
											<span class="size-1.5 shrink-0 rounded-full bg-sky-500/80" aria-hidden="true"
											></span>
											<span class="max-w-40 min-w-0 truncate">{toolkit.name}</span>
											<button
												type="button"
												class="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
												aria-label={`Remove ${toolkit.name} app tools`}
												onclick={() => toggleComposioToolkit(toolkit.slug)}
											>
												<HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} class="size-3" />
											</button>
										</span>
									{/each}
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
									<DropdownMenu.Root bind:open={composioPickerOpen}>
										<DropdownMenu.Trigger
											type="button"
											class={cn(
												'inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
												selectedComposioToolkits.length > 0
													? 'bg-muted text-foreground'
													: 'text-muted-foreground hover:bg-muted hover:text-foreground'
											)}
											disabled={isChatBusy}
											aria-label={`Select external app tools. ${composioScopeLabel}`}
										>
											<HugeiconsIcon
												icon={Plug02Icon}
												strokeWidth={2}
												class="size-3"
												aria-hidden="true"
											/>
											<span>Apps</span>
											{#if selectedComposioToolkits.length > 0}
												<span
													class="rounded-sm bg-background/80 px-1 text-[10px] leading-4 text-muted-foreground ring-1 ring-border/70"
													aria-label={`${selectedComposioToolkits.length} selected apps`}
												>
													{selectedComposioToolkits.length}
												</span>
											{/if}
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="start" class="w-72 max-w-[calc(100vw-1rem)] p-1.5">
											<div class="px-2 py-1.5">
												<div class="flex items-start justify-between gap-3">
													<div class="min-w-0 space-y-0.5">
														<DropdownMenu.Label class="p-0 text-xs font-semibold text-foreground">
															Apps
														</DropdownMenu.Label>
														<p class="text-[11px] leading-4 text-muted-foreground">
															{#if selectedComposioToolkits.length > 0}
																Only selected apps are available.
															{:else}
																All app tools are available.
															{/if}
														</p>
													</div>
													{#if selectedComposioToolkits.length > 0}
														<button
															type="button"
															class="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
															onclick={clearComposioToolkits}
														>
															Use all apps
														</button>
													{/if}
												</div>
											</div>
											<DropdownMenu.Separator />
											{#if composioToolkitsLoading}
												<div class="space-y-1 px-1 py-1.5" aria-label="Loading apps">
													{#each Array.from({ length: 4 }, (_, index) => index) as index (index)}
														<div class="flex h-8 items-center gap-2 rounded-md px-2">
															<span class="size-4 rounded-sm bg-muted"></span>
															<span class="h-3 w-24 rounded bg-muted"></span>
															<span class="ml-auto h-3 w-14 rounded bg-muted"></span>
														</div>
													{/each}
												</div>
											{:else if composioToolkitsError}
												<div class="px-2 py-3 text-xs leading-5 text-muted-foreground">
													{composioToolkitsError}
												</div>
											{:else if !composioToolkitsAvailable && composioToolkitsLoadedForThread === activeThreadId}
												<div class="px-2 py-3 text-xs leading-5 text-muted-foreground">
													Apps are not configured.
												</div>
											{:else if orderedComposioToolkits.length === 0}
												<div class="px-2 py-3 text-xs leading-5 text-muted-foreground">
													No app tools are available.
												</div>
											{:else}
												<div class="max-h-72 overflow-y-auto py-1">
													{#each orderedComposioToolkits as toolkit (toolkit.slug)}
														<DropdownMenu.CheckboxItem
															checked={selectedComposioToolkits.includes(toolkit.slug)}
															disabled={!composioToolkitsAvailable || isChatBusy}
															class="min-h-8 gap-2 pr-7 pl-2"
															onSelect={(event) => event.preventDefault()}
															onclick={() => toggleComposioToolkit(toolkit.slug)}
														>
															<span class="flex min-w-0 flex-1 items-center gap-2">
																<span
																	class="flex size-4 shrink-0 items-center justify-center rounded-sm bg-muted ring-1 ring-border/70"
																>
																	{#if toolkit.logo}
																		<img src={toolkit.logo} alt="" class="size-3.5 rounded-[3px]" />
																	{:else}
																		<span
																			class="size-1.5 rounded-full bg-muted-foreground/60"
																			aria-hidden="true"
																		></span>
																	{/if}
																</span>
																<span class="truncate font-medium">{toolkit.name}</span>
															</span>
															<span
																class={cn(
																	'shrink-0 text-[10px]',
																	toolkit.connected
																		? 'text-muted-foreground'
																		: 'text-muted-foreground/80'
																)}
															>
																{toolkit.connected ? 'Connected' : 'Connect if needed'}
															</span>
														</DropdownMenu.CheckboxItem>
													{/each}
												</div>
											{/if}
										</DropdownMenu.Content>
									</DropdownMenu.Root>
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
								<PromptInputSubmit
									class="size-8 shrink-0"
									status={chat?.status ?? 'ready'}
									onStop={stopAssistantGeneration}
									disabled={!canSubmit && !isChatBusy}
								>
									{#if isChatBusy}
										<HugeiconsIcon icon={SquareIcon} strokeWidth={2} class="size-3.5" />
									{:else}
										<HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} class="size-4" />
									{/if}
								</PromptInputSubmit>
							</PromptInputToolbar>
						</PromptInput>
					</div>
				</div>
			{/snippet}

			{#snippet chatColumn()}
				<div class="flex min-h-0 min-w-0 flex-1 flex-col">
					<div class="min-h-0 min-w-0 flex-1">
						{@render threadConversation()}
					</div>
					{@render threadComposer()}
				</div>
			{/snippet}

			<div
				class="flex min-h-0 flex-1 flex-col"
				in:fly|local={threadReadyIn}
				out:fade|local={threadReadyOut}
			>
				{#if !contextPanelOpen || !mediaMinLg}
					{#if !contextPanelOpen}
						{@render chatColumn()}
					{:else}
						{@render threadContextAside('h-full min-h-0 w-full flex-1 overflow-hidden')}
					{/if}
				{:else}
					<PaneGroup
						direction="horizontal"
						autoSaveId="workspace-thread-context"
						class="min-h-0 w-full flex-1 overflow-hidden"
					>
						<Pane defaultSize={70} minSize={50} class="flex min-h-0 min-w-0 flex-col">
							{@render chatColumn()}
						</Pane>
						<Handle withHandle />
						<Pane defaultSize={30} minSize={20} maxSize={45} class="flex min-h-0 min-w-0 flex-col">
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
