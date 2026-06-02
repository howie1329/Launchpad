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
	import {
		AiIdeaIcon,
		BubbleChatQuestionIcon,
		FileEditIcon,
		Target01Icon
	} from '@hugeicons/core-free-icons';
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
			label: 'Shape this idea',
			prompt:
				'Help me shape this rough idea. Ask only the next best question until the first version is clear.'
		},
		{
			label: 'Find the riskiest assumption',
			prompt: 'Help me find the riskiest assumption and the fastest way to test it.'
		},
		{
			label: 'Draft the first artifact',
			prompt:
				'Turn my rough notes into a useful first artifact. Keep it focused and ask before making it durable.'
		},
		{
			label: 'Cut the scope',
			prompt: 'Reduce this to the smallest useful MVP scope for a project I could start building.'
		}
	] as const;

	const examples = [
		{
			title: 'Paste the messy version',
			description: 'Start from a note, rant, quote, or half-formed product thought.',
			prompt:
				'I have a messy product thought and I want to find the useful shape inside it. Help me clarify the user, the pain, and the first useful version.',
			icon: AiIdeaIcon
		},
		{
			title: 'Interrogate the risk',
			description: 'Find the assumption that should be tested before building.',
			prompt:
				'I have a possible project, but I am not sure the pain is real. Help me identify the riskiest assumption and the smallest test.',
			icon: Target01Icon
		},
		{
			title: 'Ask better questions',
			description: 'Use chat to narrow the next decision instead of writing a spec too soon.',
			prompt:
				'I am not ready for a PRD yet. Ask me the few questions that would make this idea easier to judge.',
			icon: BubbleChatQuestionIcon
		},
		{
			title: 'Draft a buildable brief',
			description: 'Turn promising context into scope, non-goals, and next steps.',
			prompt:
				'This idea feels promising. Help me write a practical first-version brief with scope, non-goals, and the next build step.',
			icon: FileEditIcon
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
		projectName.trim() ? `Start with ${projectName.trim()}.` : 'Start with the rough version.'
	);
	const landingDescription = $derived(
		projectName.trim()
			? 'Write the next messy thought. Launchpad will keep the project context close while you shape it.'
			: 'Paste the thought before it is tidy. Use chat to find the user, risk, artifact, or first build.'
	);
</script>

<div class="flex h-full min-h-0 flex-1 flex-col" in:fly={pageFlyIn}>
	<WorkspaceChatLanding
		title={landingTitle}
		description={landingDescription}
		placeholder="Paste the messy thought, customer quote, product hunch, or question you keep circling..."
		{suggestions}
		{examples}
		onSubmit={startThread}
	/>
</div>
