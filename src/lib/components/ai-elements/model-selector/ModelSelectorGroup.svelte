<script lang="ts">
	import * as Command from '$lib/components/ui/command/index.js';
	import type { Command as CommandPrimitive } from 'bits-ui';
	import type { WithoutChildrenOrChild } from '$lib/utils.js';
	import type { Snippet } from 'svelte';

	let {
		ref = $bindable(null),
		heading,
		children,
		headingClass = 'px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground',
		...restProps
	}: WithoutChildrenOrChild<CommandPrimitive.GroupProps> & {
		children: Snippet;
		heading?: string;
		headingClass?: string;
	} = $props();
</script>

<Command.Group bind:ref {heading} {headingClass} {...restProps}>
	{@render children()}
</Command.Group>
