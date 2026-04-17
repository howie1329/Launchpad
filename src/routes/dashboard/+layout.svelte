<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { auth, signOut } from '$lib/auth.svelte';
	import { dashboardSearchParamsSchema } from '$lib/dashboard-search-params';
	import { LaunchpadMark } from '$lib/components/brand';
	import { Button } from '$lib/components/ui/button';
	import * as Kbd from '$lib/components/ui/kbd';
	import { Separator } from '$lib/components/ui/separator';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import ThemeMenu from '$lib/components/ThemeMenu.svelte';
	import { listIdeasQuery } from '$lib/ideas';
	import { listPrdsQuery } from '$lib/prds';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import LightbulbIcon from '@lucide/svelte/icons/lightbulb';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import { useQuery } from 'convex-svelte';
	import { useSearchParams } from 'runed/kit';

	let { children } = $props();

	const tools = [
		{
			id: 'scope',
			label: 'MVP Creator',
			href: '/dashboard/scope',
			icon: FileTextIcon,
			status: 'Create a PRD or reopen a saved scope.'
		},
		{
			id: 'ideas',
			label: 'Ideas',
			href: '/dashboard/ideas',
			icon: LightbulbIcon,
			status: 'Explore product directions before scoping.'
		},
		{
			id: 'settings',
			label: 'Settings',
			href: '/dashboard/settings',
			icon: SettingsIcon,
			status: 'Manage workspace preferences.'
		}
	] as const;

	let sidebarOpen = $state(true);
	let isSigningOut = $state(false);
	let hasAutoCollapsedForSettings = $state(false);
	const routeParams = useSearchParams(dashboardSearchParamsSchema);

	const pathname = $derived($page.url.pathname);
	const selectedIdeaId = $derived(routeParams.idea || null);
	const selectedPrdId = $derived(routeParams.prd || null);
	const isScopeRoute = $derived(pathname.includes('/scope'));
	const isIdeasRoute = $derived(pathname.includes('/ideas'));
	const isSettingsRoute = $derived(pathname.includes('/settings'));
	const activeTool = $derived(
		isScopeRoute ? tools[0] : isIdeasRoute ? tools[1] : isSettingsRoute ? tools[2] : null
	);
	const activeStatus = $derived(activeTool?.status ?? 'Choose a tool from the sidebar.');
	const savedIdeas = useQuery(listIdeasQuery, () => (auth.isAuthenticated ? {} : 'skip'));
	const savedPrds = useQuery(listPrdsQuery, () => (auth.isAuthenticated ? {} : 'skip'));

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
			const nextPath = pathname.startsWith('/dashboard') ? pathname : '/dashboard';
			void goto(resolve(`/auth?redirectTo=${encodeURIComponent(nextPath)}`));
		}
	});

	$effect(() => {
		if (isSettingsRoute && !hasAutoCollapsedForSettings) {
			sidebarOpen = false;
			hasAutoCollapsedForSettings = true;
		}

		if (!isSettingsRoute) {
			hasAutoCollapsedForSettings = false;
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
		style="--sidebar-width: 18rem;"
	>
		<Sidebar.Root collapsible="icon" class="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row">
			<Sidebar.Root collapsible="none" class="!w-[calc(var(--sidebar-width-icon)_+_1px)] border-e">
				<Sidebar.Header>
					<Sidebar.Menu>
						<Sidebar.MenuItem>
							<Sidebar.MenuButton size="lg" class="md:h-8 md:p-0">
								{#snippet child({ props })}
									<a href={resolve('/dashboard')} aria-label="Dashboard home" {...props}>
										<div
											class="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"
										>
											<LaunchpadMark class="size-4" />
										</div>
										<span class="sr-only">Launchpad</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					</Sidebar.Menu>
				</Sidebar.Header>

				<Sidebar.Content>
					<Sidebar.Group>
						<Sidebar.GroupContent class="px-1.5 md:px-0">
							<Sidebar.Menu>
								{#each tools as tool (tool.id)}
									<Sidebar.MenuItem>
										<Sidebar.MenuButton
											isActive={activeTool?.id === tool.id}
											class="justify-center px-0 md:size-8 md:p-0"
										>
											{#snippet child({ props })}
												<a href={resolve(tool.href)} aria-label={tool.label} {...props}>
													<tool.icon />
													<span class="sr-only">{tool.label}</span>
												</a>
											{/snippet}
											{#snippet tooltipContent()}
												<span>{tool.label}</span>
												<Kbd.Root
													>{tool.id === 'scope' ? '1' : tool.id === 'ideas' ? '2' : '3'}</Kbd.Root
												>
											{/snippet}
										</Sidebar.MenuButton>
									</Sidebar.MenuItem>
								{/each}
							</Sidebar.Menu>
						</Sidebar.GroupContent>
					</Sidebar.Group>
				</Sidebar.Content>

				<Sidebar.Footer>
					<Sidebar.Menu>
						<ThemeMenu variant="sidebar" />
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								tooltipContent="Sign out"
								aria-disabled={isSigningOut}
								onclick={handleSignOut}
								class="justify-center px-0 md:size-8 md:p-0"
							>
								<LogOutIcon />
								<span class="sr-only">{isSigningOut ? 'Signing out' : 'Sign out'}</span>
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					</Sidebar.Menu>
				</Sidebar.Footer>
			</Sidebar.Root>

			{#if isScopeRoute || isIdeasRoute}
				<Sidebar.Root
					collapsible="none"
					class="hidden min-w-0 overflow-hidden border-e md:flex md:!w-[calc(var(--sidebar-width)_-_var(--sidebar-width-icon)_-_1px)]"
				>
					{#if isScopeRoute}
						<Sidebar.Header class="min-w-0 gap-3 overflow-hidden border-b p-4">
							<div class="min-w-0">
								<p class="truncate text-sm font-semibold tracking-tight">MVP Creator</p>
								<p class="mt-1 truncate text-xs leading-5 text-muted-foreground">
									Scope the first version, then save the PRD.
								</p>
							</div>
							<Sidebar.Menu>
								<Sidebar.MenuItem>
									<Sidebar.MenuButton isActive={!selectedPrdId} class="min-w-0">
										{#snippet child({ props })}
											<a href={resolve('/dashboard/scope')} {...props}>
												<PlusIcon />
												<span class="min-w-0 truncate">New scope</span>
											</a>
										{/snippet}
									</Sidebar.MenuButton>
								</Sidebar.MenuItem>
							</Sidebar.Menu>
						</Sidebar.Header>
						<Sidebar.Content>
							<Sidebar.Group>
								<Sidebar.GroupLabel>Saved PRDs</Sidebar.GroupLabel>
								<Sidebar.GroupContent>
									<Sidebar.Menu>
										{#if savedPrds.data === undefined}
											<Sidebar.MenuItem>
												<Sidebar.MenuButton aria-disabled class="min-w-0">
													<span class="min-w-0 truncate">Loading PRDs...</span>
												</Sidebar.MenuButton>
											</Sidebar.MenuItem>
										{:else if savedPrds.data.length === 0}
											<Sidebar.MenuItem>
												<Sidebar.MenuButton aria-disabled class="min-w-0">
													<span class="min-w-0 truncate">No saved PRDs yet</span>
												</Sidebar.MenuButton>
											</Sidebar.MenuItem>
										{:else}
											{#each savedPrds.data as prd (prd._id)}
												<Sidebar.MenuItem>
													<Sidebar.MenuButton isActive={selectedPrdId === prd._id} class="min-w-0">
														{#snippet child({ props })}
															<a
																href={resolve(
																	`/dashboard/scope?prd=${encodeURIComponent(prd._id)}`
																)}
																{...props}
															>
																<FileTextIcon />
																<span class="min-w-0 truncate">{prd.title}</span>
															</a>
														{/snippet}
													</Sidebar.MenuButton>
												</Sidebar.MenuItem>
											{/each}
										{/if}
									</Sidebar.Menu>
								</Sidebar.GroupContent>
							</Sidebar.Group>
						</Sidebar.Content>
					{:else if isIdeasRoute}
						<Sidebar.Header class="min-w-0 gap-3 overflow-hidden border-b p-4">
							<div class="min-w-0">
								<p class="truncate text-sm font-semibold tracking-tight">Ideas</p>
								<p class="mt-1 truncate text-xs leading-5 text-muted-foreground">
									Shape a direction before you scope the build.
								</p>
							</div>
							<Sidebar.Menu>
								<Sidebar.MenuItem>
									<Sidebar.MenuButton isActive={!selectedIdeaId} class="min-w-0">
										{#snippet child({ props })}
											<a href={resolve('/dashboard/ideas')} {...props}>
												<PlusIcon />
												<span class="min-w-0 truncate">New idea chat</span>
											</a>
										{/snippet}
									</Sidebar.MenuButton>
								</Sidebar.MenuItem>
							</Sidebar.Menu>
						</Sidebar.Header>
						<Sidebar.Content>
							<Sidebar.Group>
								<Sidebar.GroupLabel>Saved Ideas</Sidebar.GroupLabel>
								<Sidebar.GroupContent>
									<Sidebar.Menu>
										{#if savedIdeas.data === undefined}
											<Sidebar.MenuItem>
												<Sidebar.MenuButton aria-disabled class="min-w-0">
													<span class="min-w-0 truncate">Loading ideas...</span>
												</Sidebar.MenuButton>
											</Sidebar.MenuItem>
										{:else if savedIdeas.data.length === 0}
											<Sidebar.MenuItem>
												<Sidebar.MenuButton aria-disabled class="min-w-0">
													<span class="min-w-0 truncate">No saved ideas yet</span>
												</Sidebar.MenuButton>
											</Sidebar.MenuItem>
										{:else}
											{#each savedIdeas.data as idea (idea._id)}
												<Sidebar.MenuItem>
													<Sidebar.MenuButton
														isActive={selectedIdeaId === idea._id}
														class="min-w-0"
													>
														{#snippet child({ props })}
															<a
																href={resolve(
																	`/dashboard/ideas?idea=${encodeURIComponent(idea._id)}`
																)}
																{...props}
															>
																<LightbulbIcon />
																<span class="min-w-0 truncate">{idea.title}</span>
															</a>
														{/snippet}
													</Sidebar.MenuButton>
												</Sidebar.MenuItem>
											{/each}
										{/if}
									</Sidebar.Menu>
								</Sidebar.GroupContent>
							</Sidebar.Group>
						</Sidebar.Content>
					{/if}
				</Sidebar.Root>
			{/if}
		</Sidebar.Root>

		<Sidebar.Inset class="min-h-0 min-w-0 overflow-hidden">
			<header
				class="flex h-12 shrink-0 items-center gap-2 border-b border-border/50 bg-background px-4"
			>
				{#if !isSettingsRoute}
					<Sidebar.Trigger class="-ms-1" />
					<Kbd.Group class="hidden text-muted-foreground sm:inline-flex">
						<Kbd.Root>⌘/Ctrl</Kbd.Root>
						<Kbd.Root>B</Kbd.Root>
					</Kbd.Group>
					<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
				{/if}
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-semibold tracking-tight">
						{activeTool?.label ?? 'Dashboard'}
					</p>
					<p class="truncate text-[11px] text-muted-foreground">
						{activeStatus}
					</p>
				</div>
				{#if activeTool && !isSettingsRoute}
					<Button href={resolve(activeTool.href)} variant="ghost" size="sm"
						>Open {activeTool.label}</Button
					>
				{/if}
			</header>

			<main class="min-h-0 flex-1 overflow-hidden bg-background text-foreground">
				{@render children()}
			</main>
		</Sidebar.Inset>
	</Sidebar.Provider>
{/if}
