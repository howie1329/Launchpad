<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';

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
		<Textarea placeholder="Enter your idea here" />
		<Button href={resolve('/')} variant="ghost" class="mt-7">Back to landing page</Button>
	</section>
</main>
