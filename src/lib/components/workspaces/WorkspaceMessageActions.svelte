<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import { ClipboardCopyIcon, GitForkIcon, Refresh01Icon } from '@hugeicons/core-free-icons';
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

<div
	class={cn(
		'flex flex-wrap items-center justify-end gap-1 pt-1',
		'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100',
		'transition-opacity duration-150'
	)}
	role="toolbar"
	aria-label="Message actions"
>
	<Button
		type="button"
		variant="ghost"
		size="sm"
		class="h-7 gap-1 px-2 text-[11px]"
		disabled={copyDisabled}
		onclick={onCopy}
		aria-label={copyDisabled
			? 'Nothing to copy yet'
			: copied
				? 'Copied to clipboard'
				: 'Copy message text'}
	>
		<HugeiconsIcon icon={ClipboardCopyIcon} strokeWidth={2} class="size-3.5 shrink-0" />
		{copied ? 'Copied' : 'Copy'}
	</Button>
	{#if role === 'user' && allowRetry && onRetry}
		<Button
			type="button"
			variant="ghost"
			size="sm"
			class="h-7 gap-1 px-2 text-[11px]"
			disabled={disabled}
			onclick={onRetry}
			aria-label={disabled
				? 'Regenerate unavailable while the assistant is replying'
				: 'Regenerate: drop later turns and get a new assistant reply'}
		>
			<HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} class="size-3.5 shrink-0" />
			Regenerate
		</Button>
	{/if}
	{#if allowFork}
		<Button
			type="button"
			variant="ghost"
			size="sm"
			class="h-7 gap-1 px-2 text-[11px]"
			disabled={disabled}
			onclick={onFork}
			aria-label={disabled
				? 'Fork thread after signing in'
				: 'Fork thread: continue from this point in a new thread'}
		>
			<HugeiconsIcon icon={GitForkIcon} strokeWidth={2} class="size-3.5 shrink-0" />
			Fork
		</Button>
	{/if}
</div>
