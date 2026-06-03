<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
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
	import { auth, getConvexClient } from '$lib/auth.svelte';
	import { artifactTypeLabel } from '$lib/artifact-display';
	import { listProjectArtifactsQuery, type SavedArtifact } from '$lib/artifacts';
	import { createThreadMutation, listThreadsQuery, type SavedChatThread } from '$lib/chat';
	import {
		listLaunchpadActionsForProjectQuery,
		listProjectActivityEventsQuery,
		type LaunchpadAction,
		type LaunchpadActionProvider,
		type LaunchpadActionSourceKind,
		type ProjectActivityEvent
	} from '$lib/launchpad-actions';
	import {
		findLaunchpadActionPreset,
		launchpadActionEventLabel,
		launchpadActionPresets,
		type LaunchpadActionEvent,
		type LaunchpadActionPresetId
	} from '$lib/launchpad-action-presets';
	import {
		defaultIdeaAiModelId,
		getModelSelectorLogoProvider,
		ideaAiModels,
		listIdeaModelsByProvider,
		type IdeaAiModelId
	} from '$lib/idea-ai-models';
	import { ideaAiModelProviderGroups } from '$lib/idea-ai-model-selector';
	import type { SavedProject } from '$lib/projects';
	import { formatThreadTitleForDisplay } from '$lib/thread-title';
	import { workspaceArtifactHref, workspaceThreadHref } from '$lib/workspace-route-contract';
	import { markThreadForAutoStart } from '$lib/workspace-thread-start';
	import { cn } from '$lib/utils';
	import {
		ArrowDown01Icon,
		ArrowUp01Icon,
		File01Icon,
		GithubIcon,
		LinkSquare01Icon,
		Message01Icon,
		PauseIcon,
		PlayIcon,
		TimeQuarterPassIcon
	} from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { useQuery } from 'convex-svelte';
	import type { Id } from '../../../convex/_generated/dataModel';

	let { project, projectId }: { project: SavedProject; projectId: string } = $props();

	let text = $state('');
	let textareaRef = $state<HTMLTextAreaElement | null>(null);
	let modelSelectorOpen = $state(false);
	let selectedModelId = $state<IdeaAiModelId>(defaultIdeaAiModelId);
	let submitError = $state('');
	let isSubmitting = $state(false);
	let selectedActionPresetId = $state<LaunchpadActionPresetId>('github_repository_activity');
	let actionSourceValue = $state('');
	let actionSourceName = $state('');
	let actionTeamId = $state('');
	let actionBranch = $state('');
	let actionEventId = $state('');
	let actionFormOpen = $state(false);
	let actionError = $state('');
	let actionNotice = $state('');
	let isCreatingAction = $state(false);
	let updatingActionId = $state('');
	let triggerTypesLoading = $state(false);
	let triggerTypesError = $state('');
	let triggerTypesProvider = $state<LaunchpadActionProvider | ''>('');
	let triggerTypes = $state<ComposioTriggerType[]>([]);

	const threads = useQuery(listThreadsQuery, () =>
		auth.isAuthenticated && projectId ? { projectId: projectId as Id<'projects'> } : 'skip'
	);
	const artifacts = useQuery(listProjectArtifactsQuery, () =>
		auth.isAuthenticated && projectId ? { projectId: projectId as Id<'projects'> } : 'skip'
	);
	const launchpadActions = useQuery(listLaunchpadActionsForProjectQuery, () =>
		auth.isAuthenticated && projectId ? { projectId: projectId as Id<'projects'> } : 'skip'
	);
	const projectActivityEvents = useQuery(listProjectActivityEventsQuery, () =>
		auth.isAuthenticated && projectId
			? { projectId: projectId as Id<'projects'>, limit: 25 }
			: 'skip'
	);

	const suggestions = [
		{
			label: 'Scope next build',
			prompt:
				'Help me scope the next useful build for this project. Focus on the smallest shippable step.'
		},
		{
			label: 'Find open risks',
			prompt:
				'Review this project direction and help me identify the biggest unresolved risks or assumptions.'
		},
		{
			label: 'Draft requirements',
			prompt:
				'Turn the current project context into clear first-version requirements and non-goals.'
		},
		{
			label: 'Plan implementation',
			prompt: 'Help me turn this project into a practical implementation plan with ordered steps.'
		}
	] as const;

	const selectedModel = $derived(
		ideaAiModels.find((model) => model.id === selectedModelId) ?? ideaAiModels[0]
	);
	const canSubmit = $derived(Boolean(text.trim()) && !isSubmitting);
	const estimatedInputTokens = $derived(Math.ceil(text.trim().length / 4));
	const maxContextTokens = $derived(selectedModel.maxContextTokens);
	const projectThreads = $derived(threads.data ?? []);
	const projectArtifacts = $derived(artifacts.data ?? []);
	const projectActions = $derived(launchpadActions.data ?? []);
	const externalActivity = $derived(projectActivityEvents.data ?? []);
	const selectedActionPreset = $derived(
		findLaunchpadActionPreset(selectedActionPresetId) ?? launchpadActionPresets[0]
	);
	const selectedActionEvent = $derived(
		selectedActionPreset.events.find((event) => event.id === actionEventId) ??
			selectedActionPreset.events[0]
	);
	const actionEventRows = $derived(
		selectedActionPreset.events.map((event) => {
			const providerTypes =
				triggerTypesProvider === selectedActionPreset.provider ? triggerTypes : [];
			return {
				event,
				trigger: findMatchingTriggerType(providerTypes, event)
			};
		})
	);
	const selectedActionEventAvailable = $derived(
		actionEventRows.some((row) => row.event.id === selectedActionEvent.id && row.trigger)
	);
	const selectedActionTrigger = $derived(
		actionEventRows.find((row) => row.event.id === selectedActionEvent.id)?.trigger
	);
	const selectedActionNeedsTeamId = $derived(
		selectedActionPreset.sourceKind === 'linear_project' &&
			Boolean(selectedActionTrigger && triggerRequiresConfigKey(selectedActionTrigger, 'team_id'))
	);
	const selectedActionNeedsBranch = $derived(
		selectedActionPreset.sourceKind === 'github_repository' &&
			Boolean(selectedActionTrigger && triggerRequiresConfigKey(selectedActionTrigger, 'branch'))
	);
	const selectedActionHasUnsupportedConfig = $derived.by(() => {
		if (!selectedActionTrigger) return false;
		return missingRequiredConfigKeys(selectedActionTrigger).length > 0;
	});
	const canCreateAction = $derived(
		Boolean(actionSourceValue.trim()) &&
			(!selectedActionNeedsTeamId || Boolean(actionTeamId.trim())) &&
			(!selectedActionNeedsBranch || Boolean(actionBranch.trim())) &&
			Boolean(selectedActionEvent) &&
			selectedActionEventAvailable &&
			!selectedActionHasUnsupportedConfig
	);
	const latestThread = $derived(projectThreads[0] ?? null);
	const latestArtifact = $derived(projectArtifacts[0] ?? null);
	const lastUpdated = $derived(
		Math.max(
			project.updatedAt,
			...projectThreads.map((thread) => thread.updatedAt),
			...projectArtifacts.map((artifact) => artifact.updatedAt)
		)
	);
	const recentActivity = $derived.by(() => {
		const items = [
			...externalActivity.slice(0, 8).map((event) => ({
				kind: `${providerLabel(event.provider)} ${event.eventType}`,
				title: activityTitle(event),
				time: event.createdAt,
				href: event.externalUrl ?? '',
				external: Boolean(event.externalUrl)
			})),
			...projectThreads.slice(0, 3).map((thread) => ({
				kind: 'Thread updated',
				title: formatThreadTitleForDisplay(thread.title),
				time: thread.updatedAt,
				href: workspaceThreadHref(thread),
				external: false
			})),
			...projectArtifacts.slice(0, 3).map((artifact) => ({
				kind: 'Artifact updated',
				title: artifact.title,
				time: artifact.updatedAt,
				href: workspaceArtifactHref(artifact._id),
				external: false
			})),
			{
				kind: 'Project updated',
				title: project.name,
				time: project.updatedAt,
				href: '',
				external: false
			}
		];
		return items.sort((a, b) => b.time - a.time).slice(0, 8);
	});

	$effect(() => {
		if (!actionEventId) actionEventId = selectedActionPreset.events[0]?.id ?? '';
	});

	$effect(() => {
		if (!auth.isAuthenticated || !auth.token || !actionFormOpen) return;
		if (triggerTypesProvider === selectedActionPreset.provider || triggerTypesLoading) return;
		void loadTriggerTypes();
	});

	const formatRelativeTime = (time: number) => {
		const diff = Date.now() - time;
		const minutes = Math.max(1, Math.round(diff / 60000));
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.round(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.round(hours / 24);
		if (days < 14) return `${days}d ago`;
		return new Date(time).toLocaleDateString();
	};

	const fillComposer = (prompt: string) => {
		text = prompt;
		submitError = '';
		requestAnimationFrame(() => textareaRef?.focus());
	};

	const focusComposer = () => {
		requestAnimationFrame(() => textareaRef?.focus());
	};

	const selectModel = (modelId: IdeaAiModelId) => {
		selectedModelId = modelId;
		modelSelectorOpen = false;
		focusComposer();
	};

	function selectActionPreset(presetId: LaunchpadActionPresetId) {
		selectedActionPresetId = presetId;
		const preset = findLaunchpadActionPreset(presetId) ?? launchpadActionPresets[0];
		actionEventId = preset.events[0]?.id ?? '';
		actionSourceValue = '';
		actionSourceName = '';
		actionTeamId = '';
		actionBranch = '';
		actionError = '';
		actionNotice = '';
	}

	const submitMessage = async (message: PromptInputMessage) => {
		const nextText = message.text.trim();
		if (!nextText || isSubmitting) return;

		isSubmitting = true;
		submitError = '';

		try {
			const result = await getConvexClient().mutation(createThreadMutation, {
				text: nextText,
				modelId: selectedModelId,
				projectId: projectId as Id<'projects'>
			});
			markThreadForAutoStart(result.threadId);
			await goto(resolve(workspaceThreadHref(result.threadId) as `/workspace/thread/${string}`));
		} catch (error) {
			console.error(error);
			submitError = 'Could not start this project thread. Please try again.';
		} finally {
			isSubmitting = false;
		}
	};

	const openCreateArtifactDialog = () => {
		window.dispatchEvent(new CustomEvent('launchpad:create-artifact'));
	};

	async function loadTriggerTypes() {
		if (!auth.token) return;

		triggerTypesLoading = true;
		triggerTypesError = '';
		try {
			const response = await fetch(
				`/api/workspace/launchpad-actions?provider=${encodeURIComponent(selectedActionPreset.provider)}`,
				{ headers: authHeaders() }
			);
			const result = (await response.json().catch(() => null)) as {
				available?: boolean;
				triggers?: ComposioTriggerType[];
				error?: string;
			} | null;
			if (!response.ok) {
				throw new Error(result?.error || 'Could not load Composio triggers.');
			}

			triggerTypes = Array.isArray(result?.triggers) ? result.triggers.filter(isTriggerType) : [];
			triggerTypesProvider = selectedActionPreset.provider;
		} catch (error) {
			console.error(error);
			triggerTypesError =
				error instanceof Error && error.message ? error.message : 'Could not load triggers.';
			triggerTypes = [];
		} finally {
			triggerTypesLoading = false;
		}
	}

	async function createLaunchpadAction() {
		if (!auth.token || isCreatingAction) return;

		const validationError = validateActionForm();
		if (validationError) {
			actionError = validationError;
			return;
		}

		isCreatingAction = true;
		actionError = '';
		actionNotice = '';
		try {
			const response = await fetch('/api/workspace/launchpad-actions', {
				method: 'POST',
				headers: {
					...authHeaders(),
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					projectId,
					presetId: selectedActionPreset.id,
					eventId: selectedActionEvent.id,
					sourceValue: actionSourceValue,
					sourceName: actionSourceName,
					teamId: actionTeamId,
					branch: actionBranch
				})
			});
			const result = (await response.json().catch(() => null)) as { error?: string } | null;
			if (!response.ok) {
				throw new Error(result?.error || 'Could not create Launchpad Action.');
			}

			actionSourceName = '';
			actionSourceValue = '';
			actionTeamId = '';
			actionBranch = '';
			actionNotice = 'Launchpad Action created.';
		} catch (error) {
			console.error(error);
			actionError =
				error instanceof Error && error.message
					? error.message
					: 'Could not create Launchpad Action.';
		} finally {
			isCreatingAction = false;
		}
	}

	async function setActionEnabled(action: LaunchpadAction, enabled: boolean) {
		if (!auth.token || updatingActionId) return;

		updatingActionId = action._id;
		actionError = '';
		actionNotice = '';
		try {
			const response = await fetch(`/api/workspace/launchpad-actions/${action._id}`, {
				method: 'PATCH',
				headers: {
					...authHeaders(),
					'content-type': 'application/json'
				},
				body: JSON.stringify({ enabled })
			});
			const result = (await response.json().catch(() => null)) as { error?: string } | null;
			if (!response.ok) {
				throw new Error(result?.error || 'Could not update Launchpad Action.');
			}
			actionNotice = enabled ? 'Launchpad Action resumed.' : 'Launchpad Action paused.';
		} catch (error) {
			console.error(error);
			actionError =
				error instanceof Error && error.message
					? error.message
					: 'Could not update Launchpad Action.';
		} finally {
			updatingActionId = '';
		}
	}

	async function deleteAction(action: LaunchpadAction) {
		if (!auth.token || updatingActionId) return;

		updatingActionId = action._id;
		actionError = '';
		actionNotice = '';
		try {
			const response = await fetch(`/api/workspace/launchpad-actions/${action._id}`, {
				method: 'DELETE',
				headers: authHeaders()
			});
			const result = (await response.json().catch(() => null)) as { error?: string } | null;
			if (!response.ok) {
				throw new Error(result?.error || 'Could not delete Launchpad Action.');
			}
			actionNotice = 'Launchpad Action removed.';
		} catch (error) {
			console.error(error);
			actionError =
				error instanceof Error && error.message
					? error.message
					: 'Could not delete Launchpad Action.';
		} finally {
			updatingActionId = '';
		}
	}

	function authHeaders() {
		return { authorization: `Bearer ${auth.token}` };
	}

	function isTriggerType(value: unknown): value is ComposioTriggerType {
		if (!value || typeof value !== 'object') return false;
		const item = value as Partial<ComposioTriggerType>;
		return typeof item.slug === 'string' && typeof item.name === 'string';
	}

	function validateActionForm() {
		const sourceValue = actionSourceValue.trim();
		if (!sourceValue) return `${selectedActionPreset.sourceLabel} is required.`;
		if (selectedActionPreset.sourceKind === 'github_repository') {
			const parts = sourceValue.split('/').map((part) => part.trim());
			if (parts.length !== 2 || !parts[0] || !parts[1]) {
				return 'Repository must use owner/repo format.';
			}
		}
		if (selectedActionNeedsTeamId && !actionTeamId.trim()) return 'Linear team id is required.';
		if (selectedActionNeedsBranch && !actionBranch.trim()) return 'Branch is required.';
		if (selectedActionHasUnsupportedConfig) {
			return 'Selected event requires configuration this setup does not support yet.';
		}
		if (!selectedActionEventAvailable) return 'Selected event is not available.';
		return '';
	}

	function actionEventDisplayLabel(action: LaunchpadAction) {
		const configured = action.triggerConfig?.launchpadEventLabel;
		if (typeof configured === 'string' && configured.trim()) return configured;
		const eventId = action.triggerConfig?.launchpadEventId;
		if (typeof eventId === 'string') {
			const label = launchpadActionEventLabel(eventId);
			if (label) return label;
		}
		return action.triggerSlug;
	}

	function findMatchingTriggerType(triggers: ComposioTriggerType[], event: LaunchpadActionEvent) {
		return triggers.find((trigger) => triggerMatchesEvent(trigger, event));
	}

	function triggerMatchesEvent(trigger: ComposioTriggerType, event: LaunchpadActionEvent) {
		const haystack = triggerText(trigger);
		return (
			event.matchAll.every((term) => haystack.includes(normalizeTriggerTerm(term))) &&
			(!event.matchAny ||
				event.matchAny.some((term) => haystack.includes(normalizeTriggerTerm(term))))
		);
	}

	function triggerText(trigger: ComposioTriggerType) {
		return normalizeTriggerTerm(`${trigger.slug} ${trigger.name} ${trigger.description ?? ''}`);
	}

	function triggerRequiresConfigKey(trigger: ComposioTriggerType, key: string) {
		const required = trigger.config?.required;
		return Array.isArray(required) && required.includes(key);
	}

	function missingRequiredConfigKeys(trigger: ComposioTriggerType) {
		const required = trigger.config?.required;
		if (!Array.isArray(required)) return [];
		const supported = [
			'owner',
			'repo',
			'project_id',
			'team_id',
			...(selectedActionEvent.optionalConfigKeys ?? [])
		];
		return required.filter(
			(key): key is string => typeof key === 'string' && !supported.includes(key)
		);
	}

	function normalizeTriggerTerm(value: string) {
		return value.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
	}

	function providerLabel(provider: LaunchpadActionProvider) {
		return provider === 'github' ? 'GitHub' : 'Linear';
	}

	function sourceKindLabel(kind: LaunchpadActionSourceKind) {
		if (kind === 'github_repository') return 'GitHub repository';
		if (kind === 'linear_team') return 'Linear team';
		return 'Linear project';
	}

	function actionStatusLabel(action: LaunchpadAction) {
		if (action.status === 'needs_attention') return 'Needs attention';
		return action.status === 'active' ? 'Active' : 'Paused';
	}

	function activityTitle(event: ProjectActivityEvent) {
		return event.actor ? `${event.title} by ${event.actor}` : event.title;
	}

	function openExternalActivity(url: string) {
		window.open(url, '_blank', 'noopener,noreferrer');
	}

	const rowClass =
		'group block rounded-md border border-transparent px-2.5 py-2 transition-colors hover:border-border/70 hover:bg-accent/35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';
	const quietPanelClass = 'rounded-lg border border-border/70 bg-card/35 p-3';

	type ComposioTriggerType = {
		slug: string;
		name: string;
		description?: string;
		type?: string;
		config?: Record<string, unknown>;
	};
</script>

<section class="h-full min-h-0 overflow-y-auto bg-background text-foreground">
	<div class="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
		<header
			class="flex flex-col gap-3 border-b border-border/70 pb-4 lg:flex-row lg:items-end lg:justify-between"
		>
			<div class="min-w-0 space-y-1.5">
				<p class="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Project</p>
				<h1 class="truncate text-xl font-semibold tracking-tight">{project.name}</h1>
				<p class="max-w-3xl text-xs leading-5 text-pretty text-muted-foreground">
					{project.summary?.trim() ||
						'No summary yet. Start a project thread to shape the current direction.'}
				</p>
			</div>
			<div class="grid shrink-0 grid-cols-3 gap-4 text-left lg:text-right">
				<div>
					<p class="text-sm font-semibold tabular-nums">{projectThreads.length}</p>
					<p class="text-[10px] text-muted-foreground uppercase">Threads</p>
				</div>
				<div>
					<p class="text-sm font-semibold tabular-nums">{projectArtifacts.length}</p>
					<p class="text-[10px] text-muted-foreground uppercase">Artifacts</p>
				</div>
				<div>
					<p class="text-sm font-semibold tabular-nums">{formatRelativeTime(lastUpdated)}</p>
					<p class="text-[10px] text-muted-foreground uppercase">Updated</p>
				</div>
			</div>
		</header>

		<section class="rounded-xl border border-border/70 bg-card p-3 ring-1 ring-border/30 sm:p-4">
			<div class="mb-3 flex flex-col gap-1 px-1 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h2 class="text-base font-semibold tracking-tight">Start the next project thread</h2>
					<p class="mt-1 text-xs leading-5 text-muted-foreground">
						Use this project’s threads, artifacts, and imported activity as context.
					</p>
				</div>
			</div>

			<PromptInput
				class="w-full overflow-hidden rounded-lg border border-border/70 bg-background shadow-none"
				clearOnSubmit={false}
				onSubmit={submitMessage}
			>
				<PromptInputTextarea
					bind:ref={textareaRef}
					bind:value={text}
					class="min-h-28 px-3.5 py-3.5 text-sm leading-6 focus-visible:ring-0 sm:min-h-32"
					placeholder="Ask about the next build, unresolved risk, user story, requirements, or implementation plan…"
				/>
				<PromptInputToolbar class="flex items-center gap-2 border-t border-border/60 px-3 py-2">
					<PromptInputTools class="min-w-0 flex-1 flex-wrap gap-1.5">
						<ModelSelector bind:open={modelSelectorOpen}>
							<ModelSelectorTrigger
								class="inline-flex h-7 max-w-full min-w-0 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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

			{#if submitError}
				<p class="mt-2 px-1 text-xs text-destructive">{submitError}</p>
			{/if}

			<Suggestions class="mt-3 gap-1.5 py-0" scrollbarXClasses="hidden">
				{#each suggestions as suggestion (suggestion.label)}
					<Suggestion
						suggestion={suggestion.label}
						variant="ghost"
						class="h-7 px-2.5 text-[11px] text-muted-foreground hover:bg-accent/50 hover:text-foreground"
						onclick={() => fillComposer(suggestion.prompt)}
					>
						{suggestion.label}
					</Suggestion>
				{/each}
			</Suggestions>
		</section>

		<section class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
			{#if latestThread}
				<a
					class={cn(rowClass, 'bg-card/35')}
					href={resolve(workspaceThreadHref(latestThread) as '/workspace')}
				>
					<p class="text-[10px] font-medium text-muted-foreground uppercase">
						Continue latest thread
					</p>
					<p class="mt-1 truncate text-xs font-medium">
						{formatThreadTitleForDisplay(latestThread.title)}
					</p>
				</a>
			{:else}
				<button type="button" class={cn(rowClass, 'bg-card/35 text-left')} onclick={focusComposer}>
					<p class="text-[10px] font-medium text-muted-foreground uppercase">Start first thread</p>
					<p class="mt-1 text-xs font-medium">Focus the composer</p>
				</button>
			{/if}
			{#if latestArtifact}
				<a
					class={cn(rowClass, 'bg-card/35')}
					href={resolve(workspaceArtifactHref(latestArtifact._id) as '/workspace')}
				>
					<p class="text-[10px] font-medium text-muted-foreground uppercase">
						Review latest artifact
					</p>
					<p class="mt-1 truncate text-xs font-medium">{latestArtifact.title}</p>
				</a>
			{:else}
				<div class={cn(rowClass, 'bg-card/35')}>
					<p class="text-[10px] font-medium text-muted-foreground uppercase">Artifacts saved</p>
					<p class="mt-1 text-xs font-medium">No durable context yet</p>
				</div>
			{/if}
			<button
				type="button"
				class={cn(rowClass, 'bg-card/35 text-left')}
				onclick={openCreateArtifactDialog}
			>
				<p class="text-[10px] font-medium text-muted-foreground uppercase">Create artifact</p>
				<p class="mt-1 text-xs font-medium">Save durable context</p>
			</button>
			<button
				type="button"
				class={cn(rowClass, 'bg-card/35 text-left')}
				onclick={() => (actionFormOpen = true)}
			>
				<p class="text-[10px] font-medium text-muted-foreground uppercase">Actions connected</p>
				<p class="mt-1 text-xs font-medium">
					{projectActions.length} GitHub or Linear source{projectActions.length === 1 ? '' : 's'}
				</p>
			</button>
		</section>

		<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)]">
			<div class="space-y-4">
				<section class={quietPanelClass}>
					<h2 class="mb-2 px-1 text-sm font-semibold tracking-tight">Active threads</h2>
					{#if threads.data === undefined}
						{@render SkeletonRows(4)}
					{:else if projectThreads.length === 0}
						<p class="px-1 py-3 text-xs leading-5 text-muted-foreground">
							No project threads yet. Start one above to shape the next decision.
						</p>
					{:else}
						<div class="space-y-1">
							{#each projectThreads.slice(0, 6) as thread (thread._id)}
								{@render ThreadRow(thread)}
							{/each}
						</div>
					{/if}
				</section>

				<section class={quietPanelClass}>
					<h2 class="mb-2 px-1 text-sm font-semibold tracking-tight">Artifacts</h2>
					{#if artifacts.data === undefined}
						{@render SkeletonRows(3)}
					{:else if projectArtifacts.length === 0}
						<p class="px-1 py-3 text-xs leading-5 text-muted-foreground">
							No artifacts saved yet. Save decisions, requirements, or plans as they become durable.
						</p>
					{:else}
						<div class="space-y-1">
							{#each projectArtifacts.slice(0, 5) as artifact (artifact._id)}
								{@render ArtifactRow(artifact)}
							{/each}
						</div>
					{/if}
				</section>
			</div>

			<div class="space-y-4">
				<section class={quietPanelClass}>
					<div class="mb-3 flex items-start justify-between gap-3 px-1">
						<div>
							<h2 class="text-sm font-semibold tracking-tight">Launchpad Actions</h2>
							<p class="mt-0.5 text-[11px] text-muted-foreground">
								Capture GitHub and Linear activity into this project.
							</p>
						</div>
						<button
							type="button"
							class="h-7 rounded-md border border-border/70 px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
							onclick={() => (actionFormOpen = !actionFormOpen)}
						>
							{actionFormOpen ? 'Hide setup' : 'Add action'}
						</button>
					</div>

					{#if actionFormOpen}
						<div class="mb-3 rounded-lg border border-border/70 bg-background/70 p-3">
							<div class="grid gap-2">
								<label class="space-y-1 text-[11px] font-medium text-muted-foreground"
									><span>Action preset</span><select
										bind:value={selectedActionPresetId}
										class="h-8 w-full rounded-md border border-border/70 bg-background px-2 text-xs text-foreground"
										disabled={isCreatingAction}
										onchange={() => selectActionPreset(selectedActionPresetId)}
										>{#each launchpadActionPresets as preset (preset.id)}<option value={preset.id}
												>{preset.label}</option
											>{/each}</select
									></label
								>
								<p class="text-[11px] leading-4 text-muted-foreground">
									{selectedActionPreset.description}
								</p>
							</div>

							<div class="mt-3 grid gap-2 sm:grid-cols-2">
								<label class="space-y-1 text-[11px] font-medium text-muted-foreground"
									><span>{selectedActionPreset.sourceLabel}</span><input
										bind:value={actionSourceValue}
										class="h-8 w-full rounded-md border border-border/70 bg-background px-2 text-xs text-foreground"
										placeholder={selectedActionPreset.sourcePlaceholder}
										disabled={isCreatingAction}
									/>
									<span class="block text-[10px] leading-4 font-normal text-muted-foreground">
										{selectedActionPreset.sourceHelp}
									</span></label
								>
								{#if selectedActionPreset.provider === 'linear'}
									<label class="space-y-1 text-[11px] font-medium text-muted-foreground"
										><span>Display name</span><input
											bind:value={actionSourceName}
											class="h-8 w-full rounded-md border border-border/70 bg-background px-2 text-xs text-foreground"
											placeholder={selectedActionPreset.sourceKind === 'linear_team'
												? 'Launchpad team'
												: 'Launchpad project'}
											disabled={isCreatingAction}
										/>
										<span class="block text-[10px] leading-4 font-normal text-muted-foreground">
											Optional label shown in project activity.
										</span></label
									>
								{/if}
								{#if selectedActionNeedsBranch}
									<label class="space-y-1 text-[11px] font-medium text-muted-foreground"
										><span>Branch</span><input
											bind:value={actionBranch}
											class="h-8 w-full rounded-md border border-border/70 bg-background px-2 text-xs text-foreground"
											placeholder="main"
											disabled={isCreatingAction}
										/>
										<span class="block text-[10px] leading-4 font-normal text-muted-foreground">
											Required by this GitHub event.
										</span></label
									>
								{/if}
								{#if selectedActionNeedsTeamId}
									<label class="space-y-1 text-[11px] font-medium text-muted-foreground"
										><span>Team id</span><input
											bind:value={actionTeamId}
											class="h-8 w-full rounded-md border border-border/70 bg-background px-2 text-xs text-foreground"
											placeholder="team-id-or-key"
											disabled={isCreatingAction}
										/>
										<span class="block text-[10px] leading-4 font-normal text-muted-foreground">
											Required by this Linear event.
										</span></label
									>
								{/if}
							</div>

							<div class="mt-3 grid gap-2">
								<label class="space-y-1 text-[11px] font-medium text-muted-foreground"
									><span>Event type</span><select
										bind:value={actionEventId}
										class="h-8 w-full rounded-md border border-border/70 bg-background px-2 text-xs text-foreground"
										disabled={isCreatingAction || triggerTypesLoading}
										>{#each actionEventRows as row (row.event.id)}<option
												value={row.event.id}
												disabled={!row.trigger}
												>{row.event.label}{row.trigger ? '' : ' (unavailable)'}</option
											>{/each}</select
									></label
								>
								{#if triggerTypesLoading}
									<p class="text-[11px] text-muted-foreground">Loading available events…</p>
								{:else if triggerTypesError}
									<div class="flex items-center justify-between gap-2">
										<p class="text-[11px] text-destructive">{triggerTypesError}</p>
										<button
											type="button"
											class="h-7 rounded-md border border-border/70 px-2 text-[11px] text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
											onclick={loadTriggerTypes}>Retry</button
										>
									</div>
								{:else if !selectedActionEventAvailable}
									<p class="text-[11px] leading-4 text-muted-foreground">
										This event is not available from Composio right now.
									</p>
								{:else if selectedActionHasUnsupportedConfig}
									<p class="text-[11px] leading-4 text-muted-foreground">
										This event requires setup fields Launchpad does not support yet.
									</p>
								{/if}
							</div>

							<div class="mt-2 flex flex-wrap items-center justify-between gap-2">
								<div class="min-h-4 text-[11px]">
									{#if actionError}<span class="text-destructive">{actionError}</span
										>{:else if actionNotice}<span class="text-muted-foreground">{actionNotice}</span
										>{/if}
								</div>
								<button
									type="button"
									class="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
									disabled={isCreatingAction || !canCreateAction}
									onclick={createLaunchpadAction}
									><HugeiconsIcon
										icon={PlayIcon}
										strokeWidth={2}
										class="size-3.5"
									/>{isCreatingAction ? 'Creating…' : 'Create action'}</button
								>
							</div>
						</div>
					{/if}

					{#if launchpadActions.data === undefined}
						{@render SkeletonRows(2)}
					{:else if projectActions.length === 0}
						<p class="px-1 py-3 text-xs leading-5 text-muted-foreground">
							No actions connected. Add GitHub or Linear when external activity should become
							project context.
						</p>
					{:else}
						<div class="space-y-1">
							{#each projectActions as action (action._id)}
								{@render ActionRow(action)}
							{/each}
						</div>
					{/if}
				</section>

				<section class={quietPanelClass}>
					<h2 class="mb-2 px-1 text-sm font-semibold tracking-tight">Recent activity</h2>
					{#if threads.data === undefined || artifacts.data === undefined || projectActivityEvents.data === undefined}
						{@render SkeletonRows(4)}
					{:else if recentActivity.length === 0}
						<p class="px-1 py-3 text-xs leading-5 text-muted-foreground">
							No recent project activity yet.
						</p>
					{:else}
						<div class="space-y-1">
							{#each recentActivity as item (`${item.kind}-${item.time}-${item.title}`)}
								{#if item.href}
									{#if item.external}
										<button
											type="button"
											class={cn(rowClass, 'w-full text-left')}
											onclick={() => openExternalActivity(item.href)}
											>{@render ActivityRow(item.kind, item.title, item.time)}</button
										>
									{:else}
										<a class={rowClass} href={resolve(item.href as '/workspace')}
											>{@render ActivityRow(item.kind, item.title, item.time)}</a
										>
									{/if}
								{:else}
									<div class="px-2.5 py-2">
										{@render ActivityRow(item.kind, item.title, item.time)}
									</div>
								{/if}
							{/each}
						</div>
					{/if}
				</section>
			</div>
		</div>
	</div>
</section>

{#snippet SkeletonRows(count: number)}
	<div class="space-y-2 px-1 py-1" aria-hidden="true">
		{#each Array.from({ length: count }, (_row, index) => index) as index (index)}
			<div class="h-9 animate-pulse rounded-md bg-muted/70"></div>
		{/each}
	</div>
{/snippet}

{#snippet ThreadRow(thread: SavedChatThread)}
	<a class={rowClass} href={resolve(workspaceThreadHref(thread) as '/workspace')}>
		<div class="flex items-start gap-2">
			<HugeiconsIcon
				icon={Message01Icon}
				strokeWidth={2}
				class="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
			/>
			<div class="min-w-0 flex-1">
				<p class="truncate text-xs font-medium">{formatThreadTitleForDisplay(thread.title)}</p>
				<p class="mt-0.5 text-[11px] text-muted-foreground">
					Updated {formatRelativeTime(thread.updatedAt)}
				</p>
			</div>
		</div>
	</a>
{/snippet}

{#snippet ArtifactRow(artifact: SavedArtifact)}
	<a class={rowClass} href={resolve(workspaceArtifactHref(artifact._id) as '/workspace')}>
		<div class="flex items-start gap-2">
			<HugeiconsIcon
				icon={File01Icon}
				strokeWidth={2}
				class="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
			/>
			<div class="min-w-0 flex-1">
				<div class="flex min-w-0 items-center gap-2">
					<p class="truncate text-xs font-medium">{artifact.title}</p>
					<span class="shrink-0 text-[10px] text-muted-foreground"
						>{artifactTypeLabel(artifact.type)}</span
					>
				</div>
				<p class="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
					{artifact.contentMarkdown.trim().slice(0, 140) || 'No preview available.'}
				</p>
			</div>
		</div>
	</a>
{/snippet}

{#snippet ActionRow(action: LaunchpadAction)}
	<div class="rounded-md px-2.5 py-2 transition-colors hover:bg-accent/25">
		<div class="flex items-start gap-2">
			<HugeiconsIcon
				icon={action.provider === 'github' ? GithubIcon : LinkSquare01Icon}
				strokeWidth={2}
				class="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
			/>
			<div class="min-w-0 flex-1">
				<div class="flex min-w-0 items-center gap-2">
					<p class="truncate text-xs font-medium">{action.sourceName}</p>
					<span class="shrink-0 text-[10px] text-muted-foreground">{actionStatusLabel(action)}</span
					>
				</div>
				<p class="mt-0.5 truncate text-[11px] text-muted-foreground">
					{sourceKindLabel(action.sourceKind)} · {actionEventDisplayLabel(action)}
				</p>
				{#if action.statusReason}
					<p class="mt-1 line-clamp-2 text-[11px] text-destructive">{action.statusReason}</p>
				{/if}
			</div>
			<div class="flex shrink-0 items-center gap-1">
				<button
					type="button"
					class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
					disabled={Boolean(updatingActionId)}
					aria-label={action.status === 'active'
						? 'Pause Launchpad Action'
						: 'Resume Launchpad Action'}
					onclick={() => setActionEnabled(action, action.status !== 'active')}
				>
					<HugeiconsIcon
						icon={action.status === 'active' ? PauseIcon : PlayIcon}
						strokeWidth={2}
						class="size-3.5"
					/>
				</button>
				<button
					type="button"
					class="h-7 rounded-md px-2 text-[11px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
					disabled={Boolean(updatingActionId)}
					onclick={() => deleteAction(action)}
				>
					Delete
				</button>
			</div>
		</div>
	</div>
{/snippet}

{#snippet ActivityRow(kind: string, title: string, time: number)}
	<div class="flex items-start gap-2">
		<HugeiconsIcon
			icon={TimeQuarterPassIcon}
			strokeWidth={2}
			class="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
		/>
		<div class="min-w-0 flex-1">
			<p class="truncate text-xs font-medium">{kind} · {title}</p>
			<p class="mt-0.5 text-[11px] text-muted-foreground">{formatRelativeTime(time)}</p>
		</div>
	</div>
{/snippet}
