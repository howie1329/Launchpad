<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';

	let { reducedMotion = false }: { reducedMotion?: boolean } = $props();
</script>

<div
	class="w-full min-w-0 rounded-md border border-border/60 bg-card/50 p-3 sm:p-3"
	aria-live="polite"
	aria-busy="true"
>
	<p class="sr-only">Building response...</p>
	<div class="space-y-2.5">
		<Skeleton class={`h-3 w-2/5 ${reducedMotion ? '' : 'animate-pulse'}`} />
		<Skeleton class={`h-3 w-full ${reducedMotion ? '' : 'animate-pulse'}`} />
		<Skeleton class={`h-3 w-4/5 ${reducedMotion ? '' : 'animate-pulse'}`} />
	</div>
</div>
