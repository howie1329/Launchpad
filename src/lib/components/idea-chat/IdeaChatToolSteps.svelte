<script lang="ts">
	import { Steps, StepsContent, StepsItem, StepsTrigger } from '$lib/components/prompt-kit/steps';
	import type { ToolStepView } from '$lib/idea-chat-assistant-parts';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import BanIcon from '@lucide/svelte/icons/ban';
	import CheckIcon from '@lucide/svelte/icons/check';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	let { tools }: { tools: ToolStepView[] } = $props();

	let open = $state(false);

	const anyRunning = $derived(tools.some((t) => t.phase === 'running'));
	const anyError = $derived(tools.some((t) => t.phase === 'error'));
	const anyDenied = $derived(tools.some((t) => t.phase === 'denied'));

	const triggerLabel = $derived(
		tools.length === 1 ? (tools[0]?.title ?? 'Tool activity') : `Tool activity (${tools.length})`
	);

	function statusIcon(phase: ToolStepView['phase']): typeof CheckIcon {
		switch (phase) {
			case 'done':
				return CheckIcon;
			case 'error':
				return AlertCircleIcon;
			case 'denied':
				return BanIcon;
			default:
				return LoaderCircleIcon;
		}
	}
</script>

{#snippet triggerLeftIcon()}
	<span class="relative inline-flex size-4 items-center justify-center text-muted-foreground">
		{#if anyRunning}
			<LoaderCircleIcon class="size-4 animate-spin" aria-hidden="true" />
		{:else if anyError}
			<AlertCircleIcon class="size-4 text-destructive" aria-hidden="true" />
		{:else if anyDenied}
			<BanIcon class="size-4 text-muted-foreground" aria-hidden="true" />
		{:else}
			<CheckIcon class="size-4 text-muted-foreground" aria-hidden="true" />
		{/if}
	</span>
{/snippet}

<div role="region" aria-label="Assistant tool activity" class="max-w-full min-w-0">
	<Steps bind:open class="border-t border-border/50 pt-3">
		<StepsTrigger class="px-0 py-2" leftIcon={triggerLeftIcon}>
			<span class="text-xs font-medium text-foreground">{triggerLabel}</span>
		</StepsTrigger>
		<StepsContent class="px-0 pb-1">
			{#each tools as tool (tool.id)}
				{@const Icon = statusIcon(tool.phase)}
				<StepsItem class="space-y-1.5">
					<div class="flex items-start gap-2">
						<Icon
							class="mt-0.5 size-3.5 shrink-0 {tool.phase === 'running'
								? 'animate-spin text-muted-foreground'
								: tool.phase === 'done'
									? 'text-muted-foreground'
									: tool.phase === 'error'
										? 'text-destructive'
										: 'text-muted-foreground'}"
							aria-hidden="true"
						/>
						<div class="min-w-0 flex-1 space-y-1">
							<p class="text-xs leading-snug font-medium text-foreground">{tool.title}</p>
							<p class="text-xs leading-relaxed text-muted-foreground">{tool.summary}</p>
							{#if tool.errorText && tool.phase === 'error'}
								<p class="text-xs leading-relaxed text-destructive">{tool.errorText}</p>
							{/if}
							<details class="pt-0.5">
								<summary
									class="cursor-pointer text-[11px] text-muted-foreground underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
								>
									Technical details
								</summary>
								<pre
									class="mt-1.5 max-h-40 overflow-x-auto overflow-y-auto rounded-md border border-border/50 bg-background p-2 font-mono text-[10px] leading-relaxed text-muted-foreground">{tool.detailJson}</pre>
							</details>
						</div>
					</div>
				</StepsItem>
			{/each}
		</StepsContent>
	</Steps>
</div>
