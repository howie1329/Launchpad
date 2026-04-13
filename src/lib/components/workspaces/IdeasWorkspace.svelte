<script lang="ts">
	import { resolve } from '$app/paths';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';

	let { showActions = true }: { showActions?: boolean } = $props();
</script>

<section class="flex h-full min-h-0 items-center overflow-y-auto bg-background px-5 py-14 sm:px-8">
	<div class="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[0.72fr_1fr] lg:items-center">
		<div class="max-w-xl">
			<Badge variant="secondary" class="mb-5">Coming soon</Badge>
			<p class="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
				Idea generator
			</p>
			<h1 class="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
				Find the idea before you scope the build.
			</h1>
			<p class="mt-5 max-w-lg text-sm leading-6 text-muted-foreground">
				Generate and refine product directions, then bring the strongest one into Launchpad for a
				focused MVP scope.
			</p>
			{#if showActions}
				<div class="mt-8 flex flex-wrap items-center gap-3">
					<Button href={resolve('/scope')} size="lg">Start Scoping</Button>
					<Button href={resolve('/')} variant="ghost" size="lg">Back Home</Button>
				</div>
			{/if}
		</div>

		<div class="border-y border-border/70 py-4">
			<div class="grid gap-0 divide-y divide-border/60">
				<div class="grid gap-3 py-5 sm:grid-cols-[9rem_1fr] sm:items-start">
					<p class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
						Start with
					</p>
					<p class="text-sm leading-6">A market, audience, constraint, or rough problem space.</p>
				</div>
				<div class="grid gap-3 py-5 sm:grid-cols-[9rem_1fr] sm:items-start">
					<p class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
						Turn into
					</p>
					<p class="text-sm leading-6">
						Clear product directions with a reason to exist and a first user in mind.
					</p>
				</div>
				<div class="grid gap-3 py-5 sm:grid-cols-[9rem_1fr] sm:items-start">
					<p class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
						Next step
					</p>
					<p class="text-sm leading-6">
						Send the best idea into the scoping workflow when you are ready to build.
					</p>
				</div>
			</div>

			<Separator class="my-4" />

			<p class="text-xs leading-5 text-muted-foreground">
				No waitlist yet. This page is a placeholder while the generator workflow is shaped.
			</p>
		</div>
	</div>
</section>
