<script lang="ts">
	import { auth } from '$lib/auth.svelte';
	import WorkspaceStartPage from '$lib/components/workspaces/WorkspaceStartPage.svelte';
	import { getProjectQuery } from '$lib/projects';
	import { page } from '$app/stores';
	import { useQuery } from 'convex-svelte';
	import type { Id } from '../../../../convex/_generated/dataModel';

	const activeProjectId = $derived($page.params.projectId?.trim() ?? '');
	const project = useQuery(getProjectQuery, () =>
		auth.isAuthenticated && activeProjectId
			? { projectId: activeProjectId as Id<'projects'> }
			: 'skip'
	);
</script>

<svelte:head>
	<title>{project.data?.name ? `${project.data.name} | Workspace` : 'Project | Workspace'} | Launchpad</title>
	<meta name="description" content="Project workspace context." />
</svelte:head>

<WorkspaceStartPage projectId={activeProjectId} projectName={project.data?.name ?? ''} />
