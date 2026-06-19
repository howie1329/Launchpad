<script lang="ts">
	import type { ComponentRenderProps } from '@openuidev/svelte-lang';

	let { props }: ComponentRenderProps<{ label: string; value: number; max?: number }> = $props();
	const max = $derived(Math.max(1, props.max ?? 100));
	const percent = $derived(Math.max(0, Math.min(100, (props.value / max) * 100)));
</script>

<div class="space-y-1.5">
	<div class="flex items-center justify-between gap-3 text-[11px]">
		<span class="font-medium">{props.label}</span>
		<span class="text-muted-foreground tabular-nums">{Math.round(percent)}%</span>
	</div>
	<div
		class="h-2 overflow-hidden rounded-full bg-muted"
		role="progressbar"
		aria-label={props.label}
		aria-valuemin="0"
		aria-valuemax={max}
		aria-valuenow={props.value}
	>
		<div class="h-full rounded-full bg-foreground/75" style:width={`${percent}%`}></div>
	</div>
</div>
