<script lang="ts">
	import { FileDiff, parseDiffFromFile, type FileContents } from '@pierre/diffs';
	import { mode } from 'mode-watcher';
	import { onDestroy } from 'svelte';

	let {
		original,
		modified,
		oldFileName = 'artifact.md',
		newFileName = 'artifact.md',
		compact = false,
		diffStyle = 'unified'
	}: {
		original: string;
		modified: string;
		oldFileName?: string;
		newFileName?: string;
		compact?: boolean;
		diffStyle?: 'unified' | 'split';
	} = $props();

	let containerEl = $state<HTMLDivElement | null>(null);
	let fileDiff = $state<FileDiff | null>(null);

	const themeType = $derived.by<'dark' | 'light'>(() =>
		mode.current === 'dark' ? 'dark' : 'light'
	);
	const renderOptions = $derived({
		diffStyle,
		theme: {
			light: 'pierre-light',
			dark: 'pierre-dark'
		},
		themeType,
		disableFileHeader: false,
		disableLineNumbers: false,
		diffIndicators: 'bars' as const,
		hunkSeparators: 'line-info' as const,
		overflow: 'scroll' as const,
		lineDiffType: 'word-alt' as const,
		collapsedContextThreshold: compact ? 4 : 8,
		expansionLineCount: compact ? 3 : 6
	});

	const oldFile = $derived<FileContents>({
		name: oldFileName,
		contents: original,
		lang: 'markdown'
	});
	const newFile = $derived<FileContents>({
		name: newFileName,
		contents: modified,
		lang: 'markdown'
	});
	const parsedDiff = $derived(
		parseDiffFromFile(
			oldFile,
			newFile,
			{
				context: compact ? 2 : 3
			},
			true
		)
	);

	function renderDiff() {
		if (!containerEl) return;
		fileDiff ??= new FileDiff(renderOptions);
		fileDiff.setOptions(renderOptions);

		fileDiff.render({
			fileDiff: parsedDiff,
			containerWrapper: containerEl
		});
	}

	$effect(() => {
		void original;
		void modified;
		void oldFileName;
		void newFileName;
		void compact;
		void diffStyle;
		void themeType;
		void parsedDiff;
		if (!containerEl) return;
		renderDiff();
	});

	onDestroy(() => {
		fileDiff?.cleanUp();
		fileDiff = null;
	});
</script>

<div
	class="artifact-diff-renderer flex min-h-0 flex-1 flex-col overflow-hidden"
>
	<div class="min-h-0 flex-1 overflow-auto" bind:this={containerEl}></div>
</div>

<style>
	.artifact-diff-renderer {
		min-height: 12rem;
	}
</style>
