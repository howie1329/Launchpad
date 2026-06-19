<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import type { OpenUIFallbackReason } from './response';

	let {
		reason,
		readableText,
		source,
		onRetry
	}: {
		reason: OpenUIFallbackReason;
		readableText: string;
		source: string;
		onRetry?: () => void | Promise<void>;
	} = $props();

	let showSource = $state(false);

	const reasonLabel = $derived(
		({
			no_root: 'The response did not start with a valid root layout.',
			oversized: 'The response was too large to render.',
			unsafe_statements: 'The response included unsupported data operations.',
			unresolved_refs: 'The response had unresolved component references.',
			parse_failed: 'The response could not be parsed as OpenUI Lang.'
		})[reason]
	);
</script>

<section
	class="w-full min-w-0 rounded-md border border-border/70 bg-card/60 p-3"
	aria-label="OpenUI render fallback"
>
	<p class="text-xs font-medium text-foreground">Couldn’t render this as interactive UI</p>
	<p class="mt-1 text-[11px] leading-4 text-muted-foreground">{reasonLabel}</p>

	{#if readableText}
		<div class="mt-3 rounded-md border border-border/50 bg-background/80 p-2.5">
			<p class="text-xs leading-relaxed whitespace-pre-wrap">{readableText}</p>
		</div>
	{/if}

	<div class="mt-3 flex flex-wrap items-center gap-2">
		{#if onRetry}
			<Button type="button" size="sm" variant="secondary" onclick={() => void onRetry()}>
				Retry
			</Button>
		{/if}
		<Collapsible.Root bind:open={showSource}>
			<Collapsible.Trigger
				class="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
			>
				{showSource ? 'Hide source' : 'Show source'}
			</Collapsible.Trigger>
			<Collapsible.Content>
				<pre
					class="mt-2 max-h-48 overflow-auto rounded-md border border-border/50 bg-muted/30 p-2 text-[10px] leading-4 whitespace-pre-wrap text-muted-foreground"
				>{source}</pre>
			</Collapsible.Content>
		</Collapsible.Root>
	</div>
</section>
