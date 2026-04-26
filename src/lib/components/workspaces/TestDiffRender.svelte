<script lang="ts">
	import { FileDiff, type FileContents } from '@pierre/diffs';
	import { onDestroy } from 'svelte';
	let {
		originalContents,
		modifiedContents
	}: { originalContents: string; modifiedContents: string } = $props();
	let container = $state<HTMLDivElement | null>(null);
	const instance = new FileDiff({
		theme: { dark: 'pierre-dark', light: 'pierre-light' },
		diffStyle: 'unified'
	});
	const oldFile = $derived<FileContents>({ name: 'example.ts', contents: originalContents });
	const newFile = $derived<FileContents>({ name: 'example.ts', contents: modifiedContents });
	$effect(() => {
		if (!container) return;
		void originalContents;
		void modifiedContents;
		instance.render({
			oldFile,
			newFile,
			containerWrapper: container
		});
	});
	onDestroy(() => {
		instance.cleanUp();
	});
</script>

<div class="min-h-0 flex-1 overflow-auto" bind:this={container}></div>
