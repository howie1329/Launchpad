<script lang="ts">
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
	import Button from "../controls/Button.svelte";
	import { Add01Icon } from "@hugeicons/core-free-icons";
	import { HugeiconsIcon } from "@hugeicons/svelte";

	interface Props {
		class?: string;
		children?: import("svelte").Snippet;
	}

	let { class: className, children, ...props }: Props = $props();
</script>

<DropdownMenu.Trigger>
	<Button class={className} {...props}>
		{#if children}
			{@render children()}
		{:else}
			<HugeiconsIcon icon={Add01Icon} strokeWidth={2} class="size-4" />
		{/if}
	</Button>
</DropdownMenu.Trigger>
