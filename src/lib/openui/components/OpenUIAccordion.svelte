<script lang="ts">
	import type { ComponentRenderProps } from '@openuidev/svelte-lang';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';

	let {
		props,
		renderNode
	}: ComponentRenderProps<{
		title: string;
		children?: unknown[];
	}> = $props();

	let open = $state(false);
</script>

<Collapsible.Root bind:open class="min-w-0 rounded-md border border-border/70 bg-card/40">
	<Collapsible.Trigger
		class="group flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
	>
		<span>{props.title}</span>
		<HugeiconsIcon
			icon={ArrowDown01Icon}
			strokeWidth={2}
			class="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
		/>
	</Collapsible.Trigger>
	<Collapsible.Content class="border-t border-border/50 px-3 py-2.5">
		{#if props.children}
			<div class="flex min-w-0 flex-col gap-2">
				{#each props.children as child, index (index)}
					{@render renderNode(child)}
				{/each}
			</div>
		{/if}
	</Collapsible.Content>
</Collapsible.Root>
