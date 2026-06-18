<script lang="ts">
	import type { ComponentRenderProps } from '@openuidev/svelte-lang';

	let { props, renderNode }: ComponentRenderProps<{ children: unknown[] }> = $props();
</script>

<div class="flex w-full min-w-0 flex-col gap-3 text-xs leading-relaxed text-foreground">
	{#each props.children as child, index (index)}
		{@render renderNode(child)}
	{/each}
</div>
