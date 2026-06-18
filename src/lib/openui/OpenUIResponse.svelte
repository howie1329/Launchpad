<script lang="ts">
	import { MessageResponse } from '$lib/components/ai-elements/new-message';
	import { Renderer, type ActionEvent } from '@openuidev/svelte-lang';
	import { library } from './library';
	import { classifyOpenUIResponse, openUIActionMessage } from './response';

	let {
		response,
		isStreaming = false,
		onSend
	}: {
		response: string;
		isStreaming?: boolean;
		onSend: (message: string) => void | Promise<void>;
	} = $props();

	const classification = $derived(classifyOpenUIResponse(response, { isStreaming }));

	function handleAction(event: ActionEvent) {
		const message = openUIActionMessage(event);
		if (message) void onSend(message);
	}
</script>

{#if classification.kind === 'openui'}
	<div class="w-full min-w-0" data-openui-response>
		<Renderer {response} {library} {isStreaming} onAction={handleAction} />
	</div>
{:else if classification.kind === 'openui-pending'}
	<p class="text-xs leading-relaxed text-muted-foreground" aria-live="polite">
		Building response...
	</p>
{:else if classification.kind === 'markdown'}
	<MessageResponse content={response} class="text-xs leading-relaxed" />
{/if}
