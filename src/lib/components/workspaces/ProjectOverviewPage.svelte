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
		Message01Icon,
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

	const threads = useQuery(listThreadsQuery, () =>
		auth.isAuthenticated && projectId ? { projectId: projectId as Id<'projects'> } : 'skip'
	);
	const artifacts = useQuery(listProjectArtifactsQuery, () =>
		auth.isAuthenticated && projectId ? { projectId: projectId as Id<'projects'> } : 'skip'
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
			...projectThreads.slice(0, 3).map((thread) => ({
				kind: 'Thread updated',
				title: formatThreadTitleForDisplay(thread.title),
				time: thread.updatedAt,
				href: workspaceThreadHref(thread)
			})),
			...projectArtifacts.slice(0, 3).map((artifact) => ({
				kind: 'Artifact updated',
				title: artifact.title,
				time: artifact.updatedAt,
				href: workspaceArtifactHref(artifact._id)
			})),
			{ kind: 'Project updated', title: project.name, time: project.updatedAt, href: '' }
		];
		return items.sort((a, b) => b.time - a.time).slice(0, 5);
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

	const rowClass =
		'group block rounded-md border border-transparent px-2.5 py-2 transition-colors hover:border-border/70 hover:bg-accent/35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';
</script>

<section class="h-full min-h-0 overflow-y-auto bg-background text-foreground">
	<div class="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
		<header class="rounded-lg border border-border/70 bg-card/35 p-4">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div class="min-w-0 space-y-1.5">
					<p class="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
						Project
					</p>
					<h1 class="truncate text-lg font-semibold tracking-tight">{project.name}</h1>
					<p class="max-w-2xl text-xs leading-5 text-muted-foreground">
						{project.summary?.trim() ||
							'No summary yet. Start a project thread to shape the current direction.'}
					</p>
				</div>
				<div class="grid shrink-0 grid-cols-3 gap-2 text-right max-sm:text-left">
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
			</div>
		</header>

		<section class="rounded-lg border border-border/70 bg-card/60 p-3 shadow-sm">
			<div class="mb-2 flex items-center justify-between gap-3 px-1">
				<div>
					<h2 class="text-sm font-semibold tracking-tight">Start a project thread</h2>
					<p class="mt-0.5 text-[11px] text-muted-foreground">
						Work through the next decision with this project’s context attached.
					</p>
				</div>
			</div>

			<PromptInput
				class="w-full overflow-hidden rounded-lg border-0 bg-background/80 shadow-none ring-1 ring-border/70"
				clearOnSubmit={false}
				onSubmit={submitMessage}
			>
				<PromptInputTextarea
					bind:ref={textareaRef}
					bind:value={text}
					class="min-h-18 px-3 py-3 text-sm leading-5 focus-visible:ring-0"
					placeholder="Ask about the next build, unresolved risk, user story, PRD change, or implementation plan…"
				/>
				<PromptInputToolbar class="flex items-center gap-2 px-3 py-2">
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

			<Suggestions class="mt-2 gap-1.5 py-0.5" scrollbarXClasses="hidden">
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
		</section>

		<section class="grid gap-2 sm:grid-cols-3">
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
			{/if}
			<button
				type="button"
				class={cn(rowClass, 'bg-card/35 text-left')}
				onclick={openCreateArtifactDialog}
			>
				<p class="text-[10px] font-medium text-muted-foreground uppercase">Create artifact</p>
				<p class="mt-1 text-xs font-medium">Save a decision or draft</p>
			</button>
		</section>

		<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)]">
			<div class="space-y-4">
				<section class="rounded-lg border border-border/70 bg-card/35 p-3">
					<h2 class="mb-2 px-1 text-sm font-semibold tracking-tight">Active threads</h2>
					{#if threads.data === undefined}
						<p class="px-1 py-3 text-xs text-muted-foreground">Loading…</p>
					{:else if projectThreads.length === 0}
						<p class="px-1 py-3 text-xs leading-5 text-muted-foreground">
							No project threads yet. Start one above to begin shaping the project.
						</p>
					{:else}
						<div class="space-y-1">
							{#each projectThreads.slice(0, 5) as thread (thread._id)}
								{@render ThreadRow(thread)}
							{/each}
						</div>
					{/if}
				</section>

				<section class="rounded-lg border border-border/70 bg-card/35 p-3">
					<h2 class="mb-2 px-1 text-sm font-semibold tracking-tight">Recent activity</h2>
					{#if threads.data === undefined || artifacts.data === undefined}
						<p class="px-1 py-3 text-xs text-muted-foreground">Loading…</p>
					{:else if recentActivity.length === 0}
						<p class="px-1 py-3 text-xs leading-5 text-muted-foreground">
							No project activity yet.
						</p>
					{:else}
						<div class="space-y-1">
							{#each recentActivity as item (`${item.kind}-${item.time}-${item.title}`)}
								{#if item.href}
									<a class={rowClass} href={resolve(item.href as '/workspace')}
										>{@render ActivityRow(item.kind, item.title, item.time)}</a
									>
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

			<div class="space-y-4">
				<section class="rounded-lg border border-border/70 bg-card/35 p-3">
					<h2 class="mb-2 px-1 text-sm font-semibold tracking-tight">Key artifacts</h2>
					{#if artifacts.data === undefined}
						<p class="px-1 py-3 text-xs text-muted-foreground">Loading…</p>
					{:else if projectArtifacts.length === 0}
						<p class="px-1 py-3 text-xs leading-5 text-muted-foreground">
							No project artifacts yet. Create one when you have a decision, draft, or reference
							worth saving.
						</p>
					{:else}
						<div class="space-y-1">
							{#each projectArtifacts.slice(0, 5) as artifact (artifact._id)}
								{@render ArtifactRow(artifact)}
							{/each}
						</div>
					{/if}
				</section>

				<section class="rounded-lg border border-border/70 bg-card/35 p-4">
					<p class="text-sm font-semibold tracking-tight">Project context</p>
					<p class="mt-2 text-xs leading-5 text-muted-foreground">
						Saved artifacts and project threads keep this workspace connected. Open questions and
						suggested next steps can appear here as project context grows.
					</p>
				</section>
			</div>
		</div>
	</div>
</section>

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
