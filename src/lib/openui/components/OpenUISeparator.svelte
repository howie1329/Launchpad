<script lang="ts">
	import type { ComponentRenderProps } from '@openuidev/svelte-lang';
	import { Separator } from '$lib/components/ui/separator';

	let {
		props
	}: ComponentRenderProps<{
		orientation?: 'horizontal' | 'vertical';
	}> = $props();
</script>

<Separator orientation={props.orientation ?? 'horizontal'} class="my-1" />
