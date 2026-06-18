<script lang="ts">
	import type { ComponentRenderProps } from '@openuidev/svelte-lang';
	import { cn } from '$lib/utils';

	let {
		props
	}: ComponentRenderProps<{
		label: string;
		tone?: 'neutral' | 'info' | 'warning' | 'success';
	}> = $props();

	const toneClass = $derived(
		props.tone === 'warning'
			? 'bg-amber-500/12 text-amber-800 dark:text-amber-300'
			: props.tone === 'success'
				? 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-300'
				: props.tone === 'info'
					? 'bg-sky-500/12 text-sky-800 dark:text-sky-300'
					: 'bg-muted text-muted-foreground'
	);
</script>

<span
	class={cn(
		'inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] leading-4 font-medium',
		toneClass
	)}
>
	{props.label}
</span>
