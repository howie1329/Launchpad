<script lang="ts">
	import { resolve } from '$app/paths';
	import { LaunchpadLogo } from '$lib/components/brand';
	import { Button } from '$lib/components/ui/button';
</script>

<svelte:head>
	<title>Support | Launchpad</title>
	<meta
		name="description"
		content="Get help with Launchpad account access, AI chat, projects, artifacts, and workspace issues."
	/>
</svelte:head>

<main class="min-h-svh bg-background text-foreground">
	<header class="flex h-12 items-center justify-between border-b border-border/50 px-4 sm:px-6">
		<a href={resolve('/')} aria-label="Launchpad home">
			<LaunchpadLogo />
		</a>
		<Button href={resolve('/workspace')} size="sm">Open workspace</Button>
	</header>

	<section class="mx-auto max-w-2xl px-5 py-12 sm:px-8">
		<p class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Support</p>
		<h1 class="mt-2 text-2xl font-semibold tracking-tight">Get unstuck fast.</h1>
		<div class="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
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
</main>
