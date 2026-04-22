<script lang="ts">
	import { CollapsibleTrigger } from "$lib/components/ui/collapsible";
	import { cn } from "$lib/utils";
	import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
	import { HugeiconsIcon } from "@hugeicons/svelte";

	import type { Snippet } from "svelte";

	let {
		class: className,
		leftIcon,
		swapIconOnHover = true,
		children,
	}: {
		class?: string;
		leftIcon?: Snippet;
		swapIconOnHover?: boolean;
		children?: Snippet;
	} = $props();
</script>

<CollapsibleTrigger
	class={cn(
		"group text-muted-foreground hover:text-foreground flex w-full cursor-pointer items-center justify-start gap-1 text-sm transition-colors",
		className
	)}
>
	<div class="flex items-center gap-2">
		{#if leftIcon}
			<span class="relative inline-flex size-4 items-center justify-center">
				<span class={cn("transition-opacity", swapIconOnHover && "group-hover:opacity-0")}>
					{@render leftIcon()}
				</span>
				{#if swapIconOnHover}
					<HugeiconsIcon
						icon={ArrowDown01Icon}
						strokeWidth={2}
						class="absolute size-4 opacity-0 transition-opacity group-hover:opacity-100 group-data-[state=open]:rotate-180"
					/>
				{/if}
			</span>
		{/if}
		{#if children}
			<span>{@render children()}</span>
		{/if}
	</div>
	{#if !leftIcon}
		<HugeiconsIcon
			icon={ArrowDown01Icon}
			strokeWidth={2}
			class="size-4 transition-transform group-data-[state=open]:rotate-180"
		/>
	{/if}
</CollapsibleTrigger>
