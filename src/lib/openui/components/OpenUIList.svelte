<script lang="ts">
	import type { ComponentRenderProps } from '@openuidev/svelte-lang';

	let { props }: ComponentRenderProps<{ items: string[]; ordered?: boolean }> = $props();
</script>

{#if props.ordered}
	<ol class="list-decimal space-y-1.5 pl-5 text-xs leading-5 marker:text-muted-foreground">
		{#each props.items as item, index (`${item}-${index}`)}<li>{item}</li>{/each}
	</ol>
{:else}
	<ul class="list-disc space-y-1.5 pl-5 text-xs leading-5 marker:text-muted-foreground">
		{#each props.items as item, index (`${item}-${index}`)}<li>{item}</li>{/each}
	</ul>
{/if}
