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
	const isLoading = $derived(project.data === undefined && !project.error);
	const isMissing = $derived(project.data === null || Boolean(project.error));
</script>

<svelte:head>
	<title
		>{project.data?.name ? `${project.data.name} | Workspace` : 'Project | Workspace'} | Launchpad</title
	>
	<meta name="description" content="Project workspace context." />
</svelte:head>

{#if isLoading}
	<div class="flex h-full min-h-0 flex-1 items-center justify-center px-4 py-8 text-center">
		<div>
			<p class="text-sm font-semibold tracking-tight">Loading project</p>
			<p class="mt-2 text-xs leading-5 text-muted-foreground">Checking project access…</p>
		</div>
	</div>
{:else if isMissing}
	<div class="flex h-full min-h-0 flex-1 items-center justify-center px-4 py-8 text-center">
		<div class="max-w-sm">
			<p class="text-sm font-semibold tracking-tight">Project not available</p>
			<p class="mt-2 text-xs leading-5 text-muted-foreground">
				This project does not exist or you no longer have access to it.
			</p>
		</div>
	</div>
{:else}
	<WorkspaceStartPage projectId={activeProjectId} projectName={project.data?.name ?? ''} />
{/if}
