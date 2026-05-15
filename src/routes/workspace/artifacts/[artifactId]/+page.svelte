<script lang="ts">
	import { auth } from '$lib/auth.svelte';
	import { getArtifactQuery } from '$lib/artifacts';
	import WorkspaceArtifactReader from '$lib/components/workspaces/WorkspaceArtifactReader.svelte';
	import type { Id } from '../../../../convex/_generated/dataModel';
	import { page } from '$app/stores';
	import { useQuery } from 'convex-svelte';

	const activeArtifactId = $derived($page.params.artifactId?.trim() ?? '');
	const initialSelectedVersionNumber = $derived.by(() => {
		const raw = $page.url.searchParams.get('version')?.trim() ?? '';
		if (!raw) return null;
		const parsed = Number(raw);
		return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
	});
	const selectedArtifact = useQuery(getArtifactQuery, () =>
		auth.isAuthenticated && activeArtifactId
			? { artifactId: activeArtifactId as Id<'artifacts'> }
			: 'skip'
	);
	const isLoading = $derived(selectedArtifact.data === undefined && !selectedArtifact.error);
	const isMissing = $derived(selectedArtifact.data === null || Boolean(selectedArtifact.error));
</script>

<svelte:head>
	<title>Artifact | Launchpad</title>
	<meta name="description" content="Saved workspace artifact." />
</svelte:head>

{#if isLoading}
	<div class="flex h-full min-h-0 flex-1 items-center justify-center px-4 py-8 text-center">
		<div>
			<p class="text-sm font-semibold tracking-tight">Loading artifact</p>
			<p class="mt-2 text-xs leading-5 text-muted-foreground">Checking artifact access…</p>
		</div>
	</div>
{:else if isMissing}
	<div class="flex h-full min-h-0 flex-1 items-center justify-center px-4 py-8 text-center">
		<div class="max-w-sm">
			<p class="text-sm font-semibold tracking-tight">Artifact not available</p>
			<p class="mt-2 text-xs leading-5 text-muted-foreground">
				This artifact does not exist or you no longer have access to it.
			</p>
		</div>
	</div>
{:else}
	<WorkspaceArtifactReader
		artifact={selectedArtifact.data}
		fullWidthContent
		{initialSelectedVersionNumber}
	/>
{/if}
