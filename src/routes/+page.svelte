<script lang="ts">
	import { resolve } from '$app/paths';
	import { LaunchpadLogo } from '$lib/components/brand';
	import AuthControls from '$lib/components/AuthControls.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';

	const workflow = [
		{
			step: '01',
			title: 'Describe the idea',
			body: 'Capture the problem, audience, app type, and preferred stack before momentum turns into sprawl.'
		},
		{
			step: '02',
			title: 'Generate the scope',
			body: 'Turn the raw idea into a PRD with must-haves, out-of-scope decisions, and a suggested build plan.'
		},
		{
			step: '03',
			title: 'Build the first week',
			body: 'Leave with the smallest useful feature set, so the first version is clear enough to ship.'
		}
	];

	const prdSections = [
		'Problem statement',
		'Target user',
		'Must-have features',
		'Out of scope',
		'Suggested stack',
		'One-week build plan'
	];
</script>

<svelte:head>
	<title>Launchpad | Scope your MVP before you build</title>
	<meta
		name="description"
		content="Launchpad helps solo developers turn a raw idea into a focused MVP scope, PRD, stack recommendation, and one-week build plan."
	/>
</svelte:head>

<main class="min-h-svh bg-background text-foreground">
	<section class="hero relative isolate overflow-hidden border-b border-border/60">
		<div
			class="absolute inset-y-0 right-0 hidden w-1/2 border-l border-border/40 bg-sidebar/50 lg:block"
		></div>

		<nav
			class="relative z-10 mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-5 sm:px-8"
		>
			<a href={resolve('/')} aria-label="Launchpad home">
				<LaunchpadLogo />
			</a>
			<div class="flex items-center gap-1">
				<a
					href="#how-it-works"
					class="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
				>
					How it works
				</a>
				<a
					href={resolve('/ideas')}
					class="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
				>
					Ideas
				</a>
				<AuthControls />
				<Button href={resolve('/scope')} size="sm">Start Scoping</Button>
			</div>
		</nav>

		<div
			class="relative z-10 mx-auto grid min-h-[calc(100svh-3.5rem)] w-full max-w-7xl items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-16"
		>
			<div class="hero-copy max-w-xl">
				<Badge variant="secondary" class="mb-5">For solo developers and indie hackers</Badge>
				<p class="mb-3 text-sm font-semibold tracking-tight text-primary">Launchpad</p>
				<h1
					class="max-w-2xl text-4xl font-semibold tracking-[-0.045em] text-balance sm:text-6xl lg:text-7xl"
				>
					Turn a raw idea into a scoped MVP before you build.
				</h1>
				<p class="mt-5 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
					Generate a focused PRD with must-have features, out-of-scope calls, stack guidance, and a
					one-week build plan.
				</p>
				<div class="mt-8 flex flex-wrap items-center gap-3">
					<Button href={resolve('/scope')} size="lg">Start Scoping</Button>
					<Button href="#how-it-works" variant="ghost" size="lg">See how it works</Button>
				</div>
			</div>

			<div class="product-surface group relative mx-auto w-full max-w-2xl lg:mr-0">
				<div
					class="surface-shell overflow-hidden rounded-xl border border-border/70 bg-background shadow-none transition-transform duration-500 group-hover:-translate-y-1"
				>
					<div class="flex h-10 items-center justify-between border-b border-border/60 px-3">
						<div>
							<p class="text-[11px] font-medium text-foreground">New scope</p>
							<p class="text-[10px] text-muted-foreground">AI PRD generation</p>
						</div>
						<Badge variant="outline">Streaming</Badge>
					</div>

					<div class="grid min-h-[31rem] md:grid-cols-[15rem_1fr]">
						<aside class="border-b border-border/60 bg-sidebar/60 p-4 md:border-r md:border-b-0">
							<p class="mb-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
								Idea intake
							</p>
							<div class="space-y-4">
								<div>
									<p class="mb-1 text-[11px] text-muted-foreground">Idea</p>
									<p class="rounded-md bg-accent/70 px-2 py-2 text-xs leading-5 text-foreground">
										A lightweight tool that helps developers scope what to build first.
									</p>
								</div>
								<div class="grid grid-cols-2 gap-2 md:grid-cols-1">
									<div>
										<p class="mb-1 text-[11px] text-muted-foreground">App type</p>
										<p class="rounded-md bg-accent/50 px-2 py-1.5 text-xs">SaaS</p>
									</div>
									<div>
										<p class="mb-1 text-[11px] text-muted-foreground">Stack</p>
										<p class="rounded-md bg-accent/50 px-2 py-1.5 text-xs">SvelteKit</p>
									</div>
								</div>
							</div>
						</aside>

						<div class="p-4 sm:p-5">
							<div class="mb-5 flex items-start justify-between gap-4">
								<div>
									<p class="text-base font-semibold tracking-tight">MVP PRD</p>
									<p class="mt-1 text-xs text-muted-foreground">
										Prioritized scope for a one-week first version.
									</p>
								</div>
								<div class="h-2 w-2 rounded-full bg-primary"></div>
							</div>

							<div class="space-y-4">
								<div class="reveal-line rounded-md bg-accent/50 p-3">
									<p class="text-[11px] font-medium text-muted-foreground uppercase">Problem</p>
									<p class="mt-1 text-xs leading-5">
										Developers over-build because the first useful version is undefined.
									</p>
								</div>
								<div class="reveal-line rounded-md bg-accent/40 p-3 [animation-delay:120ms]">
									<p class="text-[11px] font-medium text-muted-foreground uppercase">Must have</p>
									<div class="mt-2 space-y-2">
										<div class="h-2 w-11/12 rounded-full bg-muted-foreground/20"></div>
										<div class="h-2 w-4/5 rounded-full bg-muted-foreground/20"></div>
										<div class="h-2 w-3/5 rounded-full bg-primary/40"></div>
									</div>
								</div>
								<div class="grid gap-3 sm:grid-cols-2">
									<div class="reveal-line rounded-md bg-accent/35 p-3 [animation-delay:240ms]">
										<p class="text-[11px] font-medium text-muted-foreground uppercase">
											Out of scope
										</p>
										<p class="mt-1 text-xs">Auth, billing, collaboration.</p>
									</div>
									<div class="reveal-line rounded-md bg-accent/35 p-3 [animation-delay:360ms]">
										<p class="text-[11px] font-medium text-muted-foreground uppercase">Week 1</p>
										<p class="mt-1 text-xs">Form, AI response, copy markdown.</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section id="how-it-works" class="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
		<div class="grid gap-10 lg:grid-cols-[0.7fr_1fr] lg:gap-16">
			<div class="section-reveal max-w-md">
				<p class="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
					How it works
				</p>
				<h2 class="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
					Scope the first version without turning planning into the project.
				</h2>
			</div>

			<div class="section-reveal divide-y divide-border/70 border-y border-border/70">
				{#each workflow as item (item.step)}
					<div class="grid gap-4 py-6 sm:grid-cols-[4rem_0.55fr_1fr] sm:items-start">
						<p class="text-[11px] font-medium text-primary">{item.step}</p>
						<h3 class="text-sm font-semibold tracking-tight">{item.title}</h3>
						<p class="text-sm leading-6 text-muted-foreground">{item.body}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<Separator class="mx-auto max-w-7xl opacity-70" />

	<section
		class="mx-auto grid w-full max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-28"
	>
		<div class="section-reveal max-w-lg">
			<p class="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
				Generated output
			</p>
			<h2 class="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
				A PRD shaped for shipping, not daydreaming.
			</h2>
			<p class="mt-4 text-sm leading-6 text-muted-foreground">
				Launchpad turns the messy middle into a clear build boundary: what matters now, what waits,
				and what to do this week.
			</p>
		</div>

		<div class="section-reveal grid gap-x-8 gap-y-0 border-y border-border/70 sm:grid-cols-2">
			{#each prdSections as section (section)}
				<div
					class="group flex items-center justify-between border-b border-border/60 py-4 last:border-b-0 sm:nth-last-[-n+2]:border-b-0"
				>
					<p class="text-sm font-medium tracking-tight">{section}</p>
					<span
						class="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 transition-colors group-hover:bg-primary"
					></span>
				</div>
			{/each}
		</div>
	</section>

	<section class="mx-auto w-full max-w-7xl px-5 pb-10 sm:px-8">
		<div
			class="section-reveal border-t border-border/70 py-14 sm:flex sm:items-center sm:justify-between sm:gap-8"
		>
			<div class="max-w-xl">
				<p class="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
					Know what to build before you open the editor.
				</p>
				<p class="mt-3 text-sm leading-6 text-muted-foreground">
					Start with scope, constraints, and a first-week plan you can actually finish.
				</p>
			</div>
			<div class="mt-6 flex flex-wrap items-center gap-3 sm:mt-0">
				<Button href={resolve('/ideas')} variant="ghost" size="lg">Idea Generator</Button>
				<Button href={resolve('/scope')} size="lg">Start Scoping</Button>
			</div>
		</div>
	</section>
</main>

<style>
	.hero-copy,
	.product-surface,
	.section-reveal {
		animation: rise-in 720ms ease both;
	}

	.product-surface {
		animation-delay: 120ms;
	}

	.section-reveal {
		animation-timeline: view();
		animation-range: entry 0% cover 28%;
	}

	.reveal-line {
		animation: rise-in 640ms ease both;
	}

	.surface-shell {
		box-shadow: 0 1px 0 color-mix(in oklch, var(--foreground) 8%, transparent);
	}

	@keyframes rise-in {
		from {
			opacity: 0;
			transform: translateY(12px);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-copy,
		.product-surface,
		.section-reveal,
		.reveal-line {
			animation: none;
		}
	}
</style>
