<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { auth, getConvexClient } from '$lib/auth.svelte';
	import { createThreadMutation } from '$lib/chat';
	import { workspaceSearchParamsSchema } from '$lib/workspace-search-params';
	import WorkspaceChatLanding from '$lib/components/workspaces/WorkspaceChatLanding.svelte';
	import WorkspaceThreadMock from '$lib/components/workspaces/WorkspaceThreadMock.svelte';
	import type { Id } from '../../convex/_generated/dataModel';
	import BoxIcon from '@lucide/svelte/icons/box';
	import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
	import TargetIcon from '@lucide/svelte/icons/target';
	import { useSearchParams } from 'runed/kit';

	const routeParams = useSearchParams(workspaceSearchParamsSchema);
	const activeProjectId = $derived(routeParams.project.trim());
	const activeThreadId = $derived(routeParams.thread.trim());

	const suggestions = [
		{
			label: 'Ask next question',
			prompt: 'Ask me the next best question to sharpen this project.'
		},
		{
			label: 'Find the risk',
			prompt: 'Help me find the riskiest assumption and the fastest way to test it.'
		},
		{
			label: 'Make PRD',
			prompt: 'Turn this into a focused first-version PRD.'
		},
		{
			label: 'Scope MVP',
			prompt: 'Reduce this to the smallest useful MVP scope.'
		}
	] as const;

	const examples = [
		{
			title: 'Start from a thought',
			description: 'Turn a messy note into a clear problem',
			prompt:
				'I keep noticing a messy workflow that might be worth building around. Help me turn the rough thought into a clear problem and audience.',
			icon: BoxIcon
		},
		{
			title: 'Validate the pain',
			description: 'Find the first assumption to test',
			prompt:
				'I have a possible project, but I am not sure if the pain is real. Help me find the riskiest assumption and the fastest validation path.',
			icon: TargetIcon
		},
		{
			title: 'Draft a PRD',
			description: 'Shape the work into buildable scope',
			prompt:
				'This project feels promising. Help me shape it into a practical first-version PRD with clear must-haves and non-goals.',
			icon: ClipboardListIcon
		}
	] as const;

	const startThread = async ({ text, modelId }: { text: string; modelId: string }) => {
		if (!auth.isAuthenticated) {
			await goto(resolve('/auth?redirectTo=/workspace'));
			return;
		}

		const result = await getConvexClient().mutation(createThreadMutation, {
			text,
			modelId,
			...(activeProjectId ? { projectId: activeProjectId as Id<'projects'> } : {})
		});
		const projectQuery = activeProjectId
			? `project=${encodeURIComponent(activeProjectId)}&`
			: '';

		await goto(
			resolve(`/workspace?${projectQuery}thread=${encodeURIComponent(result.threadId)}` as `/workspace?${string}`)
		);
	};
</script>

<svelte:head>
	<title>Workspace | Launchpad</title>
	<meta name="description" content="Launchpad workspace." />
</svelte:head>

{#if activeThreadId}
	<WorkspaceThreadMock />
{:else}
	<WorkspaceChatLanding
		title="What are we building?"
		description="Start with a rough thought, customer quote, project idea, or problem."
		placeholder="Paste a thought, rant, customer quote, project idea, or half-formed problem..."
		{suggestions}
		{examples}
		onSubmit={startThread}
	/>
{/if}
