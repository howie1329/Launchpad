<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { auth, signOut } from '$lib/auth.svelte';
	import { LaunchpadMark } from '$lib/components/brand';
	import IdeasWorkspace from '$lib/components/workspaces/IdeasWorkspace.svelte';
	import ScopeWorkspace from '$lib/components/workspaces/ScopeWorkspace.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Kbd from '$lib/components/ui/kbd';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { Separator } from '$lib/components/ui/separator';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import LightbulbIcon from '@lucide/svelte/icons/lightbulb';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import SettingsWorkspace from '$lib/components/workspaces/SettingsWorkspace.svelte';

	const tools = [
		{
			id: 'scope',
			label: 'MVP Creator',
			href: '/scope',
			icon: FileTextIcon,
			emptyTitle: 'No MVP scopes yet',
			emptyDescription: 'Generated scopes will appear here when saved items are added.'
		},
		{
			id: 'ideas',
			label: 'Ideas',
			href: '/ideas',
			icon: LightbulbIcon,
			emptyTitle: 'No ideas yet',
			emptyDescription: 'Saved idea directions will appear here when attached items are added.'
		},
		{
			id: 'settings',
			label: 'Settings',
			href: '/settings',
			icon: SettingsIcon,
			emptyTitle: 'No settings sections yet',
			emptyDescription: 'Settings sections will appear here as account controls are added.'
		}
	] as const;

	type Tool = (typeof tools)[number];

	let activeTool = $state<Tool | null>(null);
	let sidebarOpen = $state(true);
	let isSigningOut = $state(false);

	const selectTool = (tool: Tool) => {
		activeTool = tool;
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
	<Sidebar.Provider bind:open={sidebarOpen} style="--sidebar-width: 20rem;">
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
											class="px-2.5 md:px-2"
											onclick={() => selectTool(tool)}
										>
											{#snippet tooltipContent()}
												<span>{tool.label}</span>
												<Kbd.Root
													>{tool.id === 'scope' ? '1' : tool.id === 'ideas' ? '2' : '3'}</Kbd.Root
												>
											{/snippet}
											<tool.icon />
											<span>{tool.label}</span>
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
								class="px-2.5 md:px-2"
							>
								<LogOutIcon />
								<span>{isSigningOut ? 'Signing out' : 'Sign out'}</span>
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					</Sidebar.Menu>
				</Sidebar.Footer>
			</Sidebar.Root>

			<Sidebar.Root collapsible="none" class="hidden flex-1 md:flex">
				<Sidebar.Header class="gap-3 border-b border-sidebar-border p-4">
					<div>
						<p class="text-base font-medium tracking-tight">
							{activeTool?.label ?? 'Workspace'}
						</p>
						<p class="mt-1 text-[11px] leading-4 text-muted-foreground">
							{activeTool ? 'Attached items will collect here.' : 'Choose a tool to start.'}
						</p>
					</div>
					<Sidebar.Input
						placeholder={activeTool ? `Search ${activeTool.label.toLowerCase()}` : 'Search items'}
						disabled
					/>
					<div class="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
						<span>Search when items exist</span>
						<Kbd.Root>/</Kbd.Root>
					</div>
				</Sidebar.Header>

				<Sidebar.Content>
					<Sidebar.Group>
						<Sidebar.GroupLabel>Attached items</Sidebar.GroupLabel>
						<Sidebar.GroupContent>
							<div class="px-2 py-8 text-center">
								<p class="text-xs font-medium tracking-tight">
									{activeTool?.emptyTitle ?? 'No tool selected'}
								</p>
								<p class="mx-auto mt-2 max-w-52 text-[11px] leading-5 text-muted-foreground">
									{activeTool?.emptyDescription ?? 'Pick MVP Creator or Ideas to open a workspace.'}
								</p>
							</div>
						</Sidebar.GroupContent>
					</Sidebar.Group>
				</Sidebar.Content>
			</Sidebar.Root>
		</Sidebar.Root>

		<Sidebar.Inset class="min-w-0">
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
					<ScopeWorkspace startMode="compact" />
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
