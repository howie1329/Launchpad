<script lang="ts">
	import { resolve } from '$app/paths';
	import { Marker, MarkerContent, MarkerIcon } from '$lib/components/ui/marker';
	import { Steps, StepsContent, StepsItem, StepsTrigger } from '$lib/components/prompt-kit/steps';
	import { formatToolActivitySummary, type ToolStepView } from '$lib/idea-chat-assistant-parts';
	import { cn } from '$lib/utils';
	import {
		AlertCircleIcon,
		Loading03Icon,
		ShieldBanIcon,
		Tick02Icon
	} from '@hugeicons/core-free-icons';
	import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/svelte';
	let {
		tools,
		deemphasized = false,
		hasAssistantText = false
	}: { tools: ToolStepView[]; deemphasized?: boolean; hasAssistantText?: boolean } = $props();

	let open = $state(false);
	let hasUserToggled = $state(false);

	const anyRunning = $derived(tools.some((t) => t.phase === 'running'));
	const anyError = $derived(tools.some((t) => t.phase === 'error'));
	const anyDenied = $derived(tools.some((t) => t.phase === 'denied'));
	const triggerLabel = $derived(formatToolActivitySummary(tools));

	$effect(() => {
		if (hasUserToggled) return;
		if (anyRunning || anyError || anyDenied) {
			open = true;
		} else if (hasAssistantText) {
			open = false;
		}
	});

	function markManualToggle() {
		hasUserToggled = true;
	}

	function reviewProjectPromotion() {
		window.dispatchEvent(new CustomEvent('launchpad:review-project-promotion'));
	}

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

<div
	role="region"
	aria-label="Assistant tool activity"
	aria-live="polite"
	aria-atomic="false"
	aria-busy={anyRunning}
	class={cn('max-w-full min-w-0', deemphasized && 'opacity-80')}
>
	<Steps bind:open class="min-w-0">
		<Marker role={anyRunning ? 'status' : undefined} class="w-full min-w-0">
			<MarkerContent class="w-full">
				<StepsTrigger
					class={cn(
						'px-0 py-1.5 text-muted-foreground hover:text-foreground',
						deemphasized ? 'text-[11px]' : 'text-xs'
					)}
					leftIcon={triggerLeftIcon}
					onclick={markManualToggle}
				>
					<span class={cn('font-medium text-foreground', deemphasized && 'font-normal')}
						>{triggerLabel}</span
					>
				</StepsTrigger>
			</MarkerContent>
		</Marker>
		<StepsContent class="px-0 pt-0.5 pb-1">
			{#each tools as tool (tool.id)}
				{@const stepIcon = statusIcon(tool.phase)}
				<StepsItem class="space-y-1">
					<Marker class="items-start gap-2 py-0.5">
						<MarkerIcon>
							<HugeiconsIcon
								icon={stepIcon}
								strokeWidth={2}
								class={tool.phase === 'running'
									? 'text-muted-foreground motion-safe:animate-spin'
									: tool.phase === 'done'
										? 'text-muted-foreground'
										: tool.phase === 'error'
											? 'text-destructive'
											: 'text-muted-foreground'}
							/>
						</MarkerIcon>
						<MarkerContent class="min-w-0 flex-1 space-y-1">
							<p class="text-xs leading-snug font-medium text-foreground">{tool.title}</p>
							<p class="text-[11px] leading-relaxed text-muted-foreground">{tool.summary}</p>
							{#if tool.errorText && tool.phase === 'error'}
								<p class="text-[11px] leading-relaxed text-destructive">{tool.errorText}</p>
							{/if}
							{#if tool.actionLabel && tool.toolName === 'prepareProjectPromotion'}
								<button
									type="button"
									class="inline-flex w-fit rounded-sm text-[11px] font-medium text-foreground underline underline-offset-2 hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
									onclick={reviewProjectPromotion}
								>
									{tool.actionLabel}
								</button>
							{:else if tool.actionLabel && tool.actionArtifactId}
								{@const actionArtifactId = tool.actionArtifactId}
								{@const actionVersionNumber = tool.actionVersionNumber}
								<button
									type="button"
									class="inline-flex w-fit rounded-sm text-[11px] font-medium text-foreground underline underline-offset-2 hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
									onclick={() => {
										const artifactPath = resolve('/workspace/artifacts/[artifactId]', {
											artifactId: actionArtifactId
										});
										window.location.assign(
											`${artifactPath}${actionVersionNumber !== undefined ? `?version=${actionVersionNumber}` : ''}`
										);
									}}
								>
									{tool.actionLabel}
								</button>
							{/if}
							{#if tool.sources && tool.sources.length > 0}
								<details class="pt-0.5">
									<summary
										class="cursor-pointer text-[11px] text-muted-foreground underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
									>
										View sources
									</summary>
									<div class="mt-1.5 max-h-40 space-y-1 overflow-y-auto rounded-md bg-muted/30 p-2">
										{#each tool.sources as source (source.url)}
											<!-- These URLs are validated external source links, not app navigation. -->
											<!-- eslint-disable svelte/no-navigation-without-resolve -->
											<a
												href={source.url}
												target="_blank"
												rel="noopener noreferrer"
												class="flex min-w-0 flex-col rounded-sm px-1 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
											>
												<span class="truncate">{source.title}</span>
												{#if source.domain}
													<span class="truncate text-[10px] text-muted-foreground/70"
														>{source.domain}</span
													>
												{/if}
											</a>
											<!-- eslint-enable svelte/no-navigation-without-resolve -->
										{/each}
									</div>
								</details>
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
						</MarkerContent>
					</Marker>
				</StepsItem>
			{/each}
		</StepsContent>
	</Steps>
</div>
