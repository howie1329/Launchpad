<script lang="ts">
	import { resolve } from '$app/paths';
	import { LaunchpadLogo } from '$lib/components/brand';
	import AuthControls from '$lib/components/AuthControls.svelte';
	import ThemeMenu from '$lib/components/ThemeMenu.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';

	const bullets = [
		'Chat-first workspace — think in threads, not forms.',
		'Artifacts stay as markdown memory: ideas, PRDs, and more.',
		'Projects when you are ready to group work and context.'
	];

	const signInHref = `${resolve('/auth')}?redirectTo=${encodeURIComponent('/workspace')}`;
</script>

<svelte:head>
	<title>Launchpad | Chat-first workspace for scoped builds</title>
	<meta
		name="description"
		content="Launchpad is a chat-first workspace for solo builders: threads, saved artifacts, and projects—so you scope work before you over-build."
	/>
	<meta property="og:title" content="Launchpad | Chat-first workspace for scoped builds" />
	<meta
		property="og:description"
		content="Turn rough ideas into scoped projects with chat, markdown artifacts, and explicit AI draft review."
	/>
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Launchpad | Chat-first workspace for scoped builds" />
	<meta
		name="twitter:description"
		content="Turn rough ideas into scoped projects with chat, markdown artifacts, and explicit AI draft review."
	/>
</svelte:head>

<main
	class="flex min-h-svh flex-col bg-background text-foreground lg:h-svh lg:max-h-svh lg:overflow-hidden"
>
	<header class="flex h-14 shrink-0 items-center border-b border-border/50 px-5 sm:px-8">
		<div class="mx-auto flex w-full max-w-7xl items-center justify-between">
			<a href={resolve('/')} aria-label="Launchpad home" class="shrink-0">
				<LaunchpadLogo />
			</a>
			<div class="flex min-w-0 items-center gap-1">
				<ThemeMenu variant="icon" />
				<AuthControls signedInMode="goToWorkspace" signedInCta="Go to Launchpad" />
			</div>
		</div>
	</header>

	<div
		class="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-10 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:gap-12 lg:py-6 xl:gap-14"
	>
		<div class="hero-copy flex min-h-0 max-w-xl flex-col justify-center lg:max-w-[min(28rem,42vw)]">
			<Badge variant="secondary" class="mb-4 w-fit text-[11px] font-medium tracking-wide uppercase">
				Solo developers and indie hackers
			</Badge>
			<h1
				class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-3xl xl:text-4xl"
			>
				Scope the next build in a workspace that thinks with you.
			</h1>
			<p class="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
				Use chat to clarify the problem, save decisions as artifacts, and graduate to a project when
				the idea is real—without turning planning into the product.
			</p>
			<ul class="mt-6 space-y-2.5 text-xs leading-snug text-muted-foreground">
				{#each bullets as line (line)}
					<li class="flex gap-2">
						<span class="mt-1.5 size-1 shrink-0 rounded-full bg-primary" aria-hidden="true"></span>
						<span>{line}</span>
					</li>
				{/each}
			</ul>
			<div class="mt-8 flex flex-wrap items-center gap-3">
				<Button href={signInHref} size="lg">Sign in</Button>
			</div>
			<nav class="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
				<a class="hover:text-foreground" href={resolve('/privacy')}>Privacy</a>
				<a class="hover:text-foreground" href={resolve('/terms')}>Terms</a>
				<a class="hover:text-foreground" href={resolve('/support')}>Support</a>
			</nav>
		</div>

		<div
			class="product-surface relative mx-auto w-full max-w-lg min-w-0 flex-1 lg:max-h-[min(420px,calc(100svh-5.5rem))] lg:max-w-none lg:flex-[1.1]"
			aria-hidden="true"
		>
			<div
				class="flex h-full max-h-[min(26rem,50svh)] flex-col overflow-hidden rounded-lg border border-border/70 bg-card lg:max-h-full"
			>
				<div class="flex h-10 shrink-0 items-center justify-between border-b border-border/60 px-3">
					<div class="min-w-0">
						<p class="truncate text-[11px] font-medium text-foreground">Workspace</p>
						<p class="truncate text-[10px] text-muted-foreground">
							Thread · Drafts apply, not overwrite
						</p>
					</div>
					<span class="size-2 shrink-0 rounded-full bg-primary"></span>
				</div>

				<div class="flex min-h-0 flex-1">
					<div class="hidden w-[42%] shrink-0 border-r border-border/60 bg-sidebar/50 p-3 sm:block">
						<p class="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
							Memory
						</p>
						<div class="space-y-2">
							<div
								class="rounded-md border border-border/50 bg-accent/40 px-2 py-1.5 text-[11px] text-foreground"
							>
								Idea · Narrow the first user
							</div>
							<div
								class="rounded-md border border-border/50 bg-accent/30 px-2 py-1.5 text-[11px] text-foreground"
							>
								PRD · MVP scope & out of scope
							</div>
						</div>
					</div>

					<div class="flex min-w-0 flex-1 flex-col p-3">
						<p class="mb-2 text-[11px] font-medium text-muted-foreground">Today</p>
						<div class="space-y-2">
							<div
								class="rounded-md bg-accent/45 px-2.5 py-2 text-[11px] leading-relaxed text-foreground"
							>
								What’s the smallest thing we can ship to learn if this pain is worth solving?
							</div>
							<div
								class="rounded-md border border-border/40 bg-background/80 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground"
							>
								Start with one persona and one workflow. We can capture that as an artifact when you
								are ready.
							</div>
						</div>
						<div class="mt-auto flex flex-wrap gap-1.5 pt-3">
							<span
								class="rounded-full bg-secondary/80 px-2 py-0.5 text-[10px] text-secondary-foreground"
							>
								idea
							</span>
							<span
								class="rounded-full bg-secondary/80 px-2 py-0.5 text-[10px] text-secondary-foreground"
							>
								prd
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</main>

<style>
	.hero-copy,
	.product-surface {
		animation: rise-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.product-surface {
		animation-delay: 90ms;
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
		.product-surface {
			animation: none;
		}
	}
</style>
