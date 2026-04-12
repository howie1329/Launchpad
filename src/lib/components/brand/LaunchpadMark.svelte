<script lang="ts">
	import { cn, type WithoutChildren } from '$lib/utils.js';
	import type { SVGAttributes } from 'svelte/elements';

	type Props = WithoutChildren<SVGAttributes<SVGSVGElement>> & {
		ref?: SVGSVGElement | null;
	};

	let { ref = $bindable(null), class: className, ...restProps }: Props = $props();
</script>

<svg
	bind:this={ref}
	viewBox="0 0 512 512"
	fill="none"
	aria-label="Launchpad"
	class={cn('size-8', className)}
	{...restProps}
>
	<rect width="512" height="512" rx="112" fill="currentColor" />
	<path
		d="M154 135V377H299"
		stroke="var(--background)"
		stroke-width="46"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path
		d="M299 135H373C425 135 458 164 458 209C458 254 425 284 373 284H299V135Z"
		stroke="var(--primary)"
		stroke-width="46"
		stroke-linejoin="round"
	/>
	<path d="M299 135V377" stroke="var(--primary)" stroke-width="46" stroke-linecap="round" />
</svg>
