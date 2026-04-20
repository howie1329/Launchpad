<script lang="ts">
	import { resolve } from '$app/paths';
	import { LaunchpadLogo } from '$lib/components/brand';
	import { Button } from '$lib/components/ui/button';
</script>

<svelte:head>
	<title>Terms | Launchpad</title>
	<meta
		name="description"
		content="Launchpad terms for using the chat-first workspace, AI assistant, projects, and artifacts."
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
		<p class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Terms</p>
		<h1 class="mt-2 text-2xl font-semibold tracking-tight">
			Use Launchpad for scoped software work.
		</h1>
		<div class="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
			<p>
				Launchpad helps you plan software projects with chat, artifacts, and project workspaces. You
				are responsible for the content you add and the decisions you make from AI-generated output.
			</p>
			<p>
				AI output can be incomplete or incorrect. Review generated artifacts, drafts, and
				suggestions before using them in product, legal, financial, medical, or security-sensitive
				work.
			</p>
			<p>
				Do not use Launchpad to store secrets, violate others' rights, abuse the service, or upload
				content you are not allowed to process.
			</p>
			<p>
				Launchpad may change as the product develops. Continued use means you accept the current
				terms.
			</p>
		</div>
	</section>
</main>
