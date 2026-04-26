<script lang="ts">
	import { resolve } from '$app/paths';
	import { Steps, StepsContent, StepsItem, StepsTrigger } from '$lib/components/prompt-kit/steps';
	import type { ToolStepView } from '$lib/idea-chat-assistant-parts';
	import {
		AlertCircleIcon,
		Loading03Icon,
		ShieldBanIcon,
		Tick02Icon
	} from '@hugeicons/core-free-icons';
	import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/svelte';
	let { tools }: { tools: ToolStepView[] } = $props();

	let open = $state(false);

	const anyRunning = $derived(tools.some((t) => t.phase === 'running'));
	const anyError = $derived(tools.some((t) => t.phase === 'error'));
	const anyDenied = $derived(tools.some((t) => t.phase === 'denied'));

	const triggerLabel = $derived(
		tools.length === 1 ? (tools[0]?.title ?? 'Tool activity') : `Tool activity (${tools.length})`
	);

	function statusIcon(phase: ToolStepView['phase']): IconSvgElement {
		switch (phase) {
			case 'done':
				return Tick02Icon;
			case 'error':
				return AlertCircleIcon;
			case 'denied':
				return ShieldBanIcon;
			default:
				return Loading03Icon;
		}
	}
</script>

{#snippet triggerLeftIcon()}
	<span class="relative inline-flex size-4 items-center justify-center text-muted-foreground">
		{#if anyRunning}
			<HugeiconsIcon
				icon={Loading03Icon}
				strokeWidth={2}
				class="size-4 motion-safe:animate-spin"
				aria-hidden="true"
			/>
		{:else if anyError}
			<HugeiconsIcon
				icon={AlertCircleIcon}
				strokeWidth={2}
				class="size-4 text-destructive"
				aria-hidden="true"
			/>
		{:else if anyDenied}
			<HugeiconsIcon
				icon={ShieldBanIcon}
				strokeWidth={2}
				class="size-4 text-muted-foreground"
				aria-hidden="true"
			/>
		{:else}
			<HugeiconsIcon
				icon={Tick02Icon}
				strokeWidth={2}
				class="size-4 text-muted-foreground"
				aria-hidden="true"
			/>
		{/if}
	</span>
{/snippet}

<div role="region" aria-label="Assistant tool activity" class="max-w-full min-w-0">
	<Steps bind:open class="min-w-0">
		<StepsTrigger
			class="px-0 py-1.5 text-xs text-muted-foreground hover:text-foreground"
			leftIcon={triggerLeftIcon}
		>
			<span class="font-medium text-foreground">{triggerLabel}</span>
		</StepsTrigger>
		<StepsContent class="px-0 pt-0.5 pb-1">
			{#each tools as tool (tool.id)}
				{@const stepIcon = statusIcon(tool.phase)}
				<StepsItem class="space-y-1">
					<div class="flex items-start gap-2">
						<HugeiconsIcon
							icon={stepIcon}
							strokeWidth={2}
							class="mt-0.5 size-3.5 shrink-0 {tool.phase === 'running'
								? 'text-muted-foreground motion-safe:animate-spin'
								: tool.phase === 'done'
									? 'text-muted-foreground'
									: tool.phase === 'error'
										? 'text-destructive'
										: 'text-muted-foreground'}"
							aria-hidden="true"
						/>
						<div class="min-w-0 flex-1 space-y-1">
							<p class="text-xs leading-snug font-medium text-foreground">{tool.title}</p>
							<p class="text-[11px] leading-relaxed text-muted-foreground">{tool.summary}</p>
							{#if tool.errorText && tool.phase === 'error'}
								<p class="text-[11px] leading-relaxed text-destructive">{tool.errorText}</p>
							{/if}
							{#if tool.actionLabel && tool.actionArtifactId && tool.actionVersionNumber !== undefined}
								{@const actionArtifactId = tool.actionArtifactId}
								<button
									type="button"
									class="inline-flex w-fit rounded-sm text-[11px] font-medium text-foreground underline underline-offset-2 hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
									onclick={() => {
										window.location.assign(
											`${resolve('/workspace/artifacts/[artifactId]', {
												artifactId: actionArtifactId
											})}?version=${tool.actionVersionNumber}`
										);
									}}
								>
									{tool.actionLabel}
								</button>
							{/if}
							<details class="pt-0.5">
								<summary
									class="cursor-pointer text-[11px] text-muted-foreground underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
								>
									Technical details
								</summary>
								<pre
									class="mt-1.5 max-h-40 overflow-x-auto overflow-y-auto rounded-md bg-muted/30 p-2 font-mono text-[10px] leading-relaxed text-muted-foreground">{tool.detailJson}</pre>
							</details>
						</div>
					</div>
				</StepsItem>
			{/each}
		</StepsContent>
	</Steps>
</div>
