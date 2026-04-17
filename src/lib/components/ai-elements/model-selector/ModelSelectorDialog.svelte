<script lang="ts">
	import * as Command from '$lib/components/ui/command/index.js';
	import type { Command as CommandPrimitive, Dialog as DialogPrimitive } from 'bits-ui';
	import type { WithoutChildrenOrChild } from '$lib/utils.js';
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		ref = $bindable(null),
		value = $bindable(''),
		title = 'Model Selector',
		description = 'Search for a model',
		portalProps,
		children,
		class: className,
		...restProps
	}: WithoutChildrenOrChild<DialogPrimitive.RootProps> &
		WithoutChildrenOrChild<CommandPrimitive.RootProps> & {
			portalProps?: DialogPrimitive.PortalProps;
			children: Snippet;
			title?: string;
			description?: string;
			class?: string;
		} = $props();
</script>

<Command.Dialog
	bind:open
	bind:ref
	bind:value
	{title}
	{description}
	{portalProps}
	class={className}
	{...restProps}
>
	{@render children()}
</Command.Dialog>
