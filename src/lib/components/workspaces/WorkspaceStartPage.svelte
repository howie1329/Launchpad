<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { auth, getConvexClient } from '$lib/auth.svelte';
	import { createThreadMutation } from '$lib/chat';
	import WorkspaceChatLanding from '$lib/components/workspaces/WorkspaceChatLanding.svelte';
	import { prefersReducedMotion } from '$lib/prefers-reduced-motion.svelte';
	import { getSafePostAuthRedirect } from '$lib/safeRedirect';
	import { markThreadForAutoStart } from '$lib/workspace-thread-start';
	import { workspaceThreadHref } from '$lib/workspace-route-contract';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { Package01Icon, Target01Icon, TaskDaily01Icon } from '@hugeicons/core-free-icons';
	import { backOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';

	let {
		projectId = '',
		projectName = ''
	}: {
		projectId?: string;
		projectName?: string;
	} = $props();

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
			...(projectId ? { projectId: projectId as Id<'projects'> } : {})
		});

		markThreadForAutoStart(result.threadId);
		await goto(resolve(workspaceThreadHref(result.threadId) as `/workspace/thread/${string}`));
	};

	const pageFlyIn = $derived({
		y: 8,
		duration: prefersReducedMotion.current ? 0 : 220,
		easing: backOut
	});

	const landingTitle = $derived(
		projectName.trim()
			? `Start a chat in ${projectName.trim()}.`
			: 'Turn a rough idea into a project.'
	);
	const landingDescription = $derived(
		projectName.trim()
			? 'Start with your current context, then shape the next decision with focused prompts and saved artifacts.'
			: 'Start with the messy version. Leave with a named project, useful context, and a tighter first build.'
	);
</script>

<div class="flex h-full min-h-0 flex-1 flex-col" in:fly={pageFlyIn}>
	<WorkspaceChatLanding
		title={landingTitle}
		description={landingDescription}
		placeholder="Paste a thought, rant, customer quote, project idea, or half-formed problem..."
		{suggestions}
		{examples}
		onSubmit={startThread}
	/>
</div>
