<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { auth, getConvexClient, signOut } from '$lib/auth.svelte';
	import {
		linkArtifactToThreadMutation,
		listArtifactsQuery,
		listThreadArtifactsQuery
	} from '$lib/artifacts';
	import { artifactTypeLabel, groupArtifacts } from '$lib/artifact-display';
	import { listThreadsQuery } from '$lib/chat';
	import { getAiBudgetStatusQuery } from '$lib/usage';
	import { LaunchpadMark } from '$lib/components/brand';
	import { Button } from '$lib/components/ui/button';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { cn } from '$lib/utils';
	import { Textarea } from '$lib/components/ui/textarea';
	import ThemeMenu from '$lib/components/ThemeMenu.svelte';
	import {
		createProjectFromThreadMutation,
		createProjectMutation,
		listProjectsQuery
	} from '$lib/projects';
	import { workspaceArtifactChrome } from '$lib/workspace-artifact-chrome.svelte';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import CircleDollarSignIcon from '@lucide/svelte/icons/circle-dollar-sign';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import FolderPlusIcon from '@lucide/svelte/icons/folder-plus';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import MessageSquarePlusIcon from '@lucide/svelte/icons/message-square-plus';
	import MessageSquareTextIcon from '@lucide/svelte/icons/message-square-text';
	import PanelRightCloseIcon from '@lucide/svelte/icons/panel-right-close';
	import PanelRightOpenIcon from '@lucide/svelte/icons/panel-right-open';
	import RocketIcon from '@lucide/svelte/icons/rocket';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import { useQuery } from 'convex-svelte';
	import type { Id } from '../../convex/_generated/dataModel';

	let { children } = $props();

	let sidebarOpen = $state(true);
	let isSigningOut = $state(false);
	let isCreatingProject = $state(false);
	let projectDialogOpen = $state(false);
	let projectName = $state('');
	let projectSummary = $state('');
	let projectError = $state('');
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
	const headerTitle = $derived(
		isSettingsActive
			? 'Settings'
			: (selectedThread?.title ??
					selectedArtifact?.title ??
					selectedProject?.name ??
					(activeArtifactId ? 'Artifact' : activeProjectId ? 'Project' : 'New Chat'))
	);
	const headerDescription = $derived(
		isSettingsActive
			? 'Manage workspace preferences.'
			: activeThreadId || activeArtifactId
				? ''
				: activeProjectId
					? 'Start a new chat in this project.'
					: 'Start from a rough thought.'
	);

	const projectThreads = (projectId: string) =>
		threads.data?.filter((thread) => thread.projectId === projectId) ?? [];
	const isProjectOpen = (projectId: string) => openProjectIds[projectId] ?? true;
	const setProjectOpen = (projectId: string, open: boolean) => {
		openProjectIds = { ...openProjectIds, [projectId]: open };
	};
	const canCreateProject = $derived(Boolean(projectName.trim()) && !isCreatingProject);

	const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

	/** Design-system-aligned nav rows: dense, 12px icons */
	const navPill =
		'h-7 min-w-0 gap-2 rounded-md px-2.5 text-xs [&>svg]:size-3 data-[active=true]:font-medium';
	const navPillPrimary =
		'bg-primary text-primary-foreground shadow-none hover:bg-primary/90 hover:text-primary-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground';
	const sectionTrigger =
		'group/section flex h-7 w-full items-center gap-1 rounded-md px-2 text-left text-[11px] font-medium uppercase tracking-wide text-sidebar-foreground/55 transition-colors hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none group-data-[collapsible=icon]:hidden';
	const subNavPill =
		'h-7 min-w-0 gap-2 rounded-md px-2.5 text-xs [&>svg]:size-3 data-[active=true]:font-medium';

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

	const createProject = async () => {
		if (isCreatingProject) return;

		const name = projectName.trim();
		const summary = projectSummary.trim();

		if (!name) {
			projectError = 'Project name is required.';
			return;
		}

		isCreatingProject = true;
		projectError = '';

		try {
			const result = await getConvexClient().mutation(createProjectMutation, {
				name,
				...(summary ? { summary } : {})
			});
			projectDialogOpen = false;
			projectName = '';
			projectSummary = '';
			workspaceNotice = 'Project created.';
			await goto(resolve(`/workspace?project=${encodeURIComponent(result.projectId)}`));
		} catch (error) {
			console.error(error);
			projectError = 'Could not create this project. Please try again.';
		} finally {
			isCreatingProject = false;
		}
	};

	const closeProjectDialog = () => {
		if (isCreatingProject) return;

		projectDialogOpen = false;
		projectName = '';
		projectSummary = '';
		projectError = '';
	};

	const openPromoteDialog = () => {
		if (!selectedThread || selectedThread.projectId) return;
		promoteName = selectedThread.title?.trim() || 'New project';
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
				resolve(
					`/workspace?project=${encodeURIComponent(result.projectId)}&thread=${encodeURIComponent(activeThreadId)}` as `/workspace?${string}`
				)
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
		const projectQuery = activeProjectId ? `project=${encodeURIComponent(activeProjectId)}&` : '';

		if (contextPanelOpen) {
			await goto(
				resolve(
					`/workspace?${projectQuery}thread=${encodeURIComponent(activeThreadId)}` as `/workspace?${string}`
				),
				{
					noScroll: true,
					keepFocus: true
				}
			);
			return;
		}

		await goto(
			resolve(
				`/workspace?${projectQuery}thread=${encodeURIComponent(activeThreadId)}&context=1` as `/workspace?${string}`
			),
			{
				noScroll: true,
				keepFocus: true
			}
		);
	};

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
		<Sidebar.Root collapsible="icon" class="overflow-hidden">
			<Sidebar.Header class="h-10 border-b border-border/50 px-2 py-1">
				<Sidebar.Menu class="flex flex-row items-center gap-1">
					<Sidebar.MenuItem class="min-w-0 flex-1 group-data-[collapsible=icon]:flex-none">
						<Sidebar.MenuButton size="sm" class={cn(navPill, 'min-w-0')}>
							{#snippet child({ props })}
								<a href={resolve('/workspace')} aria-label="Workspace home" {...props}>
									<div
										class="flex aspect-square size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground group-data-[collapsible=icon]:size-8"
									>
										<LaunchpadMark class="size-3.5" />
									</div>
									<span class="min-w-0 truncate font-semibold group-data-[collapsible=icon]:sr-only"
										>Workspace</span
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
								class={cn(navPill, navPillPrimary)}
								tooltipContent="New chat"
							>
								{#snippet child({ props })}
									<a href={resolve('/workspace')} aria-label="New chat" {...props}>
										<MessageSquarePlusIcon />
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
							<ChevronRightIcon
								class="size-3 shrink-0 transition-transform group-data-[state=open]/section:rotate-90"
							/>
							<span class="min-w-0 truncate">Projects</span>
						</Collapsible.Trigger>
						<Sidebar.GroupAction
							class="top-1 right-2"
							aria-label="New project"
							aria-disabled={isCreatingProject}
							onclick={() => {
								if (!isCreatingProject) projectDialogOpen = true;
							}}
						>
							<FolderPlusIcon />
						</Sidebar.GroupAction>
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
												<Button
													type="button"
													variant="ghost"
													size="sm"
													class="h-7 w-full justify-start px-2 text-xs"
													onclick={() => {
														projectDialogOpen = true;
													}}
												>
													Create project
												</Button>
											</div>
										</Sidebar.MenuItem>
									{:else}
										{#each projects.data as project (project._id)}
											<Sidebar.MenuItem>
												<Collapsible.Root
													open={isProjectOpen(project._id)}
													onOpenChange={(open) => setProjectOpen(project._id, open)}
												>
													<Collapsible.Trigger>
														{#snippet child({ props })}
															<Sidebar.MenuButton
																size="sm"
																isActive={activeProjectId === project._id && !activeThreadId}
																class={cn(navPill, 'min-w-0 pr-8')}
																{...props}
															>
																<ChevronRightIcon
																	class="size-3 shrink-0 transition-transform data-[state=open]:rotate-90"
																	data-state={isProjectOpen(project._id) ? 'open' : 'closed'}
																/>
																<FolderIcon />
																<span class="min-w-0 truncate">{project.name}</span>
															</Sidebar.MenuButton>
														{/snippet}
													</Collapsible.Trigger>
													<Sidebar.MenuAction aria-label={`New chat in ${project.name}`}>
														{#snippet child({ props })}
															<a
																href={resolve(
																	`/workspace?project=${encodeURIComponent(project._id)}`
																)}
																{...props}
															>
																<MessageSquarePlusIcon />
															</a>
														{/snippet}
													</Sidebar.MenuAction>
													<Collapsible.Content
														class="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
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
																				href={resolve(
																					`/workspace?project=${encodeURIComponent(project._id)}`
																				)}
																				{...props}
																			>
																				<span class="text-sidebar-foreground/60">Start chat</span>
																			</a>
																		{/snippet}
																	</Sidebar.MenuSubButton>
																</Sidebar.MenuSubItem>
															{:else}
																{#each threadsForProject as thread (thread._id)}
																	<Sidebar.MenuSubItem>
																		<Sidebar.MenuSubButton
																			size="sm"
																			isActive={activeThreadId === thread._id}
																			class={cn(subNavPill, 'min-w-0')}
																		>
																			{#snippet child({ props })}
																				<a
																					href={resolve(
																						`/workspace?project=${encodeURIComponent(project._id)}&thread=${encodeURIComponent(thread._id)}`
																					)}
																					{...props}
																				>
																					<span class="min-w-0 truncate">{thread.title}</span>
																				</a>
																			{/snippet}
																		</Sidebar.MenuSubButton>
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
							<ChevronRightIcon
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
														<a href={resolve('/workspace')} {...props}>
															<MessageSquarePlusIcon />
															<span class="min-w-0 truncate">Start first chat</span>
														</a>
													{/snippet}
												</Sidebar.MenuButton>
											</div>
										</Sidebar.MenuItem>
									{:else}
										{#each generalThreads as thread (thread._id)}
											<Sidebar.MenuItem>
												<Sidebar.MenuButton
													size="sm"
													isActive={activeThreadId === thread._id}
													class={cn(navPill, 'min-w-0')}
												>
													{#snippet child({ props })}
														<a
															href={resolve(`/workspace?thread=${encodeURIComponent(thread._id)}`)}
															{...props}
														>
															<MessageSquareTextIcon />
															<span class="min-w-0 truncate">{thread.title}</span>
														</a>
													{/snippet}
												</Sidebar.MenuButton>
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
							<ChevronRightIcon
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
																	href={resolve(
																		`/workspace/artifacts/${encodeURIComponent(artifact._id)}`
																	)}
																	{...props}
																>
																	<FileTextIcon class="shrink-0" />
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
							href={resolve('/workspace/settings')}
							class="mb-2 block rounded-md px-1.5 py-1.5 transition-colors outline-none hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
							aria-label={usageTooltip}
						>
							<div
								class="mb-1 flex items-center justify-between gap-2 text-[10px] text-sidebar-foreground/70"
							>
								<span class="font-medium tracking-wide uppercase">AI today</span>
								<span class="text-sidebar-foreground tabular-nums">
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
					<Sidebar.Menu>
						<Sidebar.MenuItem>
							<Sidebar.MenuButton size="sm" class={navPill} tooltipContent={usageTooltip}>
								{#snippet child({ props })}
									<a href={resolve('/workspace/settings')} aria-label={usageTooltip} {...props}>
										<CircleDollarSignIcon />
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
								<a href={resolve('/workspace/settings')} aria-label="Settings" {...props}>
									<SettingsIcon />
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
							<LogOutIcon />
							<span class="group-data-[collapsible=icon]:sr-only">
								{isSigningOut ? 'Signing out…' : 'Sign out'}
							</span>
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			</Sidebar.Footer>
		</Sidebar.Root>

		<Sidebar.Inset class="min-h-0 min-w-0 overflow-hidden">
			<header
				class="flex h-10 shrink-0 items-center gap-2 border-b border-border/50 bg-background px-4"
			>
				<Sidebar.Trigger class="-ms-1" />
				<div class="min-w-0 flex-1">
					<p class="truncate text-lg font-semibold tracking-tight">{headerTitle}</p>
					{#if headerDescription}
						<p class="truncate text-[11px] text-muted-foreground">{headerDescription}</p>
					{/if}
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
								<ChevronLeftIcon class="size-4" />
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
						<RocketIcon class="size-3.5 shrink-0" />
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
							<PanelRightCloseIcon class="size-3.5" />
						{:else}
							<PanelRightOpenIcon class="size-3.5" />
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

		<Dialog.Root bind:open={projectDialogOpen}>
			<Dialog.Content class="sm:max-w-md">
				<form
					class="space-y-4"
					onsubmit={(event) => {
						event.preventDefault();
						void createProject();
					}}
				>
					<Dialog.Header>
						<Dialog.Title>Create project</Dialog.Title>
						<Dialog.Description>
							Add a workspace for chats and artifacts that belong together.
						</Dialog.Description>
					</Dialog.Header>

					<div class="space-y-3">
						<div class="space-y-1.5">
							<Label for="project-name">Name</Label>
							<Input
								id="project-name"
								bind:value={projectName}
								placeholder="Project name"
								aria-invalid={projectError ? 'true' : undefined}
								disabled={isCreatingProject}
							/>
						</div>
						<div class="space-y-1.5">
							<Label for="project-summary">Summary</Label>
							<Textarea
								id="project-summary"
								bind:value={projectSummary}
								placeholder="Optional project context"
								class="min-h-20"
								disabled={isCreatingProject}
							/>
						</div>
					</div>

					{#if projectError}
						<p class="text-xs text-destructive">{projectError}</p>
					{/if}

					<Dialog.Footer>
						<Button
							type="button"
							variant="secondary"
							disabled={isCreatingProject}
							onclick={closeProjectDialog}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={!canCreateProject}>
							{isCreatingProject ? 'Creating...' : 'Create project'}
						</Button>
					</Dialog.Footer>
				</form>
			</Dialog.Content>
		</Dialog.Root>
	</Sidebar.Provider>
{/if}
