<script lang="ts">
	import { resolve } from '$app/paths';
	import { LaunchpadLogo } from '$lib/components/brand';
	import { Button } from '$lib/components/ui/button';
</script>

<svelte:head>
	<title>Privacy | Launchpad</title>
	<meta
		name="description"
		content="How Launchpad handles account data, workspace content, AI requests, and support information."
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
		<p class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Privacy</p>
		<h1 class="mt-2 text-2xl font-semibold tracking-tight">Your workspace should stay yours.</h1>
		<div class="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
			<p>
				Launchpad stores the account details, chat threads, projects, artifacts, settings, and
				activity needed to run your workspace.
			</p>
			<p>
				When you use AI chat, Launchpad sends the active conversation and selected workspace context
				to the configured AI provider so it can respond and use workspace tools. Do not add
				passwords, API keys, regulated personal data, or anything you do not want processed by the
				AI provider.
			</p>
			<p>
				Artifact edits proposed by AI are saved as drafts until you apply or discard them. Saved
				artifact content changes only when you edit it directly or apply a draft.
			</p>
			<p>For privacy questions or deletion requests, contact support from the support page.</p>
		</div>
	</section>
</main>
