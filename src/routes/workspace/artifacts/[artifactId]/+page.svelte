<script lang="ts">
	import { auth } from '$lib/auth.svelte'
	import { getArtifactQuery } from '$lib/artifacts'
	import WorkspaceArtifactReader from '$lib/components/workspaces/WorkspaceArtifactReader.svelte'
	import type { Id } from '../../../../convex/_generated/dataModel'
	import { page } from '$app/stores'
	import { useQuery } from 'convex-svelte'

	const activeArtifactId = $derived($page.params.artifactId?.trim() ?? '')
	const selectedArtifact = useQuery(getArtifactQuery, () =>
		auth.isAuthenticated && activeArtifactId
			? { artifactId: activeArtifactId as Id<'artifacts'> }
			: 'skip'
	)
</script>

<svelte:head>
	<title>Artifact | Launchpad</title>
	<meta name="description" content="Saved workspace artifact." />
</svelte:head>

<WorkspaceArtifactReader artifact={selectedArtifact.data} fullWidthContent />
