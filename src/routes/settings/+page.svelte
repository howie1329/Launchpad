<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { auth } from '$lib/auth.svelte';
	import SettingsWorkspace from '$lib/components/workspaces/SettingsWorkspace.svelte';

	$effect(() => {
		if (!auth.isLoading && !auth.isAuthenticated) {
			void goto(resolve('/auth?redirectTo=/settings'));
		}
	});
</script>

<svelte:head>
	<title>Settings | Launchpad</title>
	<meta name="description" content="Manage Launchpad settings." />
</svelte:head>

{#if auth.isLoading || !auth.isAuthenticated}
	<main class="flex min-h-svh items-center justify-center bg-background px-5 text-foreground">
		<div class="text-center">
			<p class="text-sm font-semibold tracking-tight">Checking settings access.</p>
			<p class="mt-2 text-xs leading-5 text-muted-foreground">You will be redirected if needed.</p>
		</div>
	</main>
{:else}
	<main class="min-h-svh bg-background text-foreground">
		<SettingsWorkspace />
	</main>
{/if}
