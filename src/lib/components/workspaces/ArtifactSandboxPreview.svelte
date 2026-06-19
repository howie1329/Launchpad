<script lang="ts">
	import {
		ARTIFACT_SANDBOX_ERROR,
		ARTIFACT_SANDBOX_READY,
		ARTIFACT_SANDBOX_RESIZE,
		buildArtifactSandboxDocument
	} from '$lib/artifact-sandbox';
	import type { ArtifactContentFormat } from '$lib/artifacts';
	import { cn } from '$lib/utils';
	import { onMount } from 'svelte';

	let {
		content,
		contentFormat,
		compact = false,
		title = 'Artifact preview'
	}: {
		content: string;
		contentFormat: Extract<ArtifactContentFormat, 'html' | 'svg'>;
		compact?: boolean;
		title?: string;
	} = $props();

	let iframeEl = $state<HTMLIFrameElement | null>(null);
	let frameHeight = $state(320);
	let frameError = $state('');
	let frameReady = $state(false);

	const initialHeight = $derived(compact ? 192 : 320);

	const srcdoc = $derived(buildArtifactSandboxDocument(content, contentFormat));

	function handleMessage(event: MessageEvent) {
		if (!iframeEl?.contentWindow || event.source !== iframeEl.contentWindow) return;
		const data = event.data;
		if (!data || typeof data !== 'object' || !('type' in data)) return;

		if (data.type === ARTIFACT_SANDBOX_RESIZE && typeof data.height === 'number') {
			frameHeight = Math.min(Math.max(data.height, compact ? 120 : 160), compact ? 720 : 1200);
			return;
		}
		if (data.type === ARTIFACT_SANDBOX_ERROR && typeof data.message === 'string') {
			frameError = data.message;
			return;
		}
		if (data.type === ARTIFACT_SANDBOX_READY) {
			frameReady = true;
		}
	}

	onMount(() => {
		window.addEventListener('message', handleMessage);
		return () => window.removeEventListener('message', handleMessage);
	});

	$effect(() => {
		void content;
		void contentFormat;
		frameError = '';
		frameReady = false;
		frameHeight = initialHeight;
	});
</script>

<div class={cn('space-y-2', compact ? '' : 'min-h-[12rem]')}>
	{#if frameError}
		<div
			class="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
			role="alert"
		>
			<p class="font-medium">Preview error</p>
			<p class="mt-1 text-xs leading-5 text-destructive/90">{frameError}</p>
		</div>
	{/if}

	<div
		class={cn(
			'overflow-hidden rounded-lg border border-border/70 bg-background',
			!frameReady && !frameError ? 'animate-pulse' : ''
		)}
	>
		<iframe
			bind:this={iframeEl}
			{title}
			class="block w-full border-0 bg-background"
			style={`height: ${frameHeight}px;`}
			sandbox="allow-scripts allow-popups"
			{srcdoc}
		></iframe>
	</div>
</div>
