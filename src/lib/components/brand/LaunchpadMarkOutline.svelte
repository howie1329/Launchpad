<script lang="ts">
	import { cn, type WithoutChildren } from '$lib/utils.js';
	import type { SVGAttributes } from 'svelte/elements';

	type Props = WithoutChildren<SVGAttributes<SVGSVGElement>> & {
		ref?: SVGSVGElement | null;
	};

	let { ref = $bindable(null), class: className, ...restProps }: Props = $props();
</script>

<!-- Line-art LP mark: same letterforms as LaunchpadMark, no filled tile. -->
<svg
	bind:this={ref}
	viewBox="0 0 512 512"
	fill="none"
	class={cn('size-8', className)}
	{...restProps}
>
	<rect
		x="16"
		y="16"
		width="480"
		height="480"
		rx="104"
		fill="none"
		stroke="currentColor"
		stroke-width="28"
	/>
	<path
		d="M154 135V377H299"
		stroke="currentColor"
		stroke-width="46"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path
		d="M299 135H373C425 135 458 164 458 209C458 254 425 284 373 284H299V135Z"
		stroke="currentColor"
		stroke-width="46"
		stroke-linejoin="round"
	/>
	<path d="M299 135V377" stroke="currentColor" stroke-width="46" stroke-linecap="round" />
</svg>
