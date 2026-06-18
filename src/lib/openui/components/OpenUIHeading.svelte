<script lang="ts">
	import type { ComponentRenderProps } from '@openuidev/svelte-lang';

	let { props }: ComponentRenderProps<{ text: string; level?: 2 | 3 | 4 }> = $props();
</script>

{#if props.level === 2}
	<h2 class="text-lg leading-tight font-semibold tracking-tight text-balance">{props.text}</h2>
{:else if props.level === 4}
	<h4 class="text-xs leading-5 font-semibold text-balance">{props.text}</h4>
{:else}
	<h3 class="text-sm leading-5 font-semibold tracking-tight text-balance">{props.text}</h3>
{/if}
