<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { setupAuth } from '$lib/auth.svelte';
	import { ModeWatcher } from 'mode-watcher';

	let { children } = $props();

	setupAuth();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<ModeWatcher defaultMode="system" themeColors={{ light: '#ffffff', dark: '#141414' }} />
{@render children()}
