<script lang="ts">
	import PublicFooter from '$lib/components/PublicFooter.svelte';
	import PublicHeader from '$lib/components/PublicHeader.svelte';
</script>

<svelte:head>
	<title>Privacy | Launchpad</title>
	<meta
		name="description"
		content="How Launchpad handles account data, workspace content, AI requests, and support information."
	/>
</svelte:head>

<main class="flex min-h-svh flex-col bg-background text-foreground">
	<PublicHeader />

	<section class="mx-auto w-full max-w-2xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
		<p class="text-xs font-medium text-muted-foreground">Privacy</p>
		<h1 class="mt-3 text-3xl font-semibold tracking-tight text-balance">
			Your workspace should stay yours.
		</h1>
		<div class="mt-8 space-y-6 text-sm leading-7 text-pretty text-muted-foreground">
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

	<PublicFooter />
</main>
