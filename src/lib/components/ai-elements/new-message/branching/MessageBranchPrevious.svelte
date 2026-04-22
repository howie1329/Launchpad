<script lang="ts">
	import { Button, type ButtonProps } from "$lib/components/ui/button/index.js";
	import { cn } from "$lib/utils";
	import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
	import { HugeiconsIcon } from "@hugeicons/svelte";
	import type { Snippet } from "svelte";
	import { getMessageBranchContext } from "../context/message-context.svelte.js";

	type MessageButtonProps = Omit<ButtonProps, "children" | "type" | "href">;

	type Props = MessageButtonProps & {
		class?: string;
		children?: Snippet;
	};

	let { class: className, children, ...restProps }: Props = $props();

	const branchContext = getMessageBranchContext();

	const isDisabled = $derived(branchContext.totalBranches <= 1);
</script>

<Button
	aria-label="Previous branch"
	disabled={isDisabled}
	onclick={() => branchContext.goToPrevious()}
	size="icon"
	type="button"
	variant="ghost"
	class={cn("size-7", className)}
	{...restProps}
>
	{#if children}
		{@render children()}
	{:else}
		<HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} class="size-3.5" />
	{/if}
</Button>
