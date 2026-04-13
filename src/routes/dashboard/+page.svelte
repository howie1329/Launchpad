<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { auth, signOut } from '$lib/auth.svelte';
	import { LaunchpadMark } from '$lib/components/brand';
	import IdeasWorkspace from '$lib/components/workspaces/IdeasWorkspace.svelte';
	import ScopeWorkspace from '$lib/components/workspaces/ScopeWorkspace.svelte';
	import { Button } from '$lib/components/ui/button';
	import { listPrdsQuery } from '$lib/prds';
	import * as Kbd from '$lib/components/ui/kbd';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { Separator } from '$lib/components/ui/separator';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import LightbulbIcon from '@lucide/svelte/icons/lightbulb';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import SettingsWorkspace from '$lib/components/workspaces/SettingsWorkspace.svelte';
	import { useQuery } from 'convex-svelte';

	const tools = [
		{
			id: 'scope',
			label: 'MVP Creator',
			href: '/scope',
			icon: FileTextIcon,
			emptyTitle: 'No saved PRDs',
			emptyDescription: 'Create a new PRD, then save it to keep it here.'
		},
		{
			id: 'ideas',
			label: 'Ideas',
			href: '/ideas',
			icon: LightbulbIcon,
			emptyTitle: 'Idea generator',
			emptyDescription: 'This workspace is still being shaped. No saved idea list yet.'
		},
		{
			id: 'settings',
			label: 'Settings',
			href: '/settings',
			icon: SettingsIcon,
			emptyTitle: 'Workspace settings',
			emptyDescription: 'Account and workspace controls live in the main panel.'
		}
	] as const;

	type Tool = (typeof tools)[number];

	let activeTool = $state<Tool | null>(null);
	let sidebarOpen = $state(true);
	let isSigningOut = $state(false);
	let selectedPrdId = $state<string | null>(null);
	let scopeWorkspaceKey = $state(0);

	const savedPrds = useQuery(listPrdsQuery, () => (auth.isAuthenticated ? {} : 'skip'));

	const activeToolStatus = $derived(
		activeTool?.id === 'scope'
			? 'Create a PRD or reopen a saved scope.'
			: activeTool?.id === 'ideas'
				? 'Explore product directions before scoping.'
				: activeTool?.id === 'settings'
					? 'Manage workspace preferences.'
					: 'Choose a tool to start.'
	);

	const selectTool = (tool: Tool) => {
		activeTool = tool;
		sidebarOpen = true;
	};

	const selectPrd = (prdId: string) => {
		selectedPrdId = prdId;
		activeTool = tools[0];
		sidebarOpen = true;
	};

	const startNewPrd = () => {
		activeTool = tools[0];
		selectedPrdId = null;
		scopeWorkspaceKey += 1;
		sidebarOpen = true;
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
			void goto(resolve('/auth?redirectTo=/dashboard'));
		}
	});
</script>

<svelte:head>
	<title>Dashboard | Launchpad</title>
	<meta name="description" content="Launchpad dashboard." />
</svelte:head>

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
											onclick={() => selectTool(tool)}
										>
											{#snippet tooltipContent()}
												<span>{tool.label}</span>
												<Kbd.Root
													>{tool.id === 'scope' ? '1' : tool.id === 'ideas' ? '2' : '3'}</Kbd.Root
												>
											{/snippet}
											<tool.icon />
											<span class="sr-only">{tool.label}</span>
										</Sidebar.MenuButton>
									</Sidebar.MenuItem>
								{/each}
							</Sidebar.Menu>
						</Sidebar.GroupContent>
					</Sidebar.Group>
				</Sidebar.Content>

				<Sidebar.Footer>
					<Sidebar.Menu>
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

			<Sidebar.Root collapsible="none" class="hidden min-w-0 flex-1 md:flex">
				<Sidebar.Header class="gap-3 border-b border-sidebar-border p-3">
					<div>
						<p class="text-sm font-medium tracking-tight">
							{activeTool?.label ?? 'Workspace'}
						</p>
						<p class="mt-1 text-[11px] leading-4 text-muted-foreground">
							{activeToolStatus}
						</p>
					</div>
					{#if activeTool?.id === 'scope'}
						<Button size="sm" class="w-full justify-start" onclick={startNewPrd}>
							<PlusIcon />
							New PRD
						</Button>
					{/if}
				</Sidebar.Header>

				<Sidebar.Content>
					<Sidebar.Group>
						<Sidebar.GroupLabel>
							{activeTool?.id === 'scope' ? 'Saved PRDs' : 'Context'}
						</Sidebar.GroupLabel>
						<Sidebar.GroupContent class="min-w-0">
							{#if activeTool?.id === 'scope' && savedPrds.data?.length}
								<Sidebar.Menu class="min-w-0">
									{#each savedPrds.data as prd (prd._id)}
										<Sidebar.MenuItem class="min-w-0">
											<Sidebar.MenuButton
												isActive={selectedPrdId === prd._id}
												onclick={() => selectPrd(prd._id)}
												class="h-7 max-w-full min-w-0 rounded-full px-2.5"
											>
												<FileTextIcon class="size-3 shrink-0" />
												<span class="min-w-0 flex-1 truncate">{prd.title}</span>
												<span class="ml-auto shrink-0 text-[10px] text-muted-foreground">
													v{prd.latestVersion}
												</span>
											</Sidebar.MenuButton>
										</Sidebar.MenuItem>
									{/each}
								</Sidebar.Menu>
							{:else}
								<div class="px-2 py-8 text-center">
									<p class="text-xs font-medium tracking-tight">
										{activeTool?.emptyTitle ?? 'No tool selected'}
									</p>
									<p class="mx-auto mt-2 max-w-52 text-[11px] leading-5 text-muted-foreground">
										{activeTool?.emptyDescription ?? 'Pick a workspace from the rail.'}
									</p>
									{#if activeTool?.id === 'scope'}
										<Button size="sm" variant="ghost" class="mt-4" onclick={startNewPrd}>
											New PRD
										</Button>
									{/if}
								</div>
							{/if}
						</Sidebar.GroupContent>
					</Sidebar.Group>
				</Sidebar.Content>
			</Sidebar.Root>
		</Sidebar.Root>

		<Sidebar.Inset class="min-h-0 min-w-0 overflow-hidden">
			<header
				class="flex h-12 shrink-0 items-center gap-2 border-b border-border/50 bg-background px-4"
			>
				<Sidebar.Trigger class="-ms-1" />
				<Kbd.Group class="hidden text-muted-foreground sm:inline-flex">
					<Kbd.Root>⌘/Ctrl</Kbd.Root>
					<Kbd.Root>B</Kbd.Root>
				</Kbd.Group>
				<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-semibold tracking-tight">
						{activeTool?.label ?? 'Dashboard'}
					</p>
					<p class="truncate text-[11px] text-muted-foreground">
						{activeTool
							? 'Work inside Launchpad without leaving the dashboard.'
							: 'Choose a tool from the sidebar.'}
					</p>
				</div>
				{#if activeTool && activeTool.id !== 'settings'}
					<Button href={resolve(activeTool.href)} variant="ghost" size="sm">
						Open {activeTool.label}
					</Button>
				{/if}
			</header>

			<main class="min-h-0 flex-1 overflow-hidden bg-background text-foreground">
				{#if activeTool?.id === 'scope'}
					{#key scopeWorkspaceKey}
						<ScopeWorkspace startMode="compact" {selectedPrdId} />
					{/key}
				{:else if activeTool?.id === 'ideas'}
					<IdeasWorkspace showActions={false} />
				{:else if activeTool?.id === 'settings'}
					<SettingsWorkspace />
				{:else}
					<div class="flex h-full min-h-72 items-center justify-center px-5">
						<div class="max-w-sm text-center">
							<p class="text-sm font-semibold tracking-tight">Begin your workspace.</p>
							<p class="mt-2 text-xs leading-5 text-muted-foreground">
								Select MVP Creator or Ideas to open the working surface.
							</p>
						</div>
					</div>
				{/if}
			</main>
		</Sidebar.Inset>
	</Sidebar.Provider>
{/if}
