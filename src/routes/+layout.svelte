<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { setupAuth } from '$lib/auth.svelte';

	let { children } = $props();

	setupAuth();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
