<script lang="ts">
	import type { ComponentRenderProps } from '@openuidev/svelte-lang';

	let {
		props
	}: ComponentRenderProps<{
		items: Array<{ label: string; value: string }>;
	}> = $props();
</script>

<dl class="grid min-w-0 gap-x-4 gap-y-2 sm:grid-cols-2">
	{#each props.items as item, index (`${item.label}-${index}`)}
		<div class="min-w-0">
			<dt class="text-[10px] font-medium text-muted-foreground">{item.label}</dt>
			<dd class="mt-0.5 truncate text-xs font-medium">{item.value}</dd>
		</div>
	{/each}
</dl>
