<script lang="ts">
	import { dashboardScopeSearchParamsSchema } from '$lib/dashboard-search-params';
	import ScopeWorkspace from '$lib/components/workspaces/ScopeWorkspace.svelte';
	import { useSearchParams } from 'runed/kit';

	const routeParams = useSearchParams(dashboardScopeSearchParamsSchema);
	const selectedPrdId = $derived(routeParams.prd || null);
</script>

<svelte:head>
	<title>Scope | Dashboard | Launchpad</title>
	<meta name="description" content="Scope your MVP from the Launchpad dashboard." />
</svelte:head>

<ScopeWorkspace startMode="compact" {selectedPrdId} />
