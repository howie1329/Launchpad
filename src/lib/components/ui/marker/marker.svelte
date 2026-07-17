<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	export const markerVariants = tv({
		base: 'flex items-center gap-2 text-xs text-muted-foreground',
		variants: {
			variant: {
				default: 'w-fit',
				border: 'w-full border-b border-border/50 py-2',
				separator:
					'w-full gap-3 py-2 text-[11px] before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border'
			}
		},
		defaultVariants: {
			variant: 'default'
		}
	});

	export type MarkerVariant = VariantProps<typeof markerVariants>['variant'];
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		variant = 'default',
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		variant?: MarkerVariant;
	} = $props();
</script>

<div
	bind:this={ref}
	data-slot="marker"
	class={cn(markerVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
</div>
