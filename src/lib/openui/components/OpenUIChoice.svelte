<script lang="ts">
	import type { ComponentRenderProps } from '@openuidev/svelte-lang';
	import { getIsStreaming, getTriggerAction } from '@openuidev/svelte-lang';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';

	let {
		props
	}: ComponentRenderProps<{
		question: string;
		context?: string;
		options: Array<{ label: string; answer: string; description?: string }>;
	}> = $props();

	const triggerAction = getTriggerAction();
	const isStreaming = getIsStreaming();
</script>

<section class="rounded-lg border border-border/70 bg-card p-3" aria-label="Assistant choice">
	<p class="text-xs leading-5 font-semibold">{props.question}</p>
	{#if props.context}<p class="mt-1 text-[11px] leading-4 text-muted-foreground">
			{props.context}
		</p>{/if}
	<div class="mt-3 grid gap-2">
		{#each props.options as option, index (`${option.label}-${index}`)}
			<Button
				type="button"
				variant="outline"
				disabled={isStreaming()}
				class={cn(
					'h-auto min-h-10 w-full flex-col items-start justify-start px-3 py-2 text-left whitespace-normal',
					'hover:border-primary/40 hover:bg-muted/40'
				)}
				onclick={() => triggerAction(option.answer)}
			>
				<span class="text-xs font-medium">{option.label}</span>
				{#if option.description}<span class="mt-0.5 text-[11px] leading-4 font-normal text-muted-foreground"
						>{option.description}</span
					>{/if}
			</Button>
		{/each}
	</div>
</section>
