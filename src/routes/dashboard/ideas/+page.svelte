<script lang="ts">
	import { page } from '$app/stores';
	import IdeasWorkspace from '$lib/components/workspaces/IdeasWorkspace.svelte';

	const selectedIdeaId = $derived($page.url.searchParams.get('idea'));
	const startInitialResponse = $derived($page.url.searchParams.get('start') === '1');
</script>

<svelte:head>
	<title>Ideas | Dashboard | Launchpad</title>
	<meta name="description" content="Explore product ideas from the Launchpad dashboard." />
</svelte:head>

<IdeasWorkspace showActions={false} {selectedIdeaId} {startInitialResponse} />
