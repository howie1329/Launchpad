<script lang="ts">
	import { getAttachmentsContext } from "../context/attachments.svelte.js";
	import ActionMenuItem from "./ActionMenuItem.svelte";
	import { Image01Icon } from "@hugeicons/core-free-icons";
	import { HugeiconsIcon } from "@hugeicons/svelte";
	import { cn } from "$lib/utils.js";

	interface Props {
		onSelect?: () => void;
		label?: string;
		class?: string;
	}

	let { onSelect, label = "Add photos or files", class: className, ...props }: Props = $props();

	let attachments = getAttachmentsContext();

	let handleSelect = (e: Event) => {
		e.preventDefault();
		onSelect?.();
		attachments.openFileDialog();
	};
</script>

<ActionMenuItem class={cn("gap-2", className)} onSelect={handleSelect} {...props}>
	<HugeiconsIcon icon={Image01Icon} strokeWidth={2} class="size-4" />
	{label}
</ActionMenuItem>
