<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { cn } from '$lib/utils';
	import {
		ClipboardCopyIcon,
		GitForkIcon,
		Refresh01Icon,
		Tick02Icon
	} from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';

	type Props = {
		role: 'user' | 'assistant';
		allowRetry: boolean;
		allowFork: boolean;
		disabled: boolean;
		copyDisabled: boolean;
		copied: boolean;
		onCopy: () => void;
		onFork: () => void;
		onRetry?: () => void;
	};

	let {
		role,
		allowRetry,
		allowFork,
		disabled,
		copyDisabled,
		copied,
		onCopy,
		onFork,
		onRetry
	}: Props = $props();
</script>

<!-- Design system: ghost icon-only actions, size-8, 12px icons, tooltips (docs/architecture/design-system.md §5). -->
<div
	class={cn(
		'flex flex-wrap items-center gap-0.5 pt-1',
		role === 'user' ? 'justify-end' : 'justify-start',
		'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100',
		'transition-opacity duration-150 motion-reduce:transition-none'
	)}
	role="toolbar"
	aria-label="Message actions"
>
	<Tooltip.Provider>
		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						type="button"
						variant="ghost"
						size="icon-lg"
						class="text-muted-foreground hover:text-foreground"
						disabled={copyDisabled}
						onclick={onCopy}
						aria-label={copyDisabled
							? 'Nothing to copy yet'
							: copied
								? 'Copied to clipboard'
								: 'Copy message text'}
					>
						{#if copied}
							<HugeiconsIcon icon={Tick02Icon} strokeWidth={2} class="size-3 shrink-0" />
						{:else}
							<HugeiconsIcon icon={ClipboardCopyIcon} strokeWidth={2} class="size-3 shrink-0" />
						{/if}
					</Button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content>
				<p class="text-xs">
					{copyDisabled ? 'Nothing to copy yet' : copied ? 'Copied' : 'Copy'}
				</p>
			</Tooltip.Content>
		</Tooltip.Root>

		{#if role === 'user' && allowRetry && onRetry}
			<Tooltip.Root>
				<Tooltip.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							type="button"
							variant="ghost"
							size="icon-lg"
							class="text-muted-foreground hover:text-foreground"
							disabled={disabled}
							onclick={onRetry}
							aria-label={disabled
								? 'Regenerate unavailable while the assistant is replying'
								: 'Regenerate: drop later turns and get a new assistant reply'}
						>
							<HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} class="size-3 shrink-0" />
						</Button>
					{/snippet}
				</Tooltip.Trigger>
				<Tooltip.Content>
					<p class="text-xs">Regenerate from here</p>
				</Tooltip.Content>
			</Tooltip.Root>
		{/if}

		{#if allowFork}
			<Tooltip.Root>
				<Tooltip.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							type="button"
							variant="ghost"
							size="icon-lg"
							class="text-muted-foreground hover:text-foreground"
							disabled={disabled}
							onclick={onFork}
							aria-label={disabled
								? 'Fork thread after signing in'
								: 'Fork thread: continue from this point in a new thread'}
						>
							<HugeiconsIcon icon={GitForkIcon} strokeWidth={2} class="size-3 shrink-0" />
						</Button>
					{/snippet}
				</Tooltip.Trigger>
				<Tooltip.Content>
					<p class="text-xs">Fork thread here</p>
				</Tooltip.Content>
			</Tooltip.Root>
		{/if}
	</Tooltip.Provider>
</div>
