<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { auth, signOut } from '$lib/auth.svelte';
	import { LaunchpadMark } from '$lib/components/brand';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import ThemeMenu from '$lib/components/ThemeMenu.svelte';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import MessageSquarePlusIcon from '@lucide/svelte/icons/message-square-plus';
	import SettingsIcon from '@lucide/svelte/icons/settings';

	let { children } = $props();

	const sections = [
		{ label: 'Projects', empty: 'No projects yet' },
		{ label: 'Ideas', empty: 'No ideas yet' },
		{ label: 'PRDs', empty: 'No PRDs yet' },
		{ label: 'Other', empty: 'Nothing here yet' }
	] as const;

	let sidebarOpen = $state(true);
	let isSigningOut = $state(false);

	const pathname = $derived($page.url.pathname);
	const isNewChatActive = $derived(pathname === '/workspace' && !$page.url.search);

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
			const nextPath = pathname.startsWith('/workspace') ? pathname : '/workspace';
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
			<Sidebar.Header>
				<Sidebar.Menu>
					<Sidebar.MenuItem>
						<Sidebar.MenuButton size="lg" class="md:h-8 md:p-0">
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
				{#each sections as section (section.label)}
					<Sidebar.Group>
						<Sidebar.GroupLabel>{section.label}</Sidebar.GroupLabel>
						<Sidebar.GroupContent class="group-data-[collapsible=icon]:hidden">
							<Sidebar.Menu>
								<Sidebar.MenuItem>
									<Sidebar.MenuButton aria-disabled class="min-w-0 text-muted-foreground">
										<span class="min-w-0 truncate">{section.empty}</span>
									</Sidebar.MenuButton>
								</Sidebar.MenuItem>
							</Sidebar.Menu>
						</Sidebar.GroupContent>
					</Sidebar.Group>
				{/each}
			</Sidebar.Content>

			<Sidebar.Footer>
				<Sidebar.Menu>
					<Sidebar.MenuItem>
						<Sidebar.MenuButton tooltipContent="Settings" class="min-w-0">
							{#snippet child({ props })}
								<a href={resolve('/dashboard/settings')} aria-label="Settings" {...props}>
									<SettingsIcon />
									<span class="min-w-0 truncate">Settings</span>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
					<ThemeMenu variant="sidebar" />
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
					<p class="truncate text-sm font-semibold tracking-tight">New Chat</p>
					<p class="truncate text-[11px] text-muted-foreground">Start from a rough thought.</p>
				</div>
			</header>

			<main class="min-h-0 flex-1 overflow-hidden bg-background text-foreground">
				{@render children()}
			</main>
		</Sidebar.Inset>
	</Sidebar.Provider>
{/if}
