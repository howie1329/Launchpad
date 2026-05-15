<script lang="ts">
	import { cn } from '$lib/utils';
	import { ElementSize } from 'runed';
	import { getAttachmentsContext } from '../context/attachments.svelte.js';
	import type { PromptInputAttachment } from '../context/types.js';

	interface Props {
		class?: string;
		children?: import('svelte').Snippet<[PromptInputAttachment]>;
	}

	let { class: className, children, ...props }: Props = $props();

	let attachmentsContext = getAttachmentsContext();
	let contentRef = $state<HTMLDivElement | null>(null);
	let contentSize = new ElementSize(() => contentRef);

	// Separate files and images for grouped rendering
	let nonImageFiles = $derived(
		attachmentsContext.attachments.filter(
			(f) => !(f.mediaType?.startsWith('image/') && (f.previewUrl ?? f.remoteUrl))
		)
	);

	let imageFiles = $derived(
		attachmentsContext.attachments.filter(
			(f) => f.mediaType?.startsWith('image/') && (f.previewUrl ?? f.remoteUrl)
		)
	);

	let computedHeight = $derived.by(() => {
		return attachmentsContext.attachments.length ? contentSize.height : 0;
	});
</script>

<div
	aria-live="polite"
	class={cn('overflow-hidden transition-[height] duration-200 ease-out', className)}
	style:height="{computedHeight}px"
	{...props}
>
	<div class="space-y-2 px-1 py-1" bind:this={contentRef}>
		<!-- Non-image files first -->
		{#if nonImageFiles.length > 0}
			<div class="flex flex-wrap gap-2">
				{#each nonImageFiles as file (file.id)}
					{#if children}
						{@render children(file)}
					{/if}
				{/each}
			</div>
		{/if}

		<!-- Images second -->
		{#if imageFiles.length > 0}
			<div class="flex flex-wrap gap-2">
				{#each imageFiles as file (file.id)}
					{#if children}
						{@render children(file)}
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</div>
