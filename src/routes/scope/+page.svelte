<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { ActionData } from './$types';

	let { form }: { form?: ActionData } = $props();
</script>

<svelte:head>
	<title>Start Scoping | Launchpad</title>
	<meta name="description" content="Start scoping your MVP with Launchpad." />
</svelte:head>

<main class="flex min-h-svh items-center justify-center bg-background px-5 text-foreground">
	<section class="w-full max-w-md text-center">
		<p class="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Launchpad</p>
		<h1 class="text-3xl font-semibold tracking-tight text-balance">
			The scoping workflow is next.
		</h1>
		<p class="mt-4 text-sm leading-6 text-muted-foreground">
			This route is ready for the MVP idea intake form. For now, the marketing CTA has a stable
			destination.
		</p>
		<form method="POST" action={resolve('/scope')} class="mt-8 space-y-4 text-left">
			<div class="space-y-2">
				<Label for="idea">Idea</Label>
				<Textarea
					id="idea"
					name="idea"
					placeholder="A lightweight tool that helps developers scope what to build first..."
					value={form?.idea ?? ''}
				/>
				{#if form?.error}
					<p class="text-sm text-destructive">{form.error}</p>
				{/if}
			</div>

			<Button type="submit" class="w-full">Generate PRD</Button>
		</form>

		{#if form?.success}
			<div class="mt-6 rounded-md border border-border bg-card p-4 text-left">
				<p class="text-sm font-medium text-foreground">{form.message}</p>
				<p class="mt-2 text-sm leading-6 text-muted-foreground">
					Submitted idea: {form.idea}
				</p>
			</div>
		{/if}

		<Button href={resolve('/')} variant="ghost" class="mt-7">Back to landing page</Button>
	</section>
</main>
