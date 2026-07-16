<script lang="ts">
	import { MessageResponse } from '$lib/components/ai-elements/new-message';
	import { Renderer, type ActionEvent } from '@openuidev/svelte-lang';
	import OpenUIFallbackPanel from './OpenUIFallbackPanel.svelte';
	import OpenUIStreamingShell from './OpenUIStreamingShell.svelte';
	import { library } from './library';
	import {
		classifyOpenUIResponse,
		extractFallbackReadableText,
		openUIActionMessage
	} from './response';

	let {
		response,
		isStreaming = false,
		onSend,
		onRetry,
		reducedMotion = false
	}: {
		response: string;
		isStreaming?: boolean;
		onSend: (message: string) => void | Promise<void>;
		onRetry?: () => void | Promise<void>;
		reducedMotion?: boolean;
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
	<OpenUIStreamingShell {reducedMotion} />
{:else if classification.kind === 'fallback'}
	<OpenUIFallbackPanel
		reason={classification.fallbackReason ?? 'parse_failed'}
		readableText={extractFallbackReadableText(response)}
		source={response}
		{onRetry}
	/>
{:else if classification.kind === 'markdown'}
	<MessageResponse content={response} class="text-sm leading-6" />
{/if}
