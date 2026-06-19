<script lang="ts">
	import type { ComponentRenderProps } from '@openuidev/svelte-lang';

	let {
		props,
		renderNode
	}: ComponentRenderProps<{
		title?: string;
		description?: string;
		children?: unknown[];
	}> = $props();
</script>

<section class="min-w-0 rounded-lg border border-border/70 bg-card p-3 text-card-foreground">
	{#if props.title || props.description}
		<header class="mb-3 space-y-1">
			{#if props.title}<h3 class="text-xs font-semibold tracking-tight">{props.title}</h3>{/if}
			{#if props.description}<p class="text-[11px] leading-4 text-muted-foreground">
					{props.description}
				</p>{/if}
		</header>
	{/if}
	{#if props.children}
		<div class="flex min-w-0 flex-col gap-2.5">
			{#each props.children as child, index (index)}
				{@render renderNode(child)}
			{/each}
		</div>
	{/if}
</section>
