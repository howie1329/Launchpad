<script lang="ts">
	import type { ComponentRenderProps } from '@openuidev/svelte-lang';
	import { MessageResponse } from '$lib/components/ai-elements/new-message';

	let { props }: ComponentRenderProps<{ content: string; muted?: boolean }> = $props();
</script>

<MessageResponse
	content={props.content}
	class={props.muted ? 'text-sm leading-6 text-muted-foreground' : 'text-sm leading-6'}
/>
