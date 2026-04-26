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
		oldFileName = 'artifact.md',
		newFileName = 'artifact.md',
		compact = false,
		diffStyle = 'unified'
	}: {
		patch?: FileDiffMetadata;
		original?: string;
		modified?: string;
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

	function buildFallbackFiles() {
		if (original === undefined || modified === undefined) return null;

		const oldFile: FileContents = {
			name: oldFileName,
			contents: original
		};
		const newFile: FileContents = {
			name: newFileName,
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
		void oldFileName;
		void newFileName;
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
	class="artifact-diff-renderer flex min-h-0 flex-1 flex-col overflow-hidden"
>
	<div class="min-h-0 flex-1 overflow-auto" bind:this={containerEl}></div>
</div>

<style>
	.artifact-diff-renderer {
		min-height: 12rem;
	}
</style>
