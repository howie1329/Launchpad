<script lang="ts">
	import type { ComponentRenderProps } from '@openuidev/svelte-lang';
	import { setFormNameContext } from '@openuidev/svelte-lang';

	let {
		props,
		renderNode
	}: ComponentRenderProps<{
		name: string;
		title?: string;
		children: unknown[];
	}> = $props();

	const formName = $derived(props.name);
	// svelte-ignore state_referenced_locally
	setFormNameContext(formName);
</script>

<section
	class="rounded-lg border border-border/70 bg-card p-3"
	aria-label={props.title ?? props.name}
>
	{#if props.title}<h3 class="mb-3 text-xs font-semibold">{props.title}</h3>{/if}
	<div class="flex flex-col gap-3">
		{#each props.children as child, index (index)}
			{@render renderNode(child)}
		{/each}
	</div>
</section>
