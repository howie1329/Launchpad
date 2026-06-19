<script lang="ts">
	import type { ComponentRenderProps } from '@openuidev/svelte-lang';

	let {
		props,
		renderNode
	}: ComponentRenderProps<{
		children: unknown[];
		columns?: 1 | 2 | 3;
	}> = $props();
</script>

<div
	class="grid min-w-0 gap-3"
	class:sm:grid-cols-2={props.columns === 2 || props.columns === 3}
	class:lg:grid-cols-3={props.columns === 3}
>
	{#each props.children as child, index (index)}
		{@render renderNode(child)}
	{/each}
</div>
