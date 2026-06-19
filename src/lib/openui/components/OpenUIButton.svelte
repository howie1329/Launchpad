<script lang="ts">
	import type { ComponentRenderProps } from '@openuidev/svelte-lang';
	import { getIsStreaming, getTriggerAction } from '@openuidev/svelte-lang';

	let {
		props
	}: ComponentRenderProps<{
		label: string;
		message: string;
		formName?: string;
		variant?: 'primary' | 'secondary';
	}> = $props();

	const triggerAction = getTriggerAction();
	const isStreaming = getIsStreaming();
</script>

<button
	type="button"
	class="inline-flex h-8 w-fit items-center justify-center rounded-md px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
	class:bg-primary={props.variant !== 'secondary'}
	class:text-primary-foreground={props.variant !== 'secondary'}
	class:bg-secondary={props.variant === 'secondary'}
	class:text-secondary-foreground={props.variant === 'secondary'}
	disabled={isStreaming()}
	onclick={() => triggerAction(props.message, props.formName)}
>
	{props.label}
</button>
