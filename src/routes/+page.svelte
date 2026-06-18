<script lang="ts">
	import { resolve } from '$app/paths';
	import PublicHeader from '$lib/components/PublicHeader.svelte';
	import { Button } from '$lib/components/ui/button';

	const capabilities = [
		{
			label: 'Chat memory',
			detail: 'Useful turns stay attached to the project instead of vanishing in a thread.'
		},
		{
			label: 'Markdown artifacts',
			detail: 'Decisions become editable briefs, scopes, notes, and checklists with history.'
		},
		{
			label: 'Project context',
			detail: 'Imports, artifacts, activity, and model limits travel with the build.'
		},
		{
			label: 'Reviewable AI',
			detail: 'Drafts and connected-app updates wait for approval before changing state.'
		}
	];

	const safeguards = [
		'Opt-in connections',
		'Versioned artifacts',
		'Review before updates',
		'Daily AI caps'
	];
</script>

<svelte:head>
	<title>Launchpad | Persistent context for solo founders</title>
	<meta
		name="description"
		content="Launchpad keeps AI chats, markdown artifacts, imports, connected activity, and project decisions in one workspace for solo founders shaping what to build next."
	/>
	<meta property="og:title" content="Launchpad | Persistent context for solo founders" />
	<meta
		property="og:description"
		content="Keep the useful context from AI chats close to the artifacts, projects, and reviews that move a build forward."
	/>
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Launchpad | Persistent context for solo founders" />
	<meta
		name="twitter:description"
		content="Keep AI chats, artifacts, imports, and project decisions connected while you decide what to build next."
	/>
</svelte:head>

<main class="flex min-h-svh flex-col bg-background text-foreground">
	<PublicHeader />

	<section
		class="one-page mx-auto grid w-full max-w-7xl flex-1 gap-6 px-5 py-5 sm:px-8 lg:min-h-0 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-8 lg:py-6"
	>
		<div class="hero-copy min-w-0 lg:max-w-xl">
			<p class="max-w-md text-sm leading-6 font-medium text-foreground/75">
				For solo founders trying to keep useful AI work from disappearing between sessions.
			</p>
			<h1
				class="mt-4 max-w-3xl text-4xl leading-[0.98] font-semibold tracking-[-0.04em] text-balance sm:text-5xl lg:text-[4.25rem]"
			>
				Keep product context alive while you decide what to build.
			</h1>
			<p class="mt-5 max-w-[40rem] text-base leading-7 text-pretty text-foreground/72">
				Launchpad connects AI chats, markdown artifacts, imported references, project activity, and
				usage controls so the next answer starts with the work you already did.
			</p>

			<div class="mt-6 flex flex-wrap items-center gap-3">
				<Button href={resolve('/workspace')} size="lg">Open workspace</Button>
				<Button href={resolve('/support')} variant="outline" size="lg">Read support notes</Button>
			</div>

			<div class="mt-7 grid gap-3 sm:grid-cols-2">
				{#each capabilities as capability (capability.label)}
					<article class="capability-tile border-t border-border/70 pt-3">
						<h2 class="text-sm font-semibold tracking-[-0.01em]">{capability.label}</h2>
						<p class="mt-1.5 text-sm leading-6 text-foreground/68">{capability.detail}</p>
					</article>
				{/each}
			</div>

			<div class="mt-5 flex flex-wrap gap-2" aria-label="Launchpad safeguards">
				{#each safeguards as safeguard (safeguard)}
					<span
						class="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
					>
						{safeguard}
					</span>
				{/each}
			</div>
		</div>

		<div class="context-map min-w-0" aria-label="Launchpad persistent context preview">
			<div class="overflow-hidden rounded-2xl border border-border/80 bg-card">
				<div class="flex items-center justify-between border-b border-border/70 px-4 py-3 sm:px-5">
					<div>
						<p class="text-sm font-semibold">Beta onboarding</p>
						<p class="mt-0.5 text-xs text-foreground/60">Workspace context map</p>
					</div>
					<p
						class="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
					>
						review mode
					</p>
				</div>

				<div class="grid lg:grid-cols-[11rem_minmax(0,1fr)]">
					<aside class="border-b border-border/70 bg-sidebar/70 p-3 lg:border-r lg:border-b-0">
						<p class="text-xs font-medium text-foreground/62">Included context</p>
						<nav
							class="mt-3 grid grid-cols-2 gap-1.5 text-xs lg:grid-cols-1"
							aria-label="Preview context navigation"
						>
							<span
								class="rounded-md bg-background px-2.5 py-1.5 font-medium text-foreground ring-1 ring-border/70"
								>Threads</span
							>
							<span class="rounded-md px-2.5 py-1.5 text-foreground/62">Artifacts</span>
							<span class="rounded-md px-2.5 py-1.5 text-foreground/62">Imports</span>
							<span class="rounded-md px-2.5 py-1.5 text-foreground/62">Activity</span>
						</nav>
						<div class="mt-5 rounded-lg border border-border/70 bg-background p-3">
							<p class="text-xs font-semibold">Daily AI cap</p>
							<div class="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
								<div class="h-full w-[62%] rounded-full bg-foreground"></div>
							</div>
							<p class="mt-2 text-[11px] leading-4 text-foreground/60">$0.50 remaining today</p>
						</div>
					</aside>

					<div class="p-3 sm:p-4">
						<div class="grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
							<section class="rounded-xl border border-border/70 bg-background p-3">
								<p class="text-[11px] font-medium text-foreground/55">Thread</p>
								<h2 class="mt-2 text-sm font-semibold tracking-[-0.01em]">Pricing-page rewrite</h2>
								<p class="mt-2 text-xs leading-5 text-foreground/64">
									Questions, objections, and founder notes from the first pass.
								</p>
								<div class="mt-4 rounded-lg bg-secondary/70 px-3 py-2 text-xs leading-5">
									What does a solo founder need before trusting the next build step?
								</div>
							</section>

							<section class="rounded-xl border border-border/70 bg-background p-3">
								<div class="flex items-start justify-between gap-3">
									<div>
										<p class="text-[11px] font-medium text-foreground/55">Artifact</p>
										<h2 class="mt-2 text-sm font-semibold tracking-[-0.01em]">Launch brief v3</h2>
									</div>
									<span class="rounded-md bg-secondary px-2 py-1 text-[11px] font-medium"
										>draft</span
									>
								</div>
								<ul class="mt-3 space-y-2 text-xs leading-5 text-foreground/64">
									<li>Decision: lead with persistent context.</li>
									<li>Import: 2 reference threads included.</li>
									<li>Open: review Linear activity before updating notes.</li>
								</ul>
							</section>
						</div>

						<div class="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_13rem]">
							<section class="rounded-xl border border-border/70 bg-background p-3">
								<p class="text-sm font-semibold">Assistant answer with workspace state</p>
								<p class="mt-1 text-xs leading-5 text-foreground/60">
									Using 3 artifacts, 2 imports, and the latest GitHub activity.
								</p>
								<p class="mt-3 rounded-lg bg-secondary/70 px-3 py-2 text-xs leading-5">
									Start with what Launchpad already knows before asking the founder for a new brief.
								</p>
							</section>

							<section class="rounded-xl border border-border/70 bg-sidebar/55 p-3">
								<p class="text-sm font-semibold">Review queue</p>
								<div class="mt-3 space-y-2">
									<p class="rounded-lg bg-background p-2.5 text-xs leading-5 ring-1 ring-border/70">
										GitHub activity found. Review before changing project notes.
									</p>
									<p class="rounded-lg bg-background p-2.5 text-xs leading-5 ring-1 ring-border/70">
										Artifact update ready. Compare with MVP scope v3.
									</p>
								</div>
							</section>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
</main>

<style>
	.hero-copy,
	.context-map {
		animation: rise-in 260ms cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.context-map {
		animation-delay: 80ms;
	}

	.capability-tile {
		transition:
			border-color 180ms cubic-bezier(0.16, 1, 0.3, 1),
			transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	.capability-tile:hover {
		border-color: color-mix(in oklch, var(--foreground) 22%, var(--border));
		transform: translateY(-1px);
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
		.context-map {
			animation: none;
		}

		.capability-tile {
			transition: none;
		}

		.capability-tile:hover {
			transform: none;
		}
	}
</style>
