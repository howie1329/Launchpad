<script lang="ts">
	import { resolve } from '$app/paths';
	import { LaunchpadLogo } from '$lib/components/brand';
	import ThemeMenu from '$lib/components/ThemeMenu.svelte';
	import { Button } from '$lib/components/ui/button';

	let { showLinks = true }: { showLinks?: boolean } = $props();
</script>

<header class="flex h-14 shrink-0 items-center border-b border-border/50 px-5 sm:px-8">
	<div class="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
		<a href={resolve('/')} aria-label="Launchpad home" class="shrink-0">
			<LaunchpadLogo />
		</a>

		<div class="flex min-w-0 items-center gap-1.5">
			{#if showLinks}
				<nav class="hidden items-center gap-4 text-xs text-muted-foreground sm:flex">
					<a class="transition-colors hover:text-foreground" href={resolve('/support')}>Support</a>
					<a class="transition-colors hover:text-foreground" href={resolve('/privacy')}>Privacy</a>
					<a class="transition-colors hover:text-foreground" href={resolve('/terms')}>Terms</a>
				</nav>
			{/if}
			<ThemeMenu variant="icon" />
			<Button href={resolve('/workspace')} size="sm">Open workspace</Button>
		</div>
	</div>
</header>
