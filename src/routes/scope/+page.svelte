<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';

	let idea = $state('');
	let prdStatus = $state<'intake' | 'complete' | 'error'>('intake');
	let status = $state<'idle' | 'loading' | 'done' | 'error'>('idle');
	let errorMessage = $state<string>('');
	let prd = $state<{
		problemStatement: string;
		targetUser: string;
		mustHaveFeatures: string[];
		outOfScope: string[];
		suggestedStack: string;
		fullMVPPlan: string;
	}>({
		problemStatement: '',
		targetUser: '',
		mustHaveFeatures: [],
		outOfScope: [],
		suggestedStack: '',
		fullMVPPlan: ''
	});

	const generatePrd = async () => {
		status = 'loading';
		try {
			const response = await fetch('/api/scope', {
				method: 'POST',
				body: JSON.stringify({ idea }),
				headers: {
					'Content-Type': 'application/json'
				}
			});
			if (!response.ok) {
				const data = await response.json();
				status = 'error';
				errorMessage = data.error ?? 'Error generating PRD. Please try again.';
				return;
			}
			const data = await response.json();
			prd = data;
			prdStatus = 'complete';
			status = 'done';
		} catch (error) {
			console.error(error);
			status = 'error';
			errorMessage = 'Error generating PRD. Please try again.';
		}
	};
</script>

<svelte:head>
	<title>Start Scoping | Launchpad</title>
	<meta name="description" content="Start scoping your MVP with Launchpad." />
</svelte:head>

<main class="flex min-h-svh items-center justify-center bg-background px-5 text-foreground">
	{#if prdStatus === 'intake'}
		<section class="w-full max-w-md text-center">
			<p class="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
				Launchpad
			</p>
			<h1 class="text-3xl font-semibold tracking-tight text-balance">
				The scoping workflow is next.
			</h1>
			<p class="mt-4 text-sm leading-6 text-muted-foreground">
				This route is ready for the MVP idea intake form. For now, the marketing CTA has a stable
				destination.
			</p>
			<Textarea placeholder="Enter your idea here" bind:value={idea} />
			<Button disabled={status === 'loading'} onclick={generatePrd}>
				{status === 'loading' ? 'Generating PRD...' : 'Generate PRD'}
			</Button>

			{#if status === 'error'}
				<p class="text-sm text-destructive">{errorMessage}</p>
			{/if}

			<Button href={resolve('/')} variant="ghost" class="mt-7">Back to landing page</Button>
		</section>
	{/if}
	{#if prdStatus === 'complete' && status === 'done'}
		<section class="w-full max-w-md text-center">
			<p class="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
				Launchpad
			</p>
			<h1 class="text-3xl font-semibold tracking-tight text-balance">PRD complete</h1>
			<p class="mt-4 text-sm leading-6 text-muted-foreground">
				Your PRD is ready. You can now build your MVP.
			</p>
			<div class="mt-4">
				<p>Problem Statement</p>
				<p>{prd.problemStatement}</p>
				<p>Target User</p>
				<p>{prd.targetUser}</p>
				<p>Must Have Features</p>
				<p>{prd.mustHaveFeatures.join(', ')}</p>
				<p>Out of Scope</p>
				<p>{prd.outOfScope.join(', ')}</p>
				<p>Suggested Stack</p>
				<p>{prd.suggestedStack}</p>
				<p>Full MVP Plan</p>
				<p>{prd.fullMVPPlan}</p>
			</div>
			<div class="mt-4">
				<Button href={resolve('/')} variant="ghost" class="mt-7">Back to landing page</Button>
			</div>
		</section>
	{/if}
</main>
