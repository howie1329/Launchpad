<script lang="ts">
	import type { ComponentRenderProps } from '@openuidev/svelte-lang';
	import { cn } from '$lib/utils';

	type TimelineItem = {
		title: string;
		description?: string;
		date?: string;
		status?: 'completed' | 'current' | 'upcoming';
	};

	let {
		props
	}: ComponentRenderProps<{
		items: TimelineItem[];
	}> = $props();

	function statusLabel(status: TimelineItem['status']): string {
		if (status === 'completed') return 'Completed';
		if (status === 'current') return 'Current';
		if (status === 'upcoming') return 'Upcoming';
		return '';
	}
</script>

<ol class="relative min-w-0 space-y-3 border-l border-border/60 pl-3.5">
	{#each props.items as item, index (`${item.title}-${index}`)}
		<li class="relative min-w-0">
			<span
				class={cn(
					'absolute top-1.5 -left-[calc(0.875rem+1px)] size-2 rounded-full border border-background',
					item.status === 'completed' && 'bg-primary',
					item.status === 'current' && 'bg-primary ring-2 ring-primary/30',
					item.status === 'upcoming' && 'bg-muted',
					!item.status && 'bg-muted-foreground/50'
				)}
				aria-hidden="true"
			></span>
			<div class="min-w-0 space-y-0.5">
				<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
					<p class="text-xs font-medium text-foreground">{item.title}</p>
					{#if item.date}
						<span class="text-[10px] text-muted-foreground">{item.date}</span>
					{/if}
					{#if item.status}
						<span class="sr-only">{statusLabel(item.status)}</span>
					{/if}
				</div>
				{#if item.description}
					<p class="text-[11px] leading-4 text-muted-foreground">{item.description}</p>
				{/if}
			</div>
		</li>
	{/each}
</ol>
