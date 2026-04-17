<script lang="ts">
	import { resolve } from '$app/paths';
	import AuthControls from '$lib/components/AuthControls.svelte';
	import ThemeMenu from '$lib/components/ThemeMenu.svelte';
	import { LaunchpadLogo } from '$lib/components/brand';
	import ScopeWorkspace from '$lib/components/workspaces/ScopeWorkspace.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
</script>

<svelte:head>
	<title>Start Scoping | Launchpad</title>
	<meta name="description" content="Start scoping your MVP with Launchpad." />
</svelte:head>

<main class="flex h-svh flex-col overflow-hidden bg-background text-foreground">
	<header
		class="flex h-12 shrink-0 items-center justify-between border-b border-border/50 px-4 sm:px-5"
	>
		<a href={resolve('/')} aria-label="Launchpad home">
			<LaunchpadLogo />
		</a>
		<div class="flex items-center gap-2">
			<Badge variant="secondary">MVP scope</Badge>
			<Button href={resolve('/')} variant="ghost" size="sm">Home</Button>
			<ThemeMenu variant="icon" />
			<AuthControls />
		</div>
	</header>

	<div class="min-h-0 flex-1">
		<ScopeWorkspace />
	</div>
</main>
