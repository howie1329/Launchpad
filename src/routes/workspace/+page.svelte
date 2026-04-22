<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { auth, getConvexClient } from '$lib/auth.svelte';
	import { getSafePostAuthRedirect } from '$lib/safeRedirect';
	import { createThreadMutation } from '$lib/chat';
	import { prefersReducedMotion } from '$lib/prefers-reduced-motion.svelte';
	import { workspaceSearchParamsSchema } from '$lib/workspace-search-params';
	import WorkspaceChatLanding from '$lib/components/workspaces/WorkspaceChatLanding.svelte';
	import WorkspaceThread from '$lib/components/workspaces/WorkspaceThread.svelte';
	import type { Id } from '../../convex/_generated/dataModel';
	import { Package01Icon, Target01Icon, TaskDaily01Icon } from '@hugeicons/core-free-icons';
	import { useSearchParams } from 'runed/kit';
	import { backOut } from 'svelte/easing';
	import { fade, fly } from 'svelte/transition';

	const routeParams = useSearchParams(workspaceSearchParamsSchema);
	const activeProjectId = $derived(routeParams.project.trim());
	const activeThreadId = $derived(routeParams.thread.trim());

	const suggestions = [
		{
			label: 'Shape project',
			prompt:
				'Help me turn this rough idea into a project. Ask only the next best questions until the first version is clear.'
		},
		{
			label: 'Find the risk',
			prompt: 'Help me find the riskiest assumption and the fastest way to test it.'
		},
		{
			label: 'Make PRD',
			prompt:
				'Turn this into a focused first-version PRD, then tell me when it is ready to promote into a project.'
		},
		{
			label: 'Scope MVP',
			prompt: 'Reduce this to the smallest useful MVP scope for a project I could start building.'
		}
	] as const;

	const examples = [
		{
			title: 'Start from a thought',
			description: 'Find the project hiding inside a messy note',
			prompt:
				'I keep noticing a messy workflow that might be worth building around. Help me turn the rough thought into a clear project with a target user and first version.',
			icon: Package01Icon
		},
		{
			title: 'Validate the pain',
			description: 'Decide if the project is worth promoting',
			prompt:
				'I have a possible project, but I am not sure if the pain is real. Help me find the riskiest assumption and the fastest validation path.',
			icon: Target01Icon
		},
		{
			title: 'Draft a project PRD',
			description: 'Leave with scope you can build from',
			prompt:
				'This project feels promising. Help me shape it into a practical first-version PRD with clear must-haves and non-goals.',
			icon: TaskDaily01Icon
		}
	] as const;

	const startThread = async ({ text, modelId }: { text: string; modelId: string }) => {
		if (!auth.isAuthenticated) {
			const next = getSafePostAuthRedirect($page.url.pathname + $page.url.search + $page.url.hash);
			await goto(resolve(`/auth?redirectTo=${encodeURIComponent(next)}`));
			return;
		}

		const result = await getConvexClient().mutation(createThreadMutation, {
			text,
			modelId,
			...(activeProjectId ? { projectId: activeProjectId as Id<'projects'> } : {})
		});
		const projectQuery = activeProjectId ? `project=${encodeURIComponent(activeProjectId)}&` : '';

		await goto(
			resolve(
				`/workspace?${projectQuery}thread=${encodeURIComponent(result.threadId)}&start=1` as `/workspace?${string}`
			)
		);
	};

	const pageFlyIn = $derived({
		y: 8,
		duration: prefersReducedMotion.current ? 0 : 220,
		easing: backOut
	});
	const pageFadeOut = $derived({
		duration: prefersReducedMotion.current ? 0 : 130
	});
</script>

<svelte:head>
	<title>Workspace | Launchpad</title>
	<meta name="description" content="Launchpad workspace." />
</svelte:head>

{#if activeThreadId}
	<div class="h-full min-h-0 flex flex-1 flex-col" in:fly={pageFlyIn} out:fade={pageFadeOut}>
		<WorkspaceThread />
	</div>
{:else}
	<div class="h-full min-h-0 flex flex-1 flex-col" in:fly={pageFlyIn} out:fade={pageFadeOut}>
		<WorkspaceChatLanding
			title="Turn a rough idea into a project."
			description="Start with the messy version. Leave with a named project, useful context, and a tighter first build."
			placeholder="Paste a thought, rant, customer quote, project idea, or half-formed problem..."
			{suggestions}
			{examples}
			onSubmit={startThread}
		/>
	</div>
{/if}
