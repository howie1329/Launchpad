<script lang="ts">
	import { page } from '$app/stores';
	import ScopeWorkspace from '$lib/components/workspaces/ScopeWorkspace.svelte';

	const selectedPrdId = $derived($page.url.searchParams.get('prd'));
</script>

<svelte:head>
	<title>Scope | Dashboard | Launchpad</title>
	<meta name="description" content="Scope your MVP from the Launchpad dashboard." />
</svelte:head>

<ScopeWorkspace startMode="compact" {selectedPrdId} />
