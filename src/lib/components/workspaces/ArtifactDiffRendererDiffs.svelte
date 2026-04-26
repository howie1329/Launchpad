<script lang="ts">
	import {
		FileDiff,
		parseDiffFromFile,
		type FileContents,
		type FileDiffMetadata
	} from '@pierre/diffs';
	import { mode } from 'mode-watcher';
	import { onDestroy } from 'svelte';

	let {
		patch,
		original,
		modified,
		compact = false,
		diffStyle = 'unified'
	}: {
		patch?: FileDiffMetadata;
		original?: string;
		modified?: string;
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
		disableFileHeader: true,
		disableLineNumbers: false,
		overflow: 'wrap' as const,
		lineDiffType: 'word' as const,
		collapsedContextThreshold: compact ? 4 : 8,
		expansionLineCount: compact ? 3 : 6
	});

	function buildFallbackFiles() {
		if (original === undefined || modified === undefined) return null;

		const oldFile: FileContents = {
			name: 'artifact.md',
			contents: original
		};
		const newFile: FileContents = {
			name: 'artifact.md',
			contents: modified
		};

		return { oldFile, newFile };
	}

	function buildFileDiffMetadata(
		fallbackFiles: { oldFile: FileContents; newFile: FileContents } | null
	) {
		if (patch) return patch;
		if (!fallbackFiles) return null;

		try {
			return parseDiffFromFile(fallbackFiles.oldFile, fallbackFiles.newFile, {
				context: compact ? 2 : 3
			});
		} catch (error) {
			console.error('Failed to parse artifact diff metadata', error);
			return null;
		}
	}

	function renderDiff() {
		if (!containerEl) return;

		fileDiff ??= new FileDiff(renderOptions);
		fileDiff.setOptions(renderOptions);

		const fallbackFiles = buildFallbackFiles();
		const fileDiffMetadata = buildFileDiffMetadata(fallbackFiles);
		fileDiff.render({
			...(fileDiffMetadata ? { fileDiff: fileDiffMetadata } : {}),
			fileContainer: containerEl
		});
	}

	$effect(() => {
		void patch;
		void original;
		void modified;
		void compact;
		void diffStyle;
		void themeType;
		if (!containerEl) return;
		renderDiff();
	});

	onDestroy(() => {
		fileDiff?.cleanUp();
		fileDiff = null;
	});
</script>

<div
	class="artifact-diff-renderer flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border/50 bg-background"
>
	<div class="min-h-0 flex-1 overflow-auto" bind:this={containerEl}></div>
</div>

<style>
	.artifact-diff-renderer {
		min-height: 12rem;
	}
	.artifact-diff-renderer :global(pre) {
		margin: 0;
	}
</style>
