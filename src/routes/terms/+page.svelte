<script lang="ts">
	import PublicFooter from '$lib/components/PublicFooter.svelte';
	import PublicHeader from '$lib/components/PublicHeader.svelte';
</script>

<svelte:head>
	<title>Terms | Launchpad</title>
	<meta
		name="description"
		content="Launchpad terms for using the chat-first workspace, AI assistant, projects, and artifacts."
	/>
</svelte:head>

<main class="flex min-h-svh flex-col bg-background text-foreground">
	<PublicHeader />

	<section class="mx-auto w-full max-w-2xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
		<p class="text-xs font-medium text-muted-foreground">Terms</p>
		<h1 class="mt-3 text-3xl font-semibold tracking-tight text-balance">
			Use Launchpad for scoped software work.
		</h1>
		<div class="mt-8 space-y-6 text-sm leading-7 text-pretty text-muted-foreground">
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

	<PublicFooter />
</main>
