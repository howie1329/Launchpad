<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { auth, signOut } from '$lib/auth.svelte';
	import { LaunchpadMark } from '$lib/components/brand';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import ThemeMenu from '$lib/components/ThemeMenu.svelte';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import LightbulbIcon from '@lucide/svelte/icons/lightbulb';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import MessageSquarePlusIcon from '@lucide/svelte/icons/message-square-plus';
	import SettingsIcon from '@lucide/svelte/icons/settings';

	let { children } = $props();

	const tools = [
		{
			id: 'new-chat',
			label: 'New Chat',
			href: '/workspace',
			icon: MessageSquarePlusIcon,
			status: 'Start from a rough thought.'
		},
		{
			id: 'inbox',
			label: 'Inbox',
			href: '/workspace?view=inbox',
			icon: InboxIcon,
			status: 'Capture loose thoughts before they become projects.'
		},
		{
			id: 'projects',
			label: 'Projects',
			href: '/workspace?view=projects',
			icon: FolderIcon,
			status: 'Continue scoped project work.'
		},
		{
			id: 'loose-ideas',
			label: 'Loose Ideas',
			href: '/workspace?view=ideas',
			icon: LightbulbIcon,
			status: 'Explore ideas before promoting them.'
		},
		{
			id: 'recent',
			label: 'Recent',
			href: '/workspace?view=recent',
			icon: ClockIcon,
			status: 'Resume recent work.'
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
	const workspaceView = $derived($page.url.searchParams.get('view') || '');
	const activeTool = $derived(
		workspaceView === 'inbox'
			? tools[1]
			: workspaceView === 'projects'
				? tools[2]
				: workspaceView === 'ideas'
					? tools[3]
					: workspaceView === 'recent'
						? tools[4]
						: tools[0]
	);

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
	<Sidebar.Provider bind:open={sidebarOpen} class="h-svh overflow-hidden">
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
				</Sidebar.Menu>
			</Sidebar.Header>

			<Sidebar.Content>
				<Sidebar.Group>
					<Sidebar.GroupContent>
						<Sidebar.Menu>
							{#each tools as tool (tool.id)}
								<Sidebar.MenuItem>
									<Sidebar.MenuButton isActive={activeTool.id === tool.id} class="min-w-0">
										{#snippet child({ props })}
											<a href={resolve(tool.href)} aria-label={tool.label} {...props}>
												<tool.icon />
												<span class="min-w-0 truncate">{tool.label}</span>
											</a>
										{/snippet}
										{#snippet tooltipContent()}
											<span>{tool.label}</span>
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
					<p class="truncate text-sm font-semibold tracking-tight">{activeTool.label}</p>
					<p class="truncate text-[11px] text-muted-foreground">{activeTool.status}</p>
				</div>
			</header>

			<main class="min-h-0 flex-1 overflow-hidden bg-background text-foreground">
				{@render children()}
			</main>
		</Sidebar.Inset>
	</Sidebar.Provider>
{/if}
