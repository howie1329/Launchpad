<script lang="ts">
	import { resolve } from '$app/paths';
	import PublicFooter from '$lib/components/PublicFooter.svelte';
	import PublicHeader from '$lib/components/PublicHeader.svelte';
	import { Button } from '$lib/components/ui/button';

	const workflow = [
		{
			label: 'Start with the rough thought',
			detail:
				'Use chat to test the user, painful moment, scope, and risks before the idea becomes a plan.',
			artifact: 'Thread: “Is this worth building first?”'
		},
		{
			label: 'Keep the decision',
			detail:
				'Save the useful parts as markdown artifacts, with versions you can restore when the thinking changes.',
			artifact: 'Artifact: MVP scope, v4'
		},
		{
			label: 'Turn it into a project',
			detail:
				'Promote mature work into a project that carries context, imported references, connected app activity, and AI limits.',
			artifact: 'Project: Narrow workflow test'
		}
	];

	const proofNotes = [
		'One user: solo dev validating a narrow workflow',
		'Smallest build: thread import, artifact draft, review step',
		'Open question: what should GitHub activity update?'
	];

	const outcomes = [
		{
			label: 'Think without losing the thread',
			detail:
				'Launchpad keeps the messy conversation and the resulting decisions in the same workspace.'
		},
		{
			label: 'Write artifacts that survive chat',
			detail:
				'PRDs, briefs, notes, and scopes become durable markdown instead of another buried answer.'
		},
		{
			label: 'Review before tools act',
			detail:
				'Connected actions and imported context stay visible so AI work does not silently rewrite project state.'
		},
		{
			label: 'Keep usage bounded',
			detail:
				'Model choices, daily caps, and tool permissions remain part of the workspace, not hidden settings.'
		}
	];

	const trustPoints = [
		'Connected apps are opt-in',
		'Artifacts keep version history',
		'AI spend can be capped daily',
		'Project updates are reviewable'
	];
</script>

<svelte:head>
	<title>Launchpad | A workbench for scoped builds</title>
	<meta
		name="description"
		content="Launchpad is a chat-first workspace for solo builders who turn rough ideas into markdown artifacts, scoped projects, connected app context, and reviewable AI-assisted work."
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

<main class="min-h-svh bg-background text-foreground">
	<PublicHeader />

	<section
		class="mx-auto grid w-full max-w-7xl gap-12 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.84fr_1.16fr] lg:items-center lg:gap-16 lg:py-20"
	>
		<div class="hero-copy max-w-2xl">
			<p class="mb-5 max-w-md text-sm leading-6 font-medium text-muted-foreground">
				For solo builders who need the plan to stay connected to the conversation that made it.
			</p>
			<h1
				class="max-w-3xl text-5xl leading-[0.98] font-semibold tracking-[-0.045em] text-balance sm:text-6xl lg:text-[4.75rem]"
			>
				Make rough AI chats become buildable work.
			</h1>
			<p
				class="mt-6 max-w-[39rem] text-base leading-8 text-pretty text-muted-foreground sm:text-lg"
			>
				Launchpad is a quiet workspace for shaping ideas, saving decisions as markdown, and carrying
				project context into the next build step.
			</p>

			<div class="mt-8 flex flex-wrap items-center gap-3">
				<Button href={resolve('/workspace')} size="lg">Open workspace</Button>
				<Button href={resolve('/support')} variant="outline" size="lg">See how it works</Button>
			</div>

			<div class="mt-12 max-w-xl border-y border-border/70 py-5">
				<p class="text-sm leading-7 text-foreground">
					The first draft can be uncertain. The artifact should not be. Launchpad keeps the useful
					parts of a thread close enough to edit, promote, and reuse.
				</p>
			</div>
		</div>

		<div class="product-demo min-w-0" aria-label="Launchpad workspace preview">
			<div class="overflow-hidden rounded-xl border border-border/70 bg-card">
				<div class="flex h-12 items-center justify-between border-b border-border/60 px-4">
					<div class="min-w-0">
						<p class="truncate text-xs font-semibold">Workspace preview</p>
						<p class="truncate text-[11px] text-muted-foreground">
							Thread, artifact, project context
						</p>
					</div>
					<div class="flex items-center gap-1.5" aria-hidden="true">
						<span class="size-2 rounded-full bg-muted-foreground/35"></span>
						<span class="size-2 rounded-full bg-muted-foreground/20"></span>
					</div>
				</div>

				<div class="grid min-h-[34rem] grid-cols-1 sm:grid-cols-[11rem_minmax(0,1fr)]">
					<aside class="hidden border-r border-border/60 bg-sidebar/65 p-3 sm:block">
						<p class="mb-3 text-[11px] font-medium text-muted-foreground">Launchpad</p>
						<nav class="space-y-1.5 text-[11px]" aria-label="Preview navigation">
							<p class="rounded-md bg-background px-2 py-1.5 font-medium text-foreground">
								New thread
							</p>
							<p class="rounded-md px-2 py-1.5 text-muted-foreground">Projects</p>
							<p class="rounded-md px-2 py-1.5 text-muted-foreground">Artifacts</p>
							<p class="rounded-md px-2 py-1.5 text-muted-foreground">Imports</p>
							<p class="rounded-md px-2 py-1.5 text-muted-foreground">Usage</p>
						</nav>

						<div class="mt-9 space-y-2">
							<p class="text-[10px] font-medium text-muted-foreground">Active project</p>
							<div class="rounded-lg border border-border/60 bg-background p-2.5">
								<p class="text-[11px] font-semibold">Narrow workflow test</p>
								<p class="mt-1 text-[10px] leading-4 text-muted-foreground">
									3 artifacts, 1 thread, 2 imports
								</p>
								<div class="mt-2 flex flex-wrap gap-1">
									<span class="rounded-full bg-secondary px-1.5 py-0.5 text-[9px]">GitHub</span>
									<span class="rounded-full bg-secondary px-1.5 py-0.5 text-[9px]">Linear</span>
								</div>
							</div>
							<div class="rounded-lg border border-border/60 bg-background p-2.5">
								<p class="text-[10px] font-medium text-muted-foreground">Daily AI cap</p>
								<p class="mt-1 text-[11px] font-semibold">$0.50 remaining</p>
							</div>
						</div>
					</aside>

					<div class="grid min-w-0 grid-rows-[1fr_auto]">
						<div class="grid min-h-0 lg:grid-cols-[minmax(0,1fr)_16rem]">
							<section class="min-w-0 p-4 sm:p-5">
								<p class="mb-3 text-[11px] font-medium text-muted-foreground">Thread</p>
								<div class="space-y-3">
									<div class="max-w-[88%] rounded-lg bg-accent px-3 py-2.5 text-xs leading-5">
										I have a rough idea for importing AI context, but I need the smallest version
										worth testing.
									</div>
									<div
										class="ml-auto max-w-[90%] rounded-lg border border-border/60 bg-background px-3 py-2.5 text-xs leading-5 text-muted-foreground"
									>
										Start with one user, one repeated moment, and one artifact they would trust
										enough to reuse.
									</div>
									<div class="max-w-[86%] rounded-lg bg-accent/75 px-3 py-2.5 text-xs leading-5">
										User: solo developer validating a narrow workflow before writing code.
									</div>
								</div>

								<div class="mt-8 rounded-lg border border-border/70 bg-card p-3">
									<div class="flex items-start justify-between gap-3">
										<div>
											<p class="text-xs font-semibold">Suggested artifact</p>
											<p class="mt-1 text-[11px] leading-4 text-muted-foreground">
												Convert the useful decisions into an MVP scope note.
											</p>
										</div>
										<span
											class="rounded-md bg-primary px-2 py-1 text-[11px] text-primary-foreground"
											>Review</span
										>
									</div>
								</div>
							</section>

							<section
								class="border-t border-border/60 bg-sidebar/40 p-4 sm:p-5 lg:border-t-0 lg:border-l"
							>
								<p class="mb-3 text-[11px] font-medium text-muted-foreground">Markdown artifact</p>
								<article class="rounded-lg border border-border/60 bg-background p-3">
									<p class="text-xs font-semibold">MVP scope</p>
									<ul class="mt-3 space-y-2 text-[11px] leading-4 text-muted-foreground">
										{#each proofNotes as note (note)}
											<li class="flex gap-2">
												<span class="mt-1.5 size-1 rounded-full bg-foreground" aria-hidden="true"
												></span>
												<span>{note}</span>
											</li>
										{/each}
									</ul>
									<div class="mt-4 flex flex-wrap gap-1.5">
										<span class="rounded-full bg-secondary px-2 py-0.5 text-[10px]">v4</span>
										<span class="rounded-full bg-secondary px-2 py-0.5 text-[10px]">review</span>
										<span class="rounded-full bg-secondary px-2 py-0.5 text-[10px]">markdown</span>
									</div>
								</article>
							</section>
						</div>

						<div class="border-t border-border/60 bg-background p-4">
							<div
								class="grid gap-3 rounded-lg border border-border/70 bg-card p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
							>
								<div>
									<p class="text-xs font-semibold">Project update waiting</p>
									<p class="mt-1 text-[11px] leading-4 text-muted-foreground">
										GitHub activity found. Review it before changing project notes.
									</p>
								</div>
								<div class="flex shrink-0 gap-2">
									<span class="rounded-md bg-secondary px-2 py-1 text-[11px]">Skip</span>
									<span class="rounded-md bg-primary px-2 py-1 text-[11px] text-primary-foreground"
										>Review</span
									>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="border-y border-border/70 bg-sidebar/35">
		<div
			class="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16 lg:py-16"
		>
			<div>
				<p class="text-sm font-medium text-muted-foreground">The workflow</p>
				<h2
					class="mt-3 max-w-lg text-3xl leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-4xl"
				>
					A straight line from uncertain idea to scoped project.
				</h2>
			</div>
			<div class="space-y-6">
				{#each workflow as item, index (item.label)}
					<article
						class="grid gap-3 border-t border-border/70 pt-5 sm:grid-cols-[2rem_minmax(0,1fr)_minmax(10rem,0.52fr)] sm:gap-5"
					>
						<p class="text-sm font-semibold text-muted-foreground tabular-nums">{index + 1}</p>
						<div>
							<h3 class="text-base font-semibold tracking-[-0.01em]">{item.label}</h3>
							<p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{item.detail}</p>
						</div>
						<p
							class="h-fit rounded-lg bg-background px-3 py-2 text-xs leading-5 text-muted-foreground ring-1 ring-border/70"
						>
							{item.artifact}
						</p>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<section class="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
		<div class="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
			<div>
				<h2
					class="max-w-md text-3xl leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-4xl"
				>
					Built for the parts of building that happen before the repo is ready.
				</h2>
				<p class="mt-5 max-w-md text-sm leading-7 text-muted-foreground">
					Launchpad gives early product thinking enough structure to become useful, without turning
					every idea into process theatre.
				</p>
			</div>

			<div class="grid gap-x-8 gap-y-7 sm:grid-cols-2">
				{#each outcomes as outcome (outcome.label)}
					<article class="border-t border-border/70 pt-4">
						<h3 class="text-base font-semibold tracking-[-0.01em]">{outcome.label}</h3>
						<p class="mt-2 text-sm leading-6 text-muted-foreground">{outcome.detail}</p>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<section class="mx-auto max-w-7xl px-5 pb-16 sm:px-8 sm:pb-24">
		<div
			class="grid gap-8 rounded-xl border border-border/70 bg-card p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center"
		>
			<div>
				<p class="text-sm font-semibold">Keep the assistant useful by keeping it bounded.</p>
				<div class="mt-4 flex flex-wrap gap-2">
					{#each trustPoints as point (point)}
						<span class="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
							>{point}</span
						>
					{/each}
				</div>
			</div>
			<div class="flex flex-wrap gap-3">
				<Button href={resolve('/workspace')} size="lg">Open workspace</Button>
				<Button href={resolve('/support')} variant="outline" size="lg">Read support notes</Button>
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
