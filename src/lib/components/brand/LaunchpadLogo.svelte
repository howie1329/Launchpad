<script lang="ts">
	import LaunchpadMark from './LaunchpadMark.svelte';

	let { showWordmark = true } = $props<{
		showWordmark?: boolean;
	}>();
</script>

<span class="inline-flex items-center gap-2 text-foreground">
	<LaunchpadMark class="size-7 shrink-0" />
	{#if showWordmark}
		<span class="text-xs font-semibold tracking-tight">Launchpad</span>
	{/if}
</span>
