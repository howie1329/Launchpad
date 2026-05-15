<script lang="ts">
	import { cn } from '$lib/utils';
	import { getChainOfThoughtContext } from './chain-of-thought-context.svelte.js';
	import { CollapsibleTrigger } from '$lib/components/ui/collapsible/index.js';
	import { ArrowDown01Icon, BrainIcon } from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import type { Snippet } from 'svelte';

	interface ChainOfThoughtHeaderProps {
		children?: Snippet;
		class?: string;
	}

	let { children, class: className }: ChainOfThoughtHeaderProps = $props();

	const context = getChainOfThoughtContext();
</script>

<CollapsibleTrigger
	class={cn(
		'flex w-full items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground',
		className
	)}
>
	<HugeiconsIcon icon={BrainIcon} strokeWidth={2} class="size-4" />
	<span class="flex-1 text-left">
		{#if children}
			{@render children()}
		{:else}
			Chain of Thought
		{/if}
	</span>
	<HugeiconsIcon
		icon={ArrowDown01Icon}
		strokeWidth={2}
		class={cn('size-4 transition-transform', context.isOpen ? 'rotate-180' : 'rotate-0')}
	/>
</CollapsibleTrigger>
