<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import type { Dialog as DialogPrimitive } from 'bits-ui';
	import type { WithoutChildrenOrChild } from '$lib/utils.js';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		portalProps,
		showCloseButton = false,
		...restProps
	}: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
		children: Snippet;
		portalProps?: DialogPrimitive.PortalProps;
		showCloseButton?: boolean;
	} = $props();
</script>

<Dialog.Content
	bind:ref
	class={cn(
		'max-h-[min(70vh,28rem)] overflow-hidden rounded-lg border border-border/70 bg-popover p-0 text-popover-foreground shadow-none ring-0 outline-hidden! data-[state=open]:duration-200 data-[state=open]:[animation-timing-function:cubic-bezier(0.16,1,0.3,1)]',
		className
	)}
	{showCloseButton}
	{portalProps}
	{...restProps}
>
	<Command.Root
		class="min-h-0 flex-1 flex-col bg-transparent p-0 **:data-[slot=command-input-wrapper]:h-auto"
	>
		{@render children()}
	</Command.Root>
</Dialog.Content>
