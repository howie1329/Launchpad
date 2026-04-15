<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { auth, signOut } from '$lib/auth.svelte';
	import { LaunchpadMark } from '$lib/components/brand';
	import { Button } from '$lib/components/ui/button';
	import * as Kbd from '$lib/components/ui/kbd';
	import { Separator } from '$lib/components/ui/separator';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import LightbulbIcon from '@lucide/svelte/icons/lightbulb';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import SettingsIcon from '@lucide/svelte/icons/settings';

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

	const pathname = $derived($page.url.pathname);
	const activeTool = $derived(tools.find((tool) => pathname === resolve(tool.href)) ?? null);
	const activeStatus = $derived(activeTool?.status ?? 'Choose a tool from the sidebar.');

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
		<Sidebar.Root collapsible="icon" class="overflow-hidden border-e">
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
						{activeStatus}
					</p>
				</div>
				{#if activeTool && activeTool.id !== 'settings'}
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
