<script lang="ts">
	import type { ComponentRenderProps } from '@openuidev/svelte-lang';

	let {
		props
	}: ComponentRenderProps<{
		title?: string;
		items: Array<{ label: string; value: number }>;
	}> = $props();

	const maxValue = $derived(Math.max(1, ...props.items.map((item) => Math.max(0, item.value))));
</script>

<figure class="min-w-0 rounded-md border border-border/70 p-3">
	{#if props.title}<figcaption class="mb-3 text-xs font-semibold">{props.title}</figcaption>{/if}
	<div class="space-y-2.5">
		{#each props.items as item, index (`${item.label}-${index}`)}
			<div class="grid grid-cols-[minmax(4rem,8rem)_1fr_auto] items-center gap-2">
				<span class="truncate text-[11px] text-muted-foreground">{item.label}</span>
				<div class="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
					<div
						class="h-full rounded-full bg-foreground/75 transition-[width] duration-200 motion-reduce:transition-none"
						style:width={`${Math.max(0, Math.min(100, (item.value / maxValue) * 100))}%`}
					></div>
				</div>
				<span class="text-[11px] font-medium tabular-nums">{item.value}</span>
			</div>
		{/each}
	</div>
</figure>
