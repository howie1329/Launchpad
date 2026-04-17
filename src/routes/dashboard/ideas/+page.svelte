<script lang="ts">
	import { dashboardIdeasSearchParamsSchema } from '$lib/dashboard-search-params';
	import IdeasWorkspace from '$lib/components/workspaces/IdeasWorkspace.svelte';
	import { useSearchParams } from 'runed/kit';

	const routeParams = useSearchParams(dashboardIdeasSearchParamsSchema);
	const selectedIdeaId = $derived(routeParams.idea || null);
	const startInitialResponse = $derived(routeParams.start === '1');
</script>

<svelte:head>
	<title>Ideas | Dashboard | Launchpad</title>
	<meta name="description" content="Explore product ideas from the Launchpad dashboard." />
</svelte:head>

<IdeasWorkspace showActions={false} {selectedIdeaId} {startInitialResponse} />
