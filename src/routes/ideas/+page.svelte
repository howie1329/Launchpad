<script lang="ts">
	import { resolve } from '$app/paths';
	import AuthControls from '$lib/components/AuthControls.svelte';
	import { LaunchpadLogo } from '$lib/components/brand';
	import IdeasWorkspace from '$lib/components/workspaces/IdeasWorkspace.svelte';
	import { Button } from '$lib/components/ui/button';
</script>

<svelte:head>
	<title>Idea Generator | Launchpad</title>
	<meta
		name="description"
		content="Launchpad idea generation is coming soon for developers who want sharper product directions before scoping an MVP."
	/>
</svelte:head>

<main class="flex min-h-svh flex-col bg-background text-foreground">
	<header
		class="flex h-12 shrink-0 items-center justify-between border-b border-border/50 px-4 sm:px-5"
	>
		<a href={resolve('/')} aria-label="Launchpad home">
			<LaunchpadLogo />
		</a>
		<nav class="flex items-center gap-1" aria-label="Idea generator navigation">
			<Button href={resolve('/')} variant="ghost" size="sm">Home</Button>
			<AuthControls />
			<Button href={resolve('/scope')} size="sm">Start Scoping</Button>
		</nav>
	</header>

	<div class="flex-1">
		<IdeasWorkspace />
	</div>
</main>
