<script lang="ts" module>
	import { cn } from "$lib/utils";
	import type { ButtonProps } from "$lib/components/ui/button/index.js";

	export interface ConversationScrollButtonProps extends ButtonProps {}
</script>

<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
	import { HugeiconsIcon } from "@hugeicons/svelte";
	import { getStickToBottomContext } from "./stick-to-bottom-context.svelte.js";
	import { fly } from "svelte/transition";
	import { backOut } from "svelte/easing";

	let { class: className, onclick, ...restProps }: ConversationScrollButtonProps = $props();

	const context = getStickToBottomContext();

	const handleScrollToBottom = (event: MouseEvent) => {
		context.scrollToBottom();
		if (onclick) {
			onclick(
				event as MouseEvent & {
					currentTarget: EventTarget & HTMLButtonElement;
				}
			);
		}
	};
</script>

{#if !context.isAtBottom}
	<div
		in:fly={{
			duration: 300,
			y: 10,
			easing: backOut,
		}}
		out:fly={{
			duration: 200,
			y: 10,
			easing: backOut,
		}}
		class="absolute bottom-4 left-[50%] translate-x-[-50%]"
	>
		<Button
			class={cn(
				"border-border/70 bg-background/80 hover:bg-background/90 backdrop-blur-sm",
				className
			)}
			onclick={handleScrollToBottom}
			size="icon"
			type="button"
			variant="outline"
			{...restProps}
		>
			<HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} class="size-4" />
		</Button>
	</div>
{/if}
