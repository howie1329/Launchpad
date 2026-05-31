<script lang="ts">
	import PublicFooter from '$lib/components/PublicFooter.svelte';
	import PublicHeader from '$lib/components/PublicHeader.svelte';
</script>

<svelte:head>
	<title>Support | Launchpad</title>
	<meta
		name="description"
		content="Get help with Launchpad account access, AI chat, projects, artifacts, and workspace issues."
	/>
</svelte:head>

<main class="flex min-h-svh flex-col bg-background text-foreground">
	<PublicHeader />

	<section class="mx-auto w-full max-w-2xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
		<p class="text-xs font-medium text-muted-foreground">Support</p>
		<h1 class="mt-3 text-3xl font-semibold tracking-tight text-balance">
			Get unstuck without losing the thread.
		</h1>
		<div class="mt-8 space-y-6 text-sm leading-7 text-pretty text-muted-foreground">
			<p>
				If chat fails, check your daily AI cap in settings, then retry from the composer. If an
				artifact draft looks wrong, discard it; canonical artifact content will stay unchanged.
			</p>
			<p>
				For account access, workspace data, billing questions, or launch feedback, email
				<a
					class="ml-1 text-foreground underline underline-offset-4"
					href="mailto:support@launchpad.dev"
				>
					support@launchpad.dev
				</a>.
			</p>
			<p>
				Include the route you were on, what you expected to happen, and whether the issue involved
				chat, projects, artifacts, or settings.
			</p>
		</div>
	</section>

	<PublicFooter />
</main>
