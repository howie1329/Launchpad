<script lang="ts">
	import type { ComponentRenderProps } from '@openuidev/svelte-lang';
	import { cn } from '$lib/utils';

	let {
		props
	}: ComponentRenderProps<{
		title?: string;
		body: string;
		tone?: 'neutral' | 'info' | 'warning' | 'success';
	}> = $props();

	const toneClass = $derived(
		props.tone === 'warning'
			? 'border-amber-500/30 bg-amber-500/8'
			: props.tone === 'success'
				? 'border-emerald-500/30 bg-emerald-500/8'
				: props.tone === 'info'
					? 'border-sky-500/30 bg-sky-500/8'
					: 'border-border/70 bg-muted/45'
	);
</script>

<aside class={cn('rounded-md border px-3 py-2.5', toneClass)}>
	{#if props.title}<p class="text-xs font-semibold">{props.title}</p>{/if}
	<p class={cn('text-xs leading-5', props.title && 'mt-1')}>{props.body}</p>
</aside>
