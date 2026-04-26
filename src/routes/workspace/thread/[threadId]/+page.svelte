<script lang="ts">
	import WorkspaceThread from '$lib/components/workspaces/WorkspaceThread.svelte';
</script>

<svelte:head>
	<title>Thread | Launchpad</title>
	<meta name="description" content="Workspace chat thread." />
</svelte:head>

<div class="h-full min-h-0 flex flex-1 flex-col">
	<WorkspaceThread />
</div>
