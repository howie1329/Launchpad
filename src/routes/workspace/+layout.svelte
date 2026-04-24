<script lang="ts">
	import { afterNavigate, goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { get } from 'svelte/store';
	import WorkspaceCommandPalette from '$lib/components/workspaces/WorkspaceCommandPalette.svelte';
	import WorkspaceTabPicker from '$lib/components/workspaces/WorkspaceTabPicker.svelte';
	import WorkspaceTabStrip from '$lib/components/workspaces/WorkspaceTabStrip.svelte';
	import { hrefForWorkspaceTarget, urlToWorkspaceTarget } from '$lib/workspace-tab-target';
	import {
		addOrActivateWorkspaceTabMutation,
		getWorkspaceTabStripQuery,
		removeWorkspaceTabMutation
	} from '$lib/workspaceTabs';
	import type { WorkspaceTabTarget } from '$lib/workspaceTabs';
	import {
		workspaceArtifactHref,
		workspaceProjectHref,
		workspaceRootHref,
		workspaceSettingsHref,
		workspaceThreadHref,
		workspaceThreadViewHref
	} from '$lib/workspace-nav';
	import { auth, getConvexClient, signOut } from '$lib/auth.svelte';
	import {
		linkArtifactToThreadMutation,
		listArtifactsQuery,
		listThreadArtifactsQuery
	} from '$lib/artifacts';
	import { artifactTypeLabel, groupArtifacts } from '$lib/artifact-display';
	import { listThreadsQuery } from '$lib/chat';
	import { formatThreadTitleForDisplay, PLACEHOLDER_THREAD_TITLE } from '$lib/thread-title';
	import { getAiBudgetStatusQuery } from '$lib/usage';
	import { LaunchpadMarkOutline } from '$lib/components/brand';
	import { Button } from '$lib/components/ui/button';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { cn } from '$lib/utils';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Kbd from '$lib/components/ui/kbd';
	import ThemeMenu from '$lib/components/ThemeMenu.svelte';
	import { createProjectFromThreadMutation, listProjectsQuery } from '$lib/projects';
	import { deleteProjectMutation, deleteThreadMutation } from '$lib/account-management';
	import { workspaceArtifactChrome } from '$lib/workspace-artifact-chrome.svelte';
	import {
		ArrowLeft01Icon,
		ArrowRight01Icon,
		ChatAdd01Icon,
		DollarCircleIcon,
		Folder01Icon,
		Logout01Icon,
		PanelRightCloseIcon,
		PanelRightOpenIcon,
		Rocket01Icon,
		Search01Icon,
		MoreHorizontalCircle01Icon,
		Settings01Icon
	} from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { useQuery } from 'convex-svelte';
	import type { Id } from '../../convex/_generated/dataModel';

	let { children } = $props();

	let sidebarOpen = $state(true);
	let isSigningOut = $state(false);
	let promoteDialogOpen = $state(false);
	let promoteName = $state('');
	let promoteSummary = $state('');
	let promoteError = $state('');
	let isPromoting = $state(false);
	let importingArtifactId = $state('');
	let artifactActionError = $state('');
	let workspaceNotice = $state('');
	let openSections = $state({
		Projects: true,
		Chats: true,
		Artifacts: true
	});
	let openProjectIds = $state<Record<string, boolean>>({});
	let commandCenterOpen = $state(false);
	let tabPickerOpen = $state(false);
	let projectDeleteDialogOpen = $state(false);
	let projectToDelete: { id: Id<'projects'>; name: string } | null = $state(null);
	let threadDeleteDialogOpen = $state(false);
	let threadToDelete: {
		id: Id<'chatThreads'>;
		title: string;
		projectId: Id<'projects'> | null;
	} | null = $state(null);
	let isDeletingProject = $state(false);
	let isDeletingThread = $state(false);
	let deleteNavError = $state('');

	const pathname = $derived($page.url.pathname);
	const isSettingsActive = $derived(pathname === '/workspace/settings');
	const activeProjectId = $derived($page.url.searchParams.get('project')?.trim() ?? '');
	const activeThreadId = $derived($page.url.searchParams.get('thread')?.trim() ?? '');
	const activeArtifactId = $derived(
		/^\/workspace\/artifacts\/([^/]+)/.exec(pathname)?.[1]?.trim() ?? ''
	);
	const contextPanelOpen = $derived($page.url.searchParams.get('context') === '1');
	const isNewChatActive = $derived(
		pathname === '/workspace' && !activeProjectId && !activeThreadId
	);
	const projects = useQuery(listProjectsQuery, () => (auth.isAuthenticated ? {} : 'skip'));
	const threads = useQuery(listThreadsQuery, () => (auth.isAuthenticated ? {} : 'skip'));
	const artifacts = useQuery(listArtifactsQuery, () => (auth.isAuthenticated ? {} : 'skip'));
	const tabStrip = useQuery(getWorkspaceTabStripQuery, () => (auth.isAuthenticated ? {} : 'skip'));
	const threadArtifacts = useQuery(listThreadArtifactsQuery, () =>
		auth.isAuthenticated && activeThreadId
			? { threadId: activeThreadId as Id<'chatThreads'> }
			: 'skip'
	);
	const budget = useQuery(getAiBudgetStatusQuery, () => (auth.isAuthenticated ? {} : 'skip'));
	const workspaceListError = $derived(
		projects.error ?? threads.error ?? artifacts.error ?? budget.error
	);
	const selectedProject = $derived(
		projects.data?.find((project) => project._id === activeProjectId) ?? null
	);
	const selectedThread = $derived(
		threads.data?.find((thread) => thread._id === activeThreadId) ?? null
	);
	const canPromoteThreadToProject = $derived(
		Boolean(
			activeThreadId &&
			selectedThread &&
			!selectedThread.projectId &&
			!isSettingsActive &&
			!activeArtifactId
		)
	);
	const activeThreadArtifactIds = $derived(
		new Set(threadArtifacts.data?.map((item) => item.artifact._id) ?? [])
	);
	const selectedArtifact = $derived(
		artifacts.data?.find((artifact) => artifact._id === activeArtifactId) ?? null
	);
	const generalThreads = $derived(
		threads.data?.filter((thread) => thread.scopeType === 'general') ?? []
	);
	const artifactGroups = $derived(groupArtifacts(artifacts.data ?? [], (artifact) => artifact));
	const activeWorkspaceTarget = $derived.by(() => {
		const t = urlToWorkspaceTarget($page.url);
		return t ?? { kind: 'home' as const };
	});

	function syncWorkspaceTabsFromUrl() {
		if (!auth.isAuthenticated) return;
		const url = get(page).url;
		if (!url.pathname.startsWith('/workspace')) return;
		const t = urlToWorkspaceTarget(url);
		if (!t) return;
		void getConvexClient()
			.mutation(addOrActivateWorkspaceTabMutation, { target: t })
			.catch((e) => console.error(e));
	}

	afterNavigate(syncWorkspaceTabsFromUrl);

	const selectWorkspaceTab = async (target: WorkspaceTabTarget) => {
		const href = resolve(hrefForWorkspaceTarget(target) as '/workspace');
		const u = get(page).url;
		const next = new URL(href, u.origin);
		if (u.pathname === next.pathname && u.search === next.search) return;
		await goto(href, { noScroll: true, keepFocus: true });
	};

	const closeWorkspaceTab = async (tabId: string) => {
		const result = await getConvexClient().mutation(removeWorkspaceTabMutation, { tabId });
		if (!result.removed) return;
		if (result.activeTarget) {
			await goto(resolve(hrefForWorkspaceTarget(result.activeTarget) as '/workspace'), {
				noScroll: true,
				keepFocus: true
			});
		}
	};

	/** Outline Launchpad mark + contextual copy; a11y name comes from the link. */
	const SIDEBAR_HOME_LABEL_MAX = 24;
	const ellipsizeSidebarLabel = (text: string, max: number) => {
		const t = text.trim();
		if (t.length <= max) return t;
		if (max <= 1) return '…';
		return `${t.slice(0, max - 1)}…`;
	};

	const sidebarHomeTitleFull = $derived.by(() => {
		if (isSettingsActive) return 'Settings';
		if (activeThreadId) {
			return formatThreadTitleForDisplay(selectedThread?.title ?? '');
		}
		if (activeArtifactId) {
			const at = selectedArtifact?.title?.trim();
			return at || 'Artifact';
		}
		if (activeProjectId) {
			const pn = selectedProject?.name?.trim();
			return pn || 'Project';
		}
		return 'Launchpad';
	});

	const sidebarHomeDisplayLabel = $derived(
		ellipsizeSidebarLabel(sidebarHomeTitleFull, SIDEBAR_HOME_LABEL_MAX)
	);
	const sidebarHomeLinkAria = $derived(`Go to workspace home — ${sidebarHomeTitleFull}`);

	const projectThreads = (projectId: string) =>
		threads.data?.filter((thread) => thread.projectId === projectId) ?? [];
	const isProjectOpen = (projectId: string) => openProjectIds[projectId] ?? true;
	const setProjectOpen = (projectId: string, open: boolean) => {
		openProjectIds = { ...openProjectIds, [projectId]: open };
	};

	const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

	/** Design-system-aligned nav rows: dense, 12px icons */
	const navPill =
		'h-7 min-w-0 gap-2 rounded-full px-2.5 text-xs text-sidebar-foreground/75 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground [&>svg]:size-3 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground';
	const sectionTrigger =
		'group/section flex h-7 w-full items-center gap-1 rounded-full px-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none group-data-[collapsible=icon]:hidden';
	const subNavPill =
		'h-7 min-w-0 gap-2 rounded-full px-2.5 text-xs text-sidebar-foreground/75 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground [&>svg]:size-3 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground';

	const usageBarPct = $derived(
		budget.data && budget.data.capUsd > 0
			? Math.min(100, (budget.data.spentUsd / budget.data.capUsd) * 100)
			: 0
	);
	const usageTooltip = $derived(
		budget.data
			? `AI usage today: ${money.format(budget.data.spentUsd)} / ${money.format(budget.data.capUsd)} · ${budget.data.dateKey}`
			: 'Usage'
	);

	const openPromoteDialog = () => {
		if (!selectedThread || selectedThread.projectId) return;
		const rawTitle = selectedThread.title?.trim() ?? '';
		promoteName =
			!rawTitle || rawTitle === PLACEHOLDER_THREAD_TITLE
				? 'New project'
				: formatThreadTitleForDisplay(selectedThread.title ?? '');
		promoteSummary = '';
		promoteError = '';
		promoteDialogOpen = true;
	};

	const closePromoteDialog = () => {
		if (isPromoting) return;
		promoteDialogOpen = false;
		promoteName = '';
		promoteSummary = '';
		promoteError = '';
	};

	const promoteThreadToProject = async () => {
		if (isPromoting || !activeThreadId) return;

		const name = promoteName.trim();
		if (!name) {
			promoteError = 'Project name is required.';
			return;
		}

		isPromoting = true;
		promoteError = '';

		try {
			const summary = promoteSummary.trim();
			const result = await getConvexClient().mutation(createProjectFromThreadMutation, {
				threadId: activeThreadId as Id<'chatThreads'>,
				name,
				...(summary ? { summary } : {})
			});
			promoteDialogOpen = false;
			promoteName = '';
			promoteSummary = '';
			workspaceNotice = 'Project created. This chat and its artifacts now live in the project.';
			await goto(
				workspaceThreadHref({
					_id: activeThreadId as Id<'chatThreads'>,
					projectId: result.projectId
				})
			);
		} catch (error) {
			console.error(error);
			promoteError =
				error instanceof Error && error.message
					? error.message
					: 'Could not create a project from this chat. Please try again.';
		} finally {
			isPromoting = false;
		}
	};

	const useArtifactInThread = async (artifactId: Id<'artifacts'>) => {
		if (!activeThreadId || importingArtifactId) return;

		importingArtifactId = artifactId;
		artifactActionError = '';

		try {
			await getConvexClient().mutation(linkArtifactToThreadMutation, {
				threadId: activeThreadId as Id<'chatThreads'>,
				artifactId,
				reason: 'imported'
			});
			workspaceNotice = 'Artifact added to this chat context.';
		} catch (error) {
			console.error(error);
			artifactActionError = 'Could not add that artifact to this chat. Please try again.';
		} finally {
			importingArtifactId = '';
		}
	};

	const toggleThreadContext = async () => {
		if (!activeThreadId) return;
		await goto(
			workspaceThreadViewHref({
				threadId: activeThreadId,
				projectId: activeProjectId || null,
				withContext: !contextPanelOpen
			}),
			{
				noScroll: true,
				keepFocus: true
			}
		);
	};

	function isWorkspaceTypableTarget(target: EventTarget | null) {
		return (
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			target instanceof HTMLSelectElement ||
			(target instanceof HTMLElement && target.isContentEditable)
		);
	}

	function handleWorkspaceKeydown(e: KeyboardEvent) {
		if (auth.isLoading || !auth.isAuthenticated) return;
		if (e.defaultPrevented) return;
		const mod = e.metaKey || e.ctrlKey;
		if (mod && (e.key === 'k' || e.key === 'K') && !e.shiftKey) {
			e.preventDefault();
			if (e.repeat) return;
			commandCenterOpen = !commandCenterOpen;
			return;
		}
		if (mod && e.shiftKey && (e.key === 'l' || e.key === 'L')) {
			if (e.repeat || commandCenterOpen) return;
			if (isWorkspaceTypableTarget(e.target)) return;
			e.preventDefault();
			document
				.querySelector<HTMLElement>('#workspace-sidebar-nav [data-workspace-nav-item]')
				?.focus();
		}
		trySidebarRovingKeydown(e);
	}

	function trySidebarRovingKeydown(e: KeyboardEvent) {
		if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') {
			return;
		}
		if (isWorkspaceTypableTarget(e.target)) return;

		const nav = document.getElementById('workspace-sidebar-nav');
		if (!nav) return;
		if (!(e.target instanceof Node) || !nav.contains(e.target)) return;

		const items = [...nav.querySelectorAll<HTMLElement>('[data-workspace-nav-item]')];
		if (items.length === 0) return;
		const active = document.activeElement;
		if (!active || !nav.contains(active)) return;

		const isNavItem = active.hasAttribute('data-workspace-nav-item');
		const idx = isNavItem ? items.indexOf(active as HTMLElement) : -1;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (idx < 0) items[0]?.focus();
			else items[Math.min(idx + 1, items.length - 1)]?.focus();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (idx < 0) items[items.length - 1]?.focus();
			else items[Math.max(idx - 1, 0)]?.focus();
		} else if (e.key === 'Home' && !e.metaKey && !e.ctrlKey) {
			e.preventDefault();
			items[0]?.focus();
		} else if (e.key === 'End' && !e.metaKey && !e.ctrlKey) {
			e.preventDefault();
			items[items.length - 1]?.focus();
		}
	}

	const handleSignOut = async () => {
		if (isSigningOut) return;

		isSigningOut = true;

		try {
			await signOut();
			await goto(resolve('/'));
		} finally {
			isSigningOut = false;
		}
	};

	const openDeleteProjectDialog = (id: Id<'projects'>, name: string) => {
		deleteNavError = '';
		projectToDelete = { id, name };
		projectDeleteDialogOpen = true;
	};

	const confirmDeleteProject = async () => {
		if (isDeletingProject || !projectToDelete) return;
		isDeletingProject = true;
		deleteNavError = '';
		const { id, name: deletedName } = projectToDelete;
		try {
			await getConvexClient().mutation(deleteProjectMutation, { projectId: id });
			projectDeleteDialogOpen = false;
			projectToDelete = null;
			void invalidateAll();
			if (activeProjectId === id) {
				await goto(resolve('/workspace'));
			}
			workspaceNotice = `Deleted project “${deletedName}”.`;
		} catch (error) {
			console.error(error);
			deleteNavError =
				error instanceof Error && error.message
					? error.message
					: 'Could not delete this project. Please try again.';
		} finally {
			isDeletingProject = false;
		}
	};

	const openDeleteThreadDialog = (
		id: Id<'chatThreads'>,
		title: string,
		projectId: Id<'projects'> | null
	) => {
		deleteNavError = '';
		threadToDelete = { id, title, projectId };
		threadDeleteDialogOpen = true;
	};

	const confirmDeleteThread = async () => {
		if (isDeletingThread || !threadToDelete) return;
		isDeletingThread = true;
		deleteNavError = '';
		const { id, title, projectId: tidProject } = threadToDelete;
		try {
			await getConvexClient().mutation(deleteThreadMutation, { threadId: id });
			threadDeleteDialogOpen = false;
			threadToDelete = null;
			void invalidateAll();
			if (activeThreadId === id) {
				if (tidProject) {
					await goto(
						resolve(
							`/workspace?project=${encodeURIComponent(String(tidProject))}` as '/workspace?${string}'
						)
					);
				} else {
					await goto(resolve('/workspace'));
				}
			}
			workspaceNotice = `Deleted chat “${formatThreadTitleForDisplay(title)}”.`;
		} catch (error) {
			console.error(error);
			deleteNavError =
				error instanceof Error && error.message
					? error.message
					: 'Could not delete this chat. Please try again.';
		} finally {
			isDeletingThread = false;
		}
	};

	$effect(() => {
		if (!auth.isLoading && !auth.isAuthenticated) {
			const u = $page.url;
			const nextPath = u.pathname.startsWith('/workspace')
				? `${u.pathname}${u.search}${u.hash}`
				: '/workspace';
			void goto(resolve(`/auth?redirectTo=${encodeURIComponent(nextPath)}`));
		}
	});
</script>

<svelte:window onkeydown={handleWorkspaceKeydown} />

{#if auth.isLoading || !auth.isAuthenticated}
	<main class="flex min-h-svh items-center justify-center bg-background px-5 text-foreground">
		<div class="text-center">
			<p class="text-sm font-semibold tracking-tight">Checking workspace access.</p>
			<p class="mt-2 text-xs leading-5 text-muted-foreground">You will be redirected if needed.</p>
		</div>
	</main>
{:else}
	<Sidebar.Provider
		bind:open={sidebarOpen}
		class="h-svh overflow-hidden"
		style="--sidebar-width: 15rem;"
	>
		<Sidebar.Root class="overflow-hidden" collapsible="icon">
			<nav id="workspace-sidebar-nav" class="flex min-h-0 flex-1 flex-col" aria-label="Workspace">
				<Sidebar.Header class="h-10 border-b border-border/50 px-2 py-1">
					<Sidebar.Menu class="flex flex-row items-center gap-1">
						<Sidebar.MenuItem class="min-w-0 flex-1 group-data-[collapsible=icon]:flex-none">
							<Sidebar.MenuButton size="sm" class={cn(navPill, 'min-w-0')}>
								{#snippet child({ props })}
									<a
										href={workspaceRootHref()}
										data-workspace-nav-item
										aria-label={sidebarHomeLinkAria}
										title={sidebarHomeTitleFull}
										{...props}
									>
										<div
											class="flex aspect-square size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground group-data-[collapsible=icon]:size-8"
										>
											<LaunchpadMarkOutline class="size-3.5" aria-hidden="true" />
										</div>
										<span
											class="min-w-0 truncate font-semibold group-data-[collapsible=icon]:sr-only"
											>{sidebarHomeDisplayLabel}</span
										>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					</Sidebar.Menu>
				</Sidebar.Header>

				<Sidebar.Content>
					{#if workspaceListError}
						<div
							class="border-b border-destructive/25 bg-destructive/10 px-3 py-2.5 text-[11px] text-destructive"
							role="status"
						>
							<p class="font-medium">Could not load part of the workspace</p>
							<p class="mt-1 leading-snug opacity-90">{workspaceListError.message}</p>
							<Button
								type="button"
								variant="secondary"
								size="sm"
								class="mt-2 h-7 text-xs"
								onclick={() => {
									void invalidateAll();
								}}
							>
								Try again
							</Button>
						</div>
					{/if}
					<Sidebar.Group class="border-0 shadow-none ring-0">
						<Sidebar.Menu>
							<Sidebar.MenuItem>
								<Sidebar.MenuButton
									size="sm"
									isActive={isNewChatActive}
									class={cn(navPill, 'min-w-0')}
									tooltipContent="New chat"
								>
									{#snippet child({ props })}
										<a
											href={workspaceRootHref()}
											data-workspace-nav-item
											aria-label="New chat"
											{...props}
										>
											<HugeiconsIcon icon={ChatAdd01Icon} strokeWidth={2} />
											<span class="min-w-0 truncate group-data-[collapsible=icon]:sr-only"
												>New chat</span
											>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						</Sidebar.Menu>
					</Sidebar.Group>

					<Collapsible.Root bind:open={openSections.Projects} class="border-0 shadow-none ring-0">
						<Sidebar.Group class="border-0 shadow-none ring-0">
							<Collapsible.Trigger class={sectionTrigger}>
								<HugeiconsIcon
									icon={ArrowRight01Icon}
									strokeWidth={2}
									class="size-3 shrink-0 transition-transform group-data-[state=open]/section:rotate-90"
								/>
								<span class="min-w-0 truncate">Projects</span>
							</Collapsible.Trigger>
							<Collapsible.Content
								class="overflow-hidden group-data-[collapsible=icon]:hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
							>
								<Sidebar.GroupContent>
									<Sidebar.Menu>
										{#if projects.data === undefined}
											<Sidebar.MenuItem>
												<Sidebar.MenuButton size="sm" aria-disabled class={cn(navPill, 'min-w-0')}>
													<span class="min-w-0 truncate">Loading projects…</span>
												</Sidebar.MenuButton>
											</Sidebar.MenuItem>
										{:else if projects.data.length === 0}
											<Sidebar.MenuItem>
												<div class="space-y-2 px-2 py-1.5">
													<p class="text-[11px] leading-snug text-sidebar-foreground/60">
														Promote a useful chat when the idea is ready for focused work.
													</p>
												</div>
											</Sidebar.MenuItem>
										{:else}
											{#each projects.data as project (project._id)}
												<Sidebar.MenuItem class="mb-0.5 min-w-0 last:mb-0">
													<Collapsible.Root
														open={isProjectOpen(project._id)}
														onOpenChange={(open) => setProjectOpen(project._id, open)}
													>
														<div class="flex w-full min-w-0 items-center gap-0.5">
															<Collapsible.Trigger class="min-h-0 min-w-0 flex-1">
																{#snippet child({ props })}
																	<Sidebar.MenuButton
																		size="sm"
																		isActive={activeProjectId === project._id && !activeThreadId}
																		class={cn(navPill, 'w-full min-w-0')}
																		{...props}
																	>
																		<HugeiconsIcon
																			icon={ArrowRight01Icon}
																			strokeWidth={2}
																			class="size-3 shrink-0 transition-transform data-[state=open]:rotate-90"
																			data-state={isProjectOpen(project._id) ? 'open' : 'closed'}
																		/>
																		<HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />
																		<span class="min-w-0 truncate" title={project.name}
																			>{project.name}</span
																		>
																	</Sidebar.MenuButton>
																{/snippet}
															</Collapsible.Trigger>
															<div
																class="flex shrink-0 items-center gap-0.5 group-data-[collapsible=icon]:hidden"
															>
																<DropdownMenu.Root>
																	<DropdownMenu.Trigger
																		type="button"
																		class="inline-flex size-7 items-center justify-center rounded-full text-sidebar-foreground/75 ring-sidebar-ring hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:outline-hidden [&>svg]:size-3"
																		onclick={(e) => e.stopPropagation()}
																		onpointerdown={(e) => e.stopPropagation()}
																		aria-label={`Project actions: ${project.name}`}
																	>
																		<HugeiconsIcon
																			icon={MoreHorizontalCircle01Icon}
																			strokeWidth={2}
																		/>
																	</DropdownMenu.Trigger>
																	<DropdownMenu.Content class="min-w-40" align="end">
																		<DropdownMenu.Item
																			variant="destructive"
																			onclick={() =>
																				openDeleteProjectDialog(project._id, project.name)}
																		>
																			Delete project
																		</DropdownMenu.Item>
																	</DropdownMenu.Content>
																</DropdownMenu.Root>
																<a
																	href={workspaceProjectHref(project._id)}
																	data-workspace-nav-item
																	class="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-sidebar-foreground/75 ring-sidebar-ring hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:outline-hidden [&>svg]:size-3"
																	aria-label={`New chat in ${project.name}`}
																>
																	<HugeiconsIcon icon={ChatAdd01Icon} strokeWidth={2} />
																</a>
															</div>
														</div>
														<Collapsible.Content
															class="overflow-hidden pt-0.5 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
														>
															<Sidebar.MenuSub>
																{@const threadsForProject = projectThreads(project._id)}
																{#if threads.data === undefined}
																	<Sidebar.MenuSubItem>
																		<Sidebar.MenuSubButton aria-disabled class={subNavPill}>
																			<span>Loading chats…</span>
																		</Sidebar.MenuSubButton>
																	</Sidebar.MenuSubItem>
																{:else if threadsForProject.length === 0}
																	<Sidebar.MenuSubItem>
																		<Sidebar.MenuSubButton class={subNavPill}>
																			{#snippet child({ props })}
																				<a
																					href={workspaceProjectHref(project._id)}
																					data-workspace-nav-item
																					{...props}
																				>
																					<span class="text-sidebar-foreground/60">Start chat</span>
																				</a>
																			{/snippet}
																		</Sidebar.MenuSubButton>
																	</Sidebar.MenuSubItem>
																{:else}
																	{#each threadsForProject as thread (thread._id)}
																		<Sidebar.MenuSubItem class="min-w-0">
																			<div
																				class="group/subthread flex w-full min-w-0 items-center gap-0.5"
																			>
																				<Sidebar.MenuSubButton
																					size="sm"
																					isActive={activeThreadId === thread._id}
																					class={cn(subNavPill, 'min-h-0 min-w-0 flex-1')}
																				>
																					{#snippet child({ props })}
																						<a
																							href={workspaceThreadHref(thread)}
																							data-workspace-nav-item
																							title={formatThreadTitleForDisplay(thread.title)}
																							{...props}
																						>
																							<span class="min-w-0 truncate"
																								>{formatThreadTitleForDisplay(thread.title)}</span
																							>
																						</a>
																					{/snippet}
																				</Sidebar.MenuSubButton>
																				<DropdownMenu.Root>
																					<DropdownMenu.Trigger
																						type="button"
																						class="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-sidebar-foreground/75 opacity-0 ring-sidebar-ring group-focus-within/subthread:opacity-100 group-hover/subthread:opacity-100 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-hidden [&>svg]:size-3"
																						onclick={(e) => e.stopPropagation()}
																						onpointerdown={(e) => e.stopPropagation()}
																						aria-label={`Chat actions: ${formatThreadTitleForDisplay(thread.title)}`}
																					>
																						<HugeiconsIcon
																							icon={MoreHorizontalCircle01Icon}
																							strokeWidth={2}
																						/>
																					</DropdownMenu.Trigger>
																					<DropdownMenu.Content class="min-w-40" align="end">
																						<DropdownMenu.Item
																							variant="destructive"
																							onclick={() =>
																								openDeleteThreadDialog(
																									thread._id,
																									thread.title,
																									project._id
																								)}
																						>
																							Delete thread
																						</DropdownMenu.Item>
																					</DropdownMenu.Content>
																				</DropdownMenu.Root>
																			</div>
																		</Sidebar.MenuSubItem>
																	{/each}
																{/if}
															</Sidebar.MenuSub>
														</Collapsible.Content>
													</Collapsible.Root>
												</Sidebar.MenuItem>
											{/each}
										{/if}
									</Sidebar.Menu>
								</Sidebar.GroupContent>
							</Collapsible.Content>
						</Sidebar.Group>
					</Collapsible.Root>

					<Collapsible.Root bind:open={openSections.Chats} class="border-0 shadow-none ring-0">
						<Sidebar.Group class="border-0 shadow-none ring-0">
							<Collapsible.Trigger class={sectionTrigger}>
								<HugeiconsIcon
									icon={ArrowRight01Icon}
									strokeWidth={2}
									class="size-3 shrink-0 transition-transform group-data-[state=open]/section:rotate-90"
								/>
								<span class="min-w-0 truncate">Inbox</span>
							</Collapsible.Trigger>
							<Collapsible.Content
								class="overflow-hidden group-data-[collapsible=icon]:hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
							>
								<Sidebar.GroupContent>
									<Sidebar.Menu>
										{#if threads.data === undefined}
											<Sidebar.MenuItem>
												<Sidebar.MenuButton size="sm" aria-disabled class={cn(navPill, 'min-w-0')}>
													<span class="min-w-0 truncate">Loading chats…</span>
												</Sidebar.MenuButton>
											</Sidebar.MenuItem>
										{:else if generalThreads.length === 0}
											<Sidebar.MenuItem>
												<div class="space-y-2 px-2 py-1.5">
													<p class="text-[11px] leading-snug text-sidebar-foreground/60">
														Start with a messy note. Launchpad will help turn it into a project.
													</p>
													<Sidebar.MenuButton size="sm" class={cn(navPill, 'min-w-0')}>
														{#snippet child({ props })}
															<a href={workspaceRootHref()} data-workspace-nav-item {...props}>
																<HugeiconsIcon icon={ChatAdd01Icon} strokeWidth={2} />
																<span class="min-w-0 truncate">Start first chat</span>
															</a>
														{/snippet}
													</Sidebar.MenuButton>
												</div>
											</Sidebar.MenuItem>
										{:else}
											{#each generalThreads as thread (thread._id)}
												<Sidebar.MenuItem class="min-w-0">
													<div class="group/inbox-thread flex w-full min-w-0 items-center gap-0.5">
														<Sidebar.MenuButton
															size="sm"
															isActive={activeThreadId === thread._id}
															class={cn(navPill, 'min-h-0 min-w-0 flex-1')}
														>
															{#snippet child({ props })}
																<a
																	href={workspaceThreadHref(thread)}
																	data-workspace-nav-item
																	title={formatThreadTitleForDisplay(thread.title)}
																	{...props}
																>
																	<span class="min-w-0 truncate"
																		>{formatThreadTitleForDisplay(thread.title)}</span
																	>
																</a>
															{/snippet}
														</Sidebar.MenuButton>
														<DropdownMenu.Root>
															<DropdownMenu.Trigger
																type="button"
																class="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-sidebar-foreground/75 opacity-0 ring-sidebar-ring group-focus-within/inbox-thread:opacity-100 group-hover/inbox-thread:opacity-100 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-hidden [&>svg]:size-3"
																onclick={(e) => e.stopPropagation()}
																onpointerdown={(e) => e.stopPropagation()}
																aria-label={`Chat actions: ${formatThreadTitleForDisplay(thread.title)}`}
															>
																<HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} />
															</DropdownMenu.Trigger>
															<DropdownMenu.Content class="min-w-40" align="end">
																<DropdownMenu.Item
																	variant="destructive"
																	onclick={() =>
																		openDeleteThreadDialog(thread._id, thread.title, null)}
																>
																	Delete thread
																</DropdownMenu.Item>
															</DropdownMenu.Content>
														</DropdownMenu.Root>
													</div>
												</Sidebar.MenuItem>
											{/each}
										{/if}
									</Sidebar.Menu>
								</Sidebar.GroupContent>
							</Collapsible.Content>
						</Sidebar.Group>
					</Collapsible.Root>

					<Collapsible.Root bind:open={openSections.Artifacts} class="border-0 shadow-none ring-0">
						<Sidebar.Group class="border-0 shadow-none ring-0">
							<Collapsible.Trigger class={sectionTrigger}>
								<HugeiconsIcon
									icon={ArrowRight01Icon}
									strokeWidth={2}
									class="size-3 shrink-0 transition-transform group-data-[state=open]/section:rotate-90"
								/>
								<span class="min-w-0 truncate">Artifacts</span>
							</Collapsible.Trigger>
							<Collapsible.Content
								class="overflow-hidden group-data-[collapsible=icon]:hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
							>
								<Sidebar.GroupContent>
									<Sidebar.Menu>
										{#if artifacts.data === undefined}
											<Sidebar.MenuItem>
												<Sidebar.MenuButton size="sm" aria-disabled class={cn(navPill, 'min-w-0')}>
													<span class="min-w-0 truncate">Loading artifacts…</span>
												</Sidebar.MenuButton>
											</Sidebar.MenuItem>
										{:else if artifacts.data.length === 0}
											<Sidebar.MenuItem>
												<p class="px-2 py-1.5 text-[11px] leading-snug text-sidebar-foreground/60">
													Artifacts appear when a chat saves an idea, PRD, or draftable document.
												</p>
											</Sidebar.MenuItem>
										{:else}
											{#each artifactGroups as group (group.key)}
												{#if group.artifacts.length > 0}
													<li class="list-none px-2 pt-2 pb-0.5 first:pt-0" role="presentation">
														<p
															class="text-[11px] font-medium tracking-wide text-sidebar-foreground/55 uppercase"
														>
															{group.label}
														</p>
													</li>
													{#each group.artifacts as artifact (artifact._id)}
														{@const canUseArtifactInThread =
															Boolean(activeThreadId) &&
															(activeProjectId
																? artifact.projectId === activeProjectId
																: !artifact.projectId) &&
															!activeThreadArtifactIds.has(artifact._id)}
														<Sidebar.MenuItem>
															<Sidebar.MenuButton
																size="sm"
																isActive={activeArtifactId === artifact._id && !activeThreadId}
																class={cn(navPill, 'min-w-0 gap-2')}
																tooltipContent={artifact.title}
															>
																{#snippet child({ props })}
																	<a
																		href={workspaceArtifactHref(artifact._id)}
																		data-workspace-nav-item
																		{...props}
																	>
																		<span class="min-w-0 flex-1 truncate">{artifact.title}</span>
																		<span class="shrink-0 text-[10px] text-sidebar-foreground/55">
																			{artifactTypeLabel(artifact.type)}
																		</span>
																	</a>
																{/snippet}
															</Sidebar.MenuButton>
															{#if canUseArtifactInThread}
																<Sidebar.MenuAction
																	showOnHover
																	aria-label="Use artifact in this chat"
																	aria-disabled={Boolean(importingArtifactId)}
																	onclick={() => useArtifactInThread(artifact._id)}
																>
																	{importingArtifactId === artifact._id ? '…' : '+'}
																</Sidebar.MenuAction>
															{/if}
														</Sidebar.MenuItem>
													{/each}
												{/if}
											{/each}
										{/if}
									</Sidebar.Menu>
								</Sidebar.GroupContent>
							</Collapsible.Content>
						</Sidebar.Group>
					</Collapsible.Root>
				</Sidebar.Content>

				<Sidebar.Footer class="border-t border-sidebar-border/60 p-2">
					<div class="group-data-[collapsible=icon]:hidden">
						{#if budget.data}
							<a
								href={workspaceSettingsHref()}
								data-workspace-nav-item
								class="mb-2 block rounded-full px-2.5 py-1.5 transition-colors outline-none hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
								aria-label={usageTooltip}
							>
								<div
									class="mb-1 flex items-center justify-between gap-2 text-[10px] text-sidebar-foreground/60"
								>
									<span class="font-medium tracking-wide uppercase">AI today</span>
									<span class="text-sidebar-foreground/75 tabular-nums">
										{money.format(budget.data.spentUsd)} / {money.format(budget.data.capUsd)}
									</span>
								</div>
								<div class="h-1 w-full overflow-hidden rounded-full bg-muted">
									<div
										class="h-full rounded-full bg-primary transition-[width]"
										style="width: {usageBarPct}%"
									></div>
								</div>
							</a>
						{:else if budget.error}
							<div class="mb-2 space-y-1.5 px-1.5">
								<p class="text-[10px] leading-snug text-destructive">Could not load usage.</p>
								<Button
									type="button"
									variant="secondary"
									size="sm"
									class="h-7 w-full text-[10px]"
									onclick={() => {
										void invalidateAll();
									}}
								>
									Retry
								</Button>
							</div>
						{:else}
							<p class="mb-2 px-1.5 text-[10px] text-sidebar-foreground/50">Loading usage…</p>
						{/if}
					</div>

					<div class="mb-1 hidden justify-center group-data-[collapsible=icon]:flex">
						{#snippet collapsedUsageTooltip()}
							{#if budget.data}
								<div class="w-44 space-y-1">
									<div class="flex items-center justify-between gap-2">
										<span class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
											AI today
										</span>
										<span class="text-xs tabular-nums text-foreground">
											{money.format(budget.data.spentUsd)} / {money.format(budget.data.capUsd)}
										</span>
									</div>
									<div class="h-1 w-full overflow-hidden rounded-full bg-muted">
										<div
											class="h-full rounded-full bg-primary transition-[width]"
											style="width: {usageBarPct}%"
										></div>
									</div>
									<p class="text-[10px] text-muted-foreground">{budget.data.dateKey}</p>
								</div>
							{:else}
								<span class="text-xs text-muted-foreground">Usage</span>
							{/if}
						{/snippet}
						<Sidebar.Menu>
							<Sidebar.MenuItem>
								<Sidebar.MenuButton
									size="sm"
									class={navPill}
									tooltipContent={collapsedUsageTooltip}
									tooltipContentProps={{
										class:
											'rounded-lg border border-border/70 bg-popover px-2.5 py-2 text-xs text-foreground'
									}}
								>
									{#snippet child({ props })}
										<a
											href={workspaceSettingsHref()}
											data-workspace-nav-item
											aria-label={usageTooltip}
											{...props}
										>
											<HugeiconsIcon icon={DollarCircleIcon} strokeWidth={2} />
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						</Sidebar.Menu>
					</div>

					<Sidebar.Menu class="gap-0.5">
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								size="sm"
								isActive={isSettingsActive}
								tooltipContent="Settings"
								class={cn(navPill, 'min-w-0')}
							>
								{#snippet child({ props })}
									<a
										href={workspaceSettingsHref()}
										data-workspace-nav-item
										aria-label="Settings"
										{...props}
									>
										<HugeiconsIcon icon={Settings01Icon} strokeWidth={2} />
										<span class="min-w-0 truncate group-data-[collapsible=icon]:sr-only"
											>Settings</span
										>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
						<ThemeMenu variant="sidebar-label" />
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								size="sm"
								tooltipContent="Sign out"
								class={cn(navPill, 'min-w-0')}
								aria-disabled={isSigningOut}
								onclick={handleSignOut}
							>
								<HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
								<span class="group-data-[collapsible=icon]:sr-only">
									{isSigningOut ? 'Signing out…' : 'Sign out'}
								</span>
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					</Sidebar.Menu>
				</Sidebar.Footer>
			</nav>
		</Sidebar.Root>

		<Sidebar.Inset class="min-h-0 min-w-0 overflow-hidden">
			<header
				class="flex h-10 shrink-0 items-center gap-1.5 border-b border-border/50 bg-background px-2 py-1"
			>
				<Sidebar.Trigger class="shrink-0" />
				<Button
					type="button"
					variant="ghost"
					size="sm"
					class="h-7 shrink-0 gap-1.5 px-2 text-[11px] text-muted-foreground"
					aria-label="Open command center"
					onclick={() => {
						commandCenterOpen = true;
					}}
				>
					<HugeiconsIcon icon={Search01Icon} strokeWidth={2} class="size-3.5 opacity-80" />
					<span class="hidden min-[400px]:inline">Search</span>
					<Kbd.KbdGroup class="hidden gap-0.5 opacity-80 min-[400px]:inline-flex">
						<Kbd.Kbd>⌘</Kbd.Kbd>
						<Kbd.Kbd>K</Kbd.Kbd>
					</Kbd.KbdGroup>
				</Button>
				<div class="flex min-w-0 flex-1 items-center gap-0.5">
					<WorkspaceTabStrip
						tabs={tabStrip.data?.tabs ?? []}
						activeTarget={activeWorkspaceTarget}
						projects={projects.data}
						threads={threads.data}
						artifacts={artifacts.data}
						onSelectTab={(t) => {
							void selectWorkspaceTab(t);
						}}
						onCloseTab={(id) => {
							void closeWorkspaceTab(id);
						}}
					/>
					<WorkspaceTabPicker
						bind:open={tabPickerOpen}
						projects={projects.data}
						threads={threads.data}
						artifacts={artifacts.data}
					/>
				</div>

				{#if workspaceArtifactChrome.value}
					<div
						class="flex max-w-[min(100%,20rem)] shrink-[2] flex-wrap items-center justify-end gap-1 sm:max-w-none"
					>
						{#if workspaceArtifactChrome.value.onBack}
							<Button
								type="button"
								variant="ghost"
								size="icon"
								class="size-8 shrink-0"
								aria-label="Back to thread artifacts"
								onclick={() => workspaceArtifactChrome.value?.onBack?.()}
							>
								<HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} class="size-4" />
							</Button>
						{/if}
						<div class="inline-flex shrink-0 items-center rounded-md border border-border/70 p-0.5">
							<Button
								type="button"
								size="sm"
								variant={workspaceArtifactChrome.value.surfaceMode === 'read'
									? 'secondary'
									: 'ghost'}
								class="h-7 rounded-sm px-2 text-xs font-medium"
								onclick={() => workspaceArtifactChrome.value?.setRead()}
							>
								Read
							</Button>
							<Button
								type="button"
								size="sm"
								variant={workspaceArtifactChrome.value.surfaceMode === 'compare'
									? 'secondary'
									: 'ghost'}
								class="h-7 rounded-sm px-2 text-xs font-medium"
								disabled={!workspaceArtifactChrome.value.canCompare}
								title={!workspaceArtifactChrome.value.canCompare
									? 'No pending AI drafts to compare'
									: undefined}
								onclick={() => workspaceArtifactChrome.value?.setCompare()}
							>
								Compare
							</Button>
						</div>
					</div>
				{/if}
				{#if canPromoteThreadToProject}
					<Button
						type="button"
						variant="outline"
						size="sm"
						class="h-8 shrink-0 gap-1.5 px-2 text-xs font-medium"
						onclick={openPromoteDialog}
					>
						<HugeiconsIcon icon={Rocket01Icon} strokeWidth={2} class="size-3.5 shrink-0" />
						<span class="hidden min-[420px]:inline">Create project from chat</span>
						<span class="min-[420px]:hidden">Project</span>
					</Button>
				{/if}
				{#if activeThreadId}
					<Button
						type="button"
						variant={contextPanelOpen ? 'secondary' : 'ghost'}
						size="icon"
						class="size-8 shrink-0"
						aria-label={contextPanelOpen ? 'Close thread context' : 'Open thread context'}
						onclick={toggleThreadContext}
					>
						{#if contextPanelOpen}
							<HugeiconsIcon icon={PanelRightCloseIcon} strokeWidth={2} class="size-3.5" />
						{:else}
							<HugeiconsIcon icon={PanelRightOpenIcon} strokeWidth={2} class="size-3.5" />
						{/if}
					</Button>
				{/if}
			</header>

			<main class="min-h-0 flex-1 overflow-hidden bg-background text-foreground">
				{#if workspaceNotice || artifactActionError}
					<div
						class="border-b border-border/50 px-4 py-2 text-xs {artifactActionError
							? 'text-destructive'
							: 'text-muted-foreground'}"
						role="status"
					>
						{artifactActionError || workspaceNotice}
					</div>
				{/if}
				{@render children()}
			</main>
		</Sidebar.Inset>

		<WorkspaceCommandPalette
			bind:open={commandCenterOpen}
			projects={projects.data}
			threads={threads.data}
			artifacts={artifacts.data}
			{activeThreadId}
			{contextPanelOpen}
			{canPromoteThreadToProject}
			onRequestPromote={() => {
				promoteDialogOpen = true;
			}}
			onToggleThreadContext={toggleThreadContext}
		/>

		<Dialog.Root bind:open={projectDeleteDialogOpen}>
			<Dialog.Content class="sm:max-w-md" showCloseButton={!isDeletingProject}>
				<Dialog.Header>
					<Dialog.Title>Delete project</Dialog.Title>
					<Dialog.Description>
						{#if projectToDelete}
							This removes “{projectToDelete.name}” and all of its chats and saved artifacts. This
							cannot be undone.
						{/if}
					</Dialog.Description>
				</Dialog.Header>
				{#if deleteNavError}
					<p class="text-xs text-destructive">{deleteNavError}</p>
				{/if}
				<Dialog.Footer>
					<Button
						type="button"
						variant="secondary"
						disabled={isDeletingProject}
						onclick={() => {
							projectDeleteDialogOpen = false;
							projectToDelete = null;
						}}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="destructive"
						disabled={isDeletingProject || !projectToDelete}
						onclick={confirmDeleteProject}
					>
						{isDeletingProject ? 'Deleting…' : 'Delete project'}
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>

		<Dialog.Root bind:open={threadDeleteDialogOpen}>
			<Dialog.Content class="sm:max-w-md" showCloseButton={!isDeletingThread}>
				<Dialog.Header>
					<Dialog.Title>Delete thread</Dialog.Title>
					<Dialog.Description>
						{#if threadToDelete}
							This removes “{formatThreadTitleForDisplay(threadToDelete.title)}” and its messages
							and saved artifacts. This cannot be undone.
						{/if}
					</Dialog.Description>
				</Dialog.Header>
				{#if deleteNavError}
					<p class="text-xs text-destructive">{deleteNavError}</p>
				{/if}
				<Dialog.Footer>
					<Button
						type="button"
						variant="secondary"
						disabled={isDeletingThread}
						onclick={() => {
							threadDeleteDialogOpen = false;
							threadToDelete = null;
						}}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="destructive"
						disabled={isDeletingThread || !threadToDelete}
						onclick={confirmDeleteThread}
					>
						{isDeletingThread ? 'Deleting…' : 'Delete thread'}
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>

		<Dialog.Root bind:open={promoteDialogOpen}>
			<Dialog.Content class="sm:max-w-md">
				<form
					class="space-y-4"
					onsubmit={(event) => {
						event.preventDefault();
						void promoteThreadToProject();
					}}
				>
					<Dialog.Header>
						<Dialog.Title>Create project from this chat</Dialog.Title>
						<Dialog.Description>
							Starts a named project and attaches this thread and its linked artifacts. You can keep
							chatting in the same thread afterward.
						</Dialog.Description>
					</Dialog.Header>

					<div class="space-y-3">
						<div class="space-y-1.5">
							<Label for="promote-project-name">Project name</Label>
							<Input
								id="promote-project-name"
								bind:value={promoteName}
								placeholder="Project name"
								aria-invalid={promoteError ? 'true' : undefined}
								disabled={isPromoting}
							/>
						</div>
						<div class="space-y-1.5">
							<Label for="promote-project-summary">Summary</Label>
							<Textarea
								id="promote-project-summary"
								bind:value={promoteSummary}
								placeholder="Optional context for future chats in this project"
								class="min-h-20"
								disabled={isPromoting}
							/>
						</div>
					</div>

					{#if promoteError}
						<p class="text-xs text-destructive">{promoteError}</p>
					{/if}

					<Dialog.Footer>
						<Button
							type="button"
							variant="secondary"
							disabled={isPromoting}
							onclick={closePromoteDialog}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isPromoting || !promoteName.trim()}>
							{isPromoting ? 'Creating…' : 'Create project'}
						</Button>
					</Dialog.Footer>
				</form>
			</Dialog.Content>
		</Dialog.Root>
	</Sidebar.Provider>
{/if}
