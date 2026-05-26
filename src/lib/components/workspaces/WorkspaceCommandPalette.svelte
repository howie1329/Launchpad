<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Kbd from '$lib/components/ui/kbd/index.js';
	import * as NativeSelect from '$lib/components/ui/native-select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar';
	import {
		artifactPreview,
		artifactTypeLabel,
		formatArtifactUpdatedAt
	} from '$lib/artifact-display';
	import {
		searchArtifactsQuery,
		type ArtifactProjectScope,
		type SavedArtifact
	} from '$lib/artifacts';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { useQuery } from 'convex-svelte';
	import type { SavedProject } from '$lib/projects';
	import type { SavedChatThread } from '$lib/chat';
	import { formatThreadTitleForDisplay } from '$lib/thread-title';
	import {
		workspaceArtifactHref,
		workspaceProjectHref,
		workspaceRootHref,
		workspaceSettingsHref,
		workspaceThreadHref
	} from '$lib/workspace-route-contract';
	import {
		ChatAdd01Icon,
		Chat01Icon,
		Folder01Icon,
		PanelLeftCloseIcon,
		PanelLeftOpenIcon,
		PanelLeftIcon,
		PanelRightCloseIcon,
		PanelRightOpenIcon,
		Rocket01Icon,
		Search01Icon,
		Settings01Icon,
		File01Icon
	} from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';

	let {
		open = $bindable(false),
		projects,
		threads,
		artifacts,
		activeThreadId = '',
		activeThreadArtifactIds = new Set<Id<'artifacts'>>(),
		contextPanelOpen = false,
		canPromoteThreadToProject = false,
		onRequestPromote,
		onRequestCreateArtifact,
		onUseArtifactInThread,
		onToggleThreadContext
	}: {
		open?: boolean;
		projects: SavedProject[] | undefined;
		threads: SavedChatThread[] | undefined;
		artifacts: SavedArtifact[] | undefined;
		activeThreadId?: string;
		activeThreadArtifactIds?: Set<Id<'artifacts'>>;
		contextPanelOpen?: boolean;
		canPromoteThreadToProject?: boolean;
		onRequestPromote: () => void;
		onRequestCreateArtifact: () => void;
		onUseArtifactInThread: (artifactId: Id<'artifacts'>) => void | Promise<void>;
		onToggleThreadContext: () => void | Promise<void>;
	} = $props();

	const sidebar = useSidebar();

	let searchValue = $state('');
	let typeFilter = $state('');
	let projectFilter = $state('all');
	let recencyFilter = $state('any');

	const typeOptions = $derived(
		Array.from(new Set((artifacts ?? []).map((artifact) => artifact.type).filter(Boolean))).sort(
			(a, b) => artifactTypeLabel(a).localeCompare(artifactTypeLabel(b))
		)
	);
	const projectScope = $derived<ArtifactProjectScope>(
		projectFilter === 'none' ? 'none' : projectFilter === 'all' ? 'all' : 'project'
	);
	const selectedProjectId = $derived(
		projectScope === 'project' ? (projectFilter as Id<'projects'>) : null
	);
	const updatedAfter = $derived.by(() => {
		if (recencyFilter === 'any') return null;
		const days = recencyFilter === '7' ? 7 : recencyFilter === '30' ? 30 : 90;
		return Date.now() - days * 24 * 60 * 60 * 1000;
	});
	const artifactSearch = useQuery(searchArtifactsQuery, () => ({
		query: searchValue,
		type: typeFilter || null,
		projectScope,
		projectId: selectedProjectId,
		updatedAfter,
		limit: 25
	}));
	const hasArtifactSearch = $derived(searchValue.trim().length > 0);
	const hasArtifactFilters = $derived(
		Boolean(typeFilter) || projectFilter !== 'all' || recencyFilter !== 'any'
	);
	const workspaceLoading = $derived(
		projects === undefined || threads === undefined || artifacts === undefined
	);
	const artifactSearchLoading = $derived(
		artifactSearch.data === undefined && artifacts !== undefined
	);
	const artifactResults = $derived(
		artifactSearch.data ?? (artifactSearchLoading ? [] : (artifacts ?? []))
	);

	function close() {
		open = false;
	}

	function nav(path: string) {
		return async () => {
			try {
				await goto(resolve(path as '/workspace'));
			} finally {
				close();
			}
		};
	}

	async function runAction(fn: () => void | Promise<void>) {
		try {
			await fn();
		} finally {
			close();
		}
	}

	const artifactsCap = 25;

	function projectLabel(projectId: string | undefined) {
		if (!projectId) return 'No project';
		return projects?.find((project) => project._id === projectId)?.name ?? 'Project';
	}

	function useInThread(artifactId: Id<'artifacts'>) {
		return () => void runAction(() => onUseArtifactInThread(artifactId));
	}

	function resetArtifactFilters() {
		typeFilter = '';
		projectFilter = 'all';
		recencyFilter = 'any';
	}

	/**
	 * List row pattern (docs/design-system.md §6): `text-xs`, 12px icons, `accent` selection pill,
	 * `hover:bg-accent/50` — workspace palette only; overrides `Command.Item` defaults.
	 */
	const paletteItemClass =
		'gap-2 rounded-md px-2 py-2 font-sans text-xs hover:bg-accent/50 ' +
		'data-selected:bg-accent data-selected:font-medium data-selected:text-accent-foreground ' +
		'data-selected:hover:bg-accent data-selected:[&_svg]:text-accent-foreground';
	/** Nav-style section label (docs/design-system.md §2–3) for this overlay. */
	const paletteGroupHeadingClass = '!text-[11px] uppercase tracking-wide !text-muted-foreground';
</script>

<Command.CommandDialog
	bind:open
	title="Command center"
	description="Search projects, chats, and artifacts, or run a quick action."
	class="sm:max-w-lg"
>
	<Command.Input
		bind:value={searchValue}
		placeholder="Search threads, projects, artifacts, actions…"
	/>
	<Command.List class="max-h-[min(24rem,60vh)] px-1">
		<Command.Empty class="px-2 py-6 text-center text-xs text-muted-foreground">
			{#if workspaceLoading}
				Loading workspace…
			{:else if artifactSearchLoading}
				Searching artifacts…
			{:else}
				No matching action, project, chat, or artifact.
			{/if}
		</Command.Empty>

		<Command.Group heading="Actions" value="actions" headingClass={paletteGroupHeadingClass}>
			<Command.Item
				class={paletteItemClass}
				value="action new chat new thread compose"
				keywords={['new', 'chat', 'compose', 'start']}
				onSelect={nav(workspaceRootHref())}
			>
				<HugeiconsIcon icon={ChatAdd01Icon} strokeWidth={2} class="size-3 text-muted-foreground" />
				<span class="min-w-0 flex-1 truncate">New chat</span>
			</Command.Item>
			<Command.Item
				class={paletteItemClass}
				value="action settings account preferences"
				keywords={['settings', 'preferences', 'account', 'usage', 'ai']}
				onSelect={nav(workspaceSettingsHref())}
			>
				<HugeiconsIcon icon={Settings01Icon} strokeWidth={2} class="size-3 text-muted-foreground" />
				<span class="min-w-0 flex-1 truncate">Settings</span>
			</Command.Item>
			<Command.Item
				class={paletteItemClass}
				value="action create artifact document markdown"
				keywords={['artifact', 'document', 'markdown', 'create', 'new']}
				onSelect={() => {
					close();
					onRequestCreateArtifact();
				}}
			>
				<HugeiconsIcon icon={File01Icon} strokeWidth={2} class="size-3 text-muted-foreground" />
				<span class="min-w-0 flex-1 truncate">Create artifact</span>
			</Command.Item>
			<Command.Item
				class={paletteItemClass}
				value="action toggle sidebar expand collapse"
				keywords={['sidebar', 'panel', 'toggle', 'collapse', 'expand']}
				onSelect={() => {
					sidebar.toggle();
					close();
				}}
			>
				<HugeiconsIcon
					icon={sidebar.open ? PanelLeftCloseIcon : PanelLeftOpenIcon}
					strokeWidth={2}
					class="size-3 text-muted-foreground"
				/>
				<span class="min-w-0 flex-1 truncate"
					>{sidebar.open ? 'Collapse sidebar' : 'Expand sidebar'}</span
				>
				<Command.Shortcut
					class="text-muted-foreground/90 group-data-selected/command-item:text-accent-foreground/90"
				>
					<Kbd.Group
						class="pointer-events-none inline-flex items-center gap-0.5"
						aria-hidden="true"
					>
						<Kbd.Kbd>⌘</Kbd.Kbd>
						<Kbd.Kbd>B</Kbd.Kbd>
					</Kbd.Group>
				</Command.Shortcut>
			</Command.Item>
			<Command.Item
				class={paletteItemClass}
				value="action focus workspace list keyboard navigation"
				keywords={['focus', 'sidebar', 'list', 'keyboard', 'navigate']}
				onSelect={() => {
					const first = document.querySelector<HTMLElement>(
						'#workspace-sidebar-nav [data-workspace-nav-item]'
					);
					first?.focus();
					close();
				}}
			>
				<HugeiconsIcon icon={PanelLeftIcon} strokeWidth={2} class="size-3 text-muted-foreground" />
				<span class="min-w-0 flex-1 truncate">Focus workspace list</span>
				<Command.Shortcut
					class="text-muted-foreground/90 group-data-selected/command-item:text-accent-foreground/90"
				>
					<Kbd.Group
						class="pointer-events-none inline-flex items-center gap-0.5"
						aria-hidden="true"
					>
						<Kbd.Kbd>⌘</Kbd.Kbd>
						<Kbd.Kbd>⇧</Kbd.Kbd>
						<Kbd.Kbd>L</Kbd.Kbd>
					</Kbd.Group>
				</Command.Shortcut>
			</Command.Item>
			{#if activeThreadId}
				<Command.Item
					class={paletteItemClass}
					value="action context panel thread"
					keywords={['context', 'panel', 'thread', 'right', 'artifacts']}
					onSelect={() => {
						void runAction(onToggleThreadContext);
					}}
				>
					<HugeiconsIcon
						icon={contextPanelOpen ? PanelRightCloseIcon : PanelRightOpenIcon}
						strokeWidth={2}
						class="size-3 text-muted-foreground"
					/>
					<span class="min-w-0 flex-1 truncate"
						>{contextPanelOpen ? 'Close thread context' : 'Open thread context'}</span
					>
				</Command.Item>
			{/if}
			{#if canPromoteThreadToProject}
				<Command.Item
					class={paletteItemClass}
					value="action promote project from chat"
					keywords={['project', 'promote', 'create', 'export']}
					onSelect={() => {
						close();
						onRequestPromote();
					}}
				>
					<HugeiconsIcon icon={Rocket01Icon} strokeWidth={2} class="size-3 text-muted-foreground" />
					<span class="min-w-0 flex-1 truncate">Create project from this chat</span>
				</Command.Item>
			{/if}
		</Command.Group>

		{#if projects && projects.length > 0}
			<Command.Separator class="-mx-1 h-px bg-border" />
			<Command.Group heading="Projects" value="projects" headingClass={paletteGroupHeadingClass}>
				{#each projects as project (project._id)}
					<Command.Item
						class={paletteItemClass}
						value="project {project._id} {project.name}"
						keywords={[project.name, 'project', 'folder']}
						onSelect={nav(workspaceProjectHref(project._id))}
					>
						<HugeiconsIcon
							icon={Folder01Icon}
							strokeWidth={2}
							class="size-3 text-muted-foreground"
						/>
						<span class="min-w-0 flex-1 truncate">{project.name}</span>
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}

		{#if threads && threads.length > 0}
			<Command.Separator class="-mx-1 h-px bg-border" />
			<Command.Group heading="Chats" value="chats" headingClass={paletteGroupHeadingClass}>
				{#each threads as thread (thread._id)}
					<Command.Item
						class={paletteItemClass}
						value="thread {thread._id} {formatThreadTitleForDisplay(thread.title)} {thread.title}"
						keywords={[
							formatThreadTitleForDisplay(thread.title),
							'thread',
							'chat',
							'inbox',
							'project',
							...(thread.projectId ? [String(thread.projectId)] : [])
						]}
						onSelect={nav(workspaceThreadHref(thread))}
					>
						<HugeiconsIcon icon={Chat01Icon} strokeWidth={2} class="size-3 text-muted-foreground" />
						<span class="min-w-0 flex-1 truncate">{formatThreadTitleForDisplay(thread.title)}</span>
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}

		<Command.Separator class="-mx-1 h-px bg-border" />
		<Command.Group heading="Artifacts" value="artifacts" headingClass={paletteGroupHeadingClass}>
			<div class="grid gap-1.5 px-2 py-1.5 sm:grid-cols-[1fr_1fr_1fr_auto]">
				<NativeSelect.Root bind:value={typeFilter} size="sm" aria-label="Filter artifacts by type">
					<option value="">All types</option>
					{#each typeOptions as type (type)}
						<option value={type}>{artifactTypeLabel(type)}</option>
					{/each}
				</NativeSelect.Root>
				<NativeSelect.Root
					bind:value={projectFilter}
					size="sm"
					aria-label="Filter artifacts by project"
				>
					<option value="all">All projects</option>
					<option value="none">No project</option>
					{#each projects ?? [] as project (project._id)}
						<option value={project._id}>{project.name}</option>
					{/each}
				</NativeSelect.Root>
				<NativeSelect.Root
					bind:value={recencyFilter}
					size="sm"
					aria-label="Filter artifacts by recency"
				>
					<option value="any">Any time</option>
					<option value="7">Last 7 days</option>
					<option value="30">Last 30 days</option>
					<option value="90">Last 90 days</option>
				</NativeSelect.Root>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					class="h-8 px-2 text-xs"
					disabled={!hasArtifactFilters}
					onclick={resetArtifactFilters}
				>
					Reset
				</Button>
			</div>

			{#if artifactSearchLoading}
				<p class="px-2 py-3 text-xs text-muted-foreground">Searching artifacts…</p>
			{:else if artifactResults.length === 0 && !workspaceLoading}
				<div class="flex flex-col gap-2 px-2 py-3 text-xs text-muted-foreground">
					<p>
						{hasArtifactSearch || hasArtifactFilters
							? 'No artifact matches your search or filters.'
							: 'No artifacts yet.'}
					</p>
					{#if hasArtifactFilters}
						<div>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								class="h-7 px-2 text-xs"
								onclick={resetArtifactFilters}
							>
								Clear filters
							</Button>
						</div>
					{/if}
				</div>
			{/if}

			{#each artifactResults as artifact (artifact._id)}
				{@const canUseArtifact =
					Boolean(activeThreadId) && !activeThreadArtifactIds.has(artifact._id)}
				<Command.Item
					class={paletteItemClass}
					value="artifact {artifact._id} {artifact.title} {artifact.type} {artifactPreview(
						artifact.contentMarkdown
					)}"
					keywords={[
						artifact.title,
						artifactTypeLabel(artifact.type),
						artifact.type,
						artifactPreview(artifact.contentMarkdown),
						projectLabel(artifact.projectId),
						'document',
						'doc'
					]}
					onSelect={nav(workspaceArtifactHref(artifact._id))}
				>
					<HugeiconsIcon icon={File01Icon} strokeWidth={2} class="size-3 text-muted-foreground" />
					<span class="flex min-w-0 flex-1 flex-col gap-0.5">
						<span class="truncate">{artifact.title}</span>
						<span class="truncate text-[11px] font-normal text-muted-foreground">
							{artifactPreview(artifact.contentMarkdown)}
						</span>
					</span>
					<span
						class="ml-auto flex shrink-0 items-center gap-1 pl-1 text-right text-[11px] text-muted-foreground"
					>
						<span>{artifactTypeLabel(artifact.type)}</span>
						<span aria-hidden="true">·</span>
						<span>{projectLabel(artifact.projectId)}</span>
						<span aria-hidden="true">·</span>
						<span>{formatArtifactUpdatedAt(artifact.updatedAt)}</span>
					</span>
				</Command.Item>
				{#if canUseArtifact}
					<div class="px-8 pb-1">
						<Button variant="ghost" size="xs" onclick={useInThread(artifact._id)}>
							Use in this chat
						</Button>
					</div>
				{/if}
			{/each}
		</Command.Group>
	</Command.List>

	<div class="border-t border-border/50 px-2.5 py-2" data-workspace-command-footer>
		<div class="flex flex-col gap-1.5 text-[10px] leading-relaxed text-muted-foreground">
			<div class="flex items-center gap-1.5">
				<HugeiconsIcon
					icon={Search01Icon}
					strokeWidth={2}
					class="size-3.5 shrink-0 opacity-70"
					aria-hidden="true"
				/>
				<span class="text-muted-foreground/90">Open</span>
				<Kbd.Group class="inline-flex items-center gap-0.5" aria-label="Command center shortcut">
					<Kbd.Kbd>⌘</Kbd.Kbd>
					<Kbd.Kbd>K</Kbd.Kbd>
				</Kbd.Group>
			</div>
			<p class="m-0 text-pretty text-muted-foreground/85">
				Projects and chats show recent workspace items. Artifacts search by title, type, and
				markdown content, then shows up to {artifactsCap} matching documents.
			</p>
		</div>
	</div>
</Command.CommandDialog>
