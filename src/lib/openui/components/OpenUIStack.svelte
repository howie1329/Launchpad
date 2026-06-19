<script lang="ts">
	import type { ComponentRenderProps } from '@openuidev/svelte-lang';
	import { cn } from '$lib/utils';

	let {
		props,
		renderNode
	}: ComponentRenderProps<{
		children: unknown[];
		direction?: 'row' | 'column';
		gap?: 'small' | 'medium' | 'large';
	}> = $props();

	const classes = $derived(
		cn(
			'flex min-w-0',
			props.direction === 'row' ? 'flex-row flex-wrap items-start' : 'flex-col',
			props.gap === 'small' ? 'gap-1.5' : props.gap === 'large' ? 'gap-4' : 'gap-3'
		)
	);
</script>

<div class={classes}>
	{#each props.children as child, index (index)}
		{@render renderNode(child)}
	{/each}
</div>
