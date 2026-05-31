<script lang="ts">
	import { resolve } from '$app/paths';
	import PublicFooter from '$lib/components/PublicFooter.svelte';
	import PublicHeader from '$lib/components/PublicHeader.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';

	const loop = [
		{ label: 'Start with a thread', detail: 'Work through the messy product question in chat.' },
		{
			label: 'Save the useful parts',
			detail: 'Turn decisions, notes, and PRDs into markdown artifacts.'
		},
		{
			label: 'Promote when it is real',
			detail: 'Group the thread and artifacts into a project only when scope is clear.'
		}
	];

	const artifactNotes = [
		'First user: solo dev with a half-shaped idea',
		'MVP: one workflow, one artifact type'
	];
</script>

<svelte:head>
	<title>Launchpad | A workbench for scoped builds</title>
	<meta
		name="description"
		content="Launchpad is a chat-first workspace for solo builders who turn rough ideas into markdown artifacts, scoped projects, and reviewable AI-assisted work."
	/>
	<meta property="og:title" content="Launchpad | A workbench for scoped builds" />
	<meta
		property="og:description"
		content="Move from rough chat to durable artifacts and scoped projects without adopting heavyweight planning."
	/>
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Launchpad | A workbench for scoped builds" />
	<meta
		name="twitter:description"
		content="Move from rough chat to durable artifacts and scoped projects without adopting heavyweight planning."
	/>
</svelte:head>

<main class="flex min-h-svh flex-col bg-background text-foreground">
	<PublicHeader />

	<section
		class="mx-auto grid w-full max-w-7xl flex-1 gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:min-h-0 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-10 lg:py-6"
	>
		<div class="hero-copy max-w-2xl lg:max-w-[31rem]">
			<Badge variant="secondary" class="mb-5 w-fit text-[11px] font-medium">
				For solo builders using AI heavily
			</Badge>
			<h1
				class="max-w-2xl text-4xl leading-[1.04] font-semibold tracking-[-0.03em] text-balance sm:text-5xl lg:text-[3.35rem]"
			>
				Turn a rough thread into work you can actually build.
			</h1>
			<p class="mt-5 max-w-xl text-sm leading-7 text-pretty text-muted-foreground sm:text-base">
				Launchpad keeps the conversation, the decisions, and the project context in one quiet
				workspace, so planning stays close to shipping.
			</p>

			<div class="mt-7 flex flex-wrap items-center gap-3">
				<Button href={resolve('/workspace')} size="lg">Open workspace</Button>
				<Button href={resolve('/support')} variant="outline" size="lg">Read support notes</Button>
			</div>

			<div class="mt-9 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
				{#each loop as item (item.label)}
					<div class="rounded-lg border border-border/70 bg-card p-3">
						<p class="text-xs font-semibold text-foreground">{item.label}</p>
						<p class="mt-1.5 text-xs leading-5 text-muted-foreground">{item.detail}</p>
					</div>
				{/each}
			</div>
		</div>

		<div class="product-demo min-w-0" aria-hidden="true">
			<div class="overflow-hidden rounded-xl border border-border/70 bg-card">
				<div class="flex h-11 items-center justify-between border-b border-border/60 px-3">
					<div class="min-w-0">
						<p class="truncate text-xs font-semibold">Workspace</p>
						<p class="truncate text-[10px] text-muted-foreground">Drafts apply only after review</p>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="size-2 rounded-full bg-muted-foreground/35"></span>
						<span class="size-2 rounded-full bg-muted-foreground/20"></span>
					</div>
				</div>

				<div
					class="grid min-h-[28rem] grid-cols-1 sm:grid-cols-[10rem_minmax(0,1fr)] lg:min-h-[31rem]"
				>
					<aside class="hidden border-r border-border/60 bg-sidebar/60 p-3 sm:block">
						<p class="mb-3 text-[11px] font-medium text-muted-foreground">Launchpad</p>
						<div class="space-y-1.5 text-[11px]">
							<p class="rounded-md bg-background px-2 py-1.5 font-medium text-foreground">
								New thread
							</p>
							<p class="rounded-md px-2 py-1.5 text-muted-foreground">Projects</p>
							<p class="rounded-md px-2 py-1.5 text-muted-foreground">Artifacts</p>
							<p class="rounded-md px-2 py-1.5 text-muted-foreground">Imports</p>
						</div>

						<div class="mt-8 space-y-2">
							<p class="text-[10px] font-medium text-muted-foreground">Active project</p>
							<div class="rounded-lg border border-border/60 bg-background p-2">
								<p class="text-[11px] font-medium">MVP scope</p>
								<p class="mt-1 text-[10px] leading-4 text-muted-foreground">
									2 artifacts, 1 thread
								</p>
							</div>
						</div>
					</aside>

					<div class="grid min-w-0 grid-rows-[1fr_auto]">
						<div class="grid min-h-0 gap-0 lg:grid-cols-[minmax(0,1fr)_15rem]">
							<section class="min-w-0 p-3 sm:p-4">
								<p class="mb-3 text-[11px] font-medium text-muted-foreground">Thread</p>
								<div class="space-y-3">
									<div class="max-w-[86%] rounded-lg bg-accent px-3 py-2 text-xs leading-5">
										I have three ideas, but I need the smallest version worth testing.
									</div>
									<div
										class="ml-auto max-w-[88%] rounded-lg border border-border/60 bg-background px-3 py-2 text-xs leading-5 text-muted-foreground"
									>
										Start by choosing one user and one painful moment. Then save the decision as an
										artifact before we talk implementation.
									</div>
									<div class="rounded-lg bg-accent/70 px-3 py-2 text-xs leading-5">
										Let’s make the first user a solo dev validating a narrow workflow.
									</div>
								</div>
							</section>

							<section
								class="border-t border-border/60 bg-sidebar/40 p-3 sm:p-4 lg:border-t-0 lg:border-l"
							>
								<p class="mb-3 text-[11px] font-medium text-muted-foreground">Artifact draft</p>
								<div class="rounded-lg border border-border/60 bg-background p-3">
									<p class="text-xs font-semibold">Idea brief</p>
									<ul class="mt-3 space-y-2 text-[11px] leading-4 text-muted-foreground">
										{#each artifactNotes as note (note)}
											<li class="flex gap-2">
												<span class="mt-1.5 size-1 rounded-full bg-foreground"></span>
												<span>{note}</span>
											</li>
										{/each}
									</ul>
									<div class="mt-4 flex flex-wrap gap-1.5">
										<span class="rounded-full bg-secondary px-2 py-0.5 text-[10px]">review</span>
										<span class="rounded-full bg-secondary px-2 py-0.5 text-[10px]">markdown</span>
									</div>
								</div>
							</section>
						</div>

						<div class="border-t border-border/60 bg-background p-3 sm:p-4">
							<div
								class="flex flex-col gap-3 rounded-lg border border-border/70 bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
							>
								<div>
									<p class="text-xs font-semibold">Ready to promote?</p>
									<p class="mt-1 text-[11px] leading-4 text-muted-foreground">
										Review included artifacts before this becomes a project.
									</p>
								</div>
								<div class="flex shrink-0 gap-2">
									<span class="rounded-md bg-secondary px-2 py-1 text-[11px]">Edit draft</span>
									<span class="rounded-md bg-primary px-2 py-1 text-[11px] text-primary-foreground">
										Promote
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<PublicFooter />
</main>

<style>
	.hero-copy,
	.product-demo {
		animation: rise-in 240ms cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.product-demo {
		animation-delay: 70ms;
	}

	@keyframes rise-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-copy,
		.product-demo {
			animation: none;
		}
	}
</style>
