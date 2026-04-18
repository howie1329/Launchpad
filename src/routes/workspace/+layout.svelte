<script lang="ts">
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { page } from '$app/stores'
	import { auth, getConvexClient, signOut } from '$lib/auth.svelte'
	import { listArtifactsQuery } from '$lib/artifacts'
	import { artifactTypeLabel, groupArtifacts } from '$lib/artifact-display'
	import { listThreadsQuery } from '$lib/chat'
	import { LaunchpadMark } from '$lib/components/brand'
	import { Button } from '$lib/components/ui/button'
	import * as Collapsible from '$lib/components/ui/collapsible'
	import * as Sidebar from '$lib/components/ui/sidebar'
	import ThemeMenu from '$lib/components/ThemeMenu.svelte'
	import { createProjectMutation, listProjectsQuery } from '$lib/projects'
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
	import FileTextIcon from '@lucide/svelte/icons/file-text'
	import FolderIcon from '@lucide/svelte/icons/folder'
	import FolderPlusIcon from '@lucide/svelte/icons/folder-plus'
	import LogOutIcon from '@lucide/svelte/icons/log-out'
	import MessageSquarePlusIcon from '@lucide/svelte/icons/message-square-plus'
	import MessageSquareTextIcon from '@lucide/svelte/icons/message-square-text'
	import PanelRightCloseIcon from '@lucide/svelte/icons/panel-right-close'
	import PanelRightOpenIcon from '@lucide/svelte/icons/panel-right-open'
	import { useQuery } from 'convex-svelte'

	let { children } = $props()

	let sidebarOpen = $state(true)
	let isSigningOut = $state(false)
	let isCreatingProject = $state(false)
	let openSections = $state({
		Projects: true,
		Chats: true
	})
	let artifactSectionsOpen = $state({
		idea: true,
		prd: true,
		research: false,
		markdown: false,
		other: false
	})

	const pathname = $derived($page.url.pathname)
	const activeProjectId = $derived($page.url.searchParams.get('project')?.trim() ?? '')
	const activeThreadId = $derived($page.url.searchParams.get('thread')?.trim() ?? '')
	const activeArtifactId = $derived($page.url.searchParams.get('artifact')?.trim() ?? '')
	const contextPanelOpen = $derived($page.url.searchParams.get('context') === '1')
	const isNewChatActive = $derived(
		pathname === '/workspace' && !activeProjectId && !activeThreadId && !activeArtifactId
	)
	const projects = useQuery(listProjectsQuery, () => (auth.isAuthenticated ? {} : 'skip'))
	const threads = useQuery(listThreadsQuery, () => (auth.isAuthenticated ? {} : 'skip'))
	const artifacts = useQuery(listArtifactsQuery, () => (auth.isAuthenticated ? {} : 'skip'))
	const selectedProject = $derived(
		projects.data?.find((project) => project._id === activeProjectId) ?? null
	)
	const selectedThread = $derived(
		threads.data?.find((thread) => thread._id === activeThreadId) ?? null
	)
	const selectedArtifact = $derived(
		artifacts.data?.find((artifact) => artifact._id === activeArtifactId) ?? null
	)
	const generalThreads = $derived(
		threads.data?.filter((thread) => thread.scopeType === 'general') ?? []
	)
	const artifactGroups = $derived(groupArtifacts(artifacts.data ?? [], (artifact) => artifact))
	const headerTitle = $derived(
		selectedThread?.title ??
			selectedArtifact?.title ??
			selectedProject?.name ??
			(activeArtifactId ? 'Artifact' : activeProjectId ? 'Project' : 'New Chat')
	)
	const headerDescription = $derived(
		activeThreadId
			? 'Active thread with explicit context.'
			: activeArtifactId
				? 'Saved workspace artifact.'
				: activeProjectId
					? 'Start a new chat in this project.'
					: 'Start from a rough thought.'
	)

	const projectThreads = (projectId: string) =>
		threads.data?.filter((thread) => thread.projectId === projectId) ?? []

	const createProject = async () => {
		if (isCreatingProject) return

		const name = window.prompt('Project name')
		if (!name?.trim()) return

		isCreatingProject = true

		try {
			const result = await getConvexClient().mutation(createProjectMutation, {
				name: name.trim()
			})
			await goto(resolve(`/workspace?project=${encodeURIComponent(result.projectId)}`))
		} finally {
			isCreatingProject = false
		}
	}

	const toggleThreadContext = async () => {
		const projectQuery = activeProjectId ? `project=${encodeURIComponent(activeProjectId)}&` : ''

		if (contextPanelOpen) {
			await goto(
				resolve(
					`/workspace?${projectQuery}thread=${encodeURIComponent(activeThreadId)}` as `/workspace?${string}`
				),
				{
					noScroll: true,
					keepFocus: true
				}
			)
			return
		}

		await goto(
			resolve(
				`/workspace?${projectQuery}thread=${encodeURIComponent(activeThreadId)}&context=1` as `/workspace?${string}`
			),
			{
				noScroll: true,
				keepFocus: true
			}
		)
	}

	const handleSignOut = async () => {
		if (isSigningOut) return

		isSigningOut = true

		try {
			await signOut()
			await goto(resolve('/'))
		} finally {
			isSigningOut = false
		}
	}

	$effect(() => {
		if (!auth.isLoading && !auth.isAuthenticated) {
			const nextPath = pathname.startsWith('/workspace') ? pathname : '/workspace'
			void goto(resolve(`/auth?redirectTo=${encodeURIComponent(nextPath)}`))
		}
	})
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
			<Sidebar.Header>
				<Sidebar.Menu class="gap-4">
					<Sidebar.MenuItem>
						<Sidebar.MenuButton size="lg" class=" md:h-8 md:p-0">
							{#snippet child({ props })}
								<a href={resolve('/workspace')} aria-label="Workspace home" {...props}>
									<div
										class="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"
									>
										<LaunchpadMark class="size-4" />
									</div>
									<span class="min-w-0 truncate font-semibold">Workspace</span>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
					<Sidebar.MenuItem>
						<Sidebar.MenuButton isActive={isNewChatActive} class="min-w-0">
							{#snippet child({ props })}
								<a href={resolve('/workspace')} aria-label="New Chat" {...props}>
									<MessageSquarePlusIcon />
									<span class="min-w-0 truncate">New Chat</span>
								</a>
							{/snippet}
							{#snippet tooltipContent()}
								<span>New Chat</span>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			</Sidebar.Header>

			<Sidebar.Content>
				<Collapsible.Root bind:open={openSections.Projects}>
					<Sidebar.Group>
						<Collapsible.Trigger
							class="group/section flex h-8 w-full items-center gap-1 rounded-md px-2 text-left text-xs font-medium text-sidebar-foreground/70 transition-colors group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
						>
							<ChevronRightIcon
								class="size-3.5 shrink-0 transition-transform group-data-[state=open]/section:rotate-90"
							/>
							<span class="min-w-0 truncate">Projects</span>
						</Collapsible.Trigger>
						<Sidebar.GroupAction
							aria-label="New project"
							aria-disabled={isCreatingProject}
							onclick={createProject}
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
											<Sidebar.MenuButton aria-disabled class="min-w-0">
												<span class="min-w-0 truncate">Loading projects...</span>
											</Sidebar.MenuButton>
										</Sidebar.MenuItem>
									{:else if projects.data.length === 0}
										<Sidebar.MenuItem>
											<Sidebar.MenuButton aria-disabled class="min-w-0">
												<span class="min-w-0 truncate">No projects yet</span>
											</Sidebar.MenuButton>
										</Sidebar.MenuItem>
									{:else}
										{#each projects.data as project (project._id)}
											<Sidebar.MenuItem>
												<Sidebar.MenuButton
													isActive={activeProjectId === project._id && !activeThreadId}
													class="min-w-0"
												>
													{#snippet child({ props })}
														<a
															href={resolve(
																`/workspace?project=${encodeURIComponent(project._id)}`
															)}
															{...props}
														>
															<FolderIcon />
															<span class="min-w-0 truncate">{project.name}</span>
														</a>
													{/snippet}
												</Sidebar.MenuButton>
												<Sidebar.MenuSub>
													{@const threadsForProject = projectThreads(project._id)}
													{#if threads.data === undefined}
														<Sidebar.MenuSubItem>
															<Sidebar.MenuSubButton aria-disabled>
																<span>Loading chats...</span>
															</Sidebar.MenuSubButton>
														</Sidebar.MenuSubItem>
													{:else if threadsForProject.length === 0}
														<Sidebar.MenuSubItem>
															<Sidebar.MenuSubButton aria-disabled>
																<span>No chats yet</span>
															</Sidebar.MenuSubButton>
														</Sidebar.MenuSubItem>
													{:else}
														{#each threadsForProject as thread (thread._id)}
															<Sidebar.MenuSubItem>
																<Sidebar.MenuSubButton isActive={activeThreadId === thread._id}>
																	{#snippet child({ props })}
																		<a
																			href={resolve(
																				`/workspace?project=${encodeURIComponent(project._id)}&thread=${encodeURIComponent(thread._id)}`
																			)}
																			{...props}
																		>
																			<MessageSquareTextIcon />
																			<span>{thread.title}</span>
																		</a>
																	{/snippet}
																</Sidebar.MenuSubButton>
															</Sidebar.MenuSubItem>
														{/each}
													{/if}
												</Sidebar.MenuSub>
											</Sidebar.MenuItem>
										{/each}
									{/if}
								</Sidebar.Menu>
							</Sidebar.GroupContent>
						</Collapsible.Content>
					</Sidebar.Group>
				</Collapsible.Root>

				<Collapsible.Root bind:open={openSections.Chats}>
					<Sidebar.Group>
						<Collapsible.Trigger
							class="group/section flex h-8 w-full items-center gap-1 rounded-md px-2 text-left text-xs font-medium text-sidebar-foreground/70 transition-colors group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
						>
							<ChevronRightIcon
								class="size-3.5 shrink-0 transition-transform group-data-[state=open]/section:rotate-90"
							/>
							<span class="min-w-0 truncate">General chats</span>
						</Collapsible.Trigger>
						<Collapsible.Content
							class="overflow-hidden group-data-[collapsible=icon]:hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
						>
							<Sidebar.GroupContent>
								<Sidebar.Menu>
									{#if threads.data === undefined}
										<Sidebar.MenuItem>
											<Sidebar.MenuButton aria-disabled class="min-w-0">
												<span class="min-w-0 truncate">Loading chats...</span>
											</Sidebar.MenuButton>
										</Sidebar.MenuItem>
									{:else if generalThreads.length === 0}
										<Sidebar.MenuItem>
											<Sidebar.MenuButton aria-disabled class="min-w-0">
												<span class="min-w-0 truncate">No chats yet</span>
											</Sidebar.MenuButton>
										</Sidebar.MenuItem>
									{:else}
										{#each generalThreads as thread (thread._id)}
											<Sidebar.MenuItem>
												<Sidebar.MenuButton
													isActive={activeThreadId === thread._id}
													class="min-w-0"
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

				{#each artifactGroups as group (group.key)}
					<Collapsible.Root bind:open={artifactSectionsOpen[group.key]}>
						<Sidebar.Group>
							<Collapsible.Trigger
								class="group/section flex h-8 w-full items-center gap-1 rounded-md px-2 text-left text-xs font-medium text-sidebar-foreground/70 transition-colors group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
							>
								<ChevronRightIcon
									class="size-3.5 shrink-0 transition-transform group-data-[state=open]/section:rotate-90"
								/>
								<span class="min-w-0 truncate">{group.label}</span>
							</Collapsible.Trigger>
							<Collapsible.Content
								class="overflow-hidden group-data-[collapsible=icon]:hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
							>
								<Sidebar.GroupContent>
									<Sidebar.Menu>
										{#if artifacts.data === undefined}
											<Sidebar.MenuItem>
												<Sidebar.MenuButton aria-disabled class="min-w-0">
													<span class="min-w-0 truncate">Loading artifacts...</span>
												</Sidebar.MenuButton>
											</Sidebar.MenuItem>
										{:else if group.artifacts.length === 0}
											<Sidebar.MenuItem>
												<Sidebar.MenuButton aria-disabled class="min-w-0">
													<span class="min-w-0 truncate">No artifacts yet</span>
												</Sidebar.MenuButton>
											</Sidebar.MenuItem>
										{:else}
											{#each group.artifacts as artifact (artifact._id)}
												<Sidebar.MenuItem>
													<Sidebar.MenuButton
														isActive={activeArtifactId === artifact._id && !activeThreadId}
														class="min-w-0"
													>
														{#snippet child({ props })}
															<a
																href={resolve(
																	`/workspace?artifact=${encodeURIComponent(artifact._id)}` as `/workspace?${string}`
																)}
																{...props}
															>
																<FileTextIcon />
																<span class="min-w-0 truncate">{artifact.title}</span>
																<span class="sr-only">{artifactTypeLabel(artifact.type)}</span>
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
				{/each}
			</Sidebar.Content>

			<Sidebar.Footer>
				<Sidebar.Menu>
					<ThemeMenu variant="sidebar-label" />
					<Sidebar.MenuItem>
						<Sidebar.MenuButton
							tooltipContent="Sign out"
							aria-disabled={isSigningOut}
							onclick={handleSignOut}
						>
							<LogOutIcon />
							<span>{isSigningOut ? 'Signing out' : 'Sign out'}</span>
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			</Sidebar.Footer>
		</Sidebar.Root>

		<Sidebar.Inset class="min-h-0 min-w-0 overflow-hidden">
			<header
				class="flex h-12 shrink-0 items-center gap-2 border-b border-border/50 bg-background px-4"
			>
				<Sidebar.Trigger class="-ms-1" />
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-semibold tracking-tight">{headerTitle}</p>
					<p class="truncate text-[11px] text-muted-foreground">{headerDescription}</p>
				</div>
				{#if activeThreadId}
					<Button
						type="button"
						variant={contextPanelOpen ? 'secondary' : 'ghost'}
						size="sm"
						class="h-8 shrink-0 gap-1.5 text-xs"
						onclick={toggleThreadContext}
					>
						{#if contextPanelOpen}
							<PanelRightCloseIcon class="size-3.5" />
							Hide context
						{:else}
							<PanelRightOpenIcon class="size-3.5" />
							Thread context
						{/if}
					</Button>
				{/if}
			</header>

			<main class="min-h-0 flex-1 overflow-hidden bg-background text-foreground">
				{@render children()}
			</main>
		</Sidebar.Inset>
	</Sidebar.Provider>
{/if}
