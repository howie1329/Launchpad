<script lang="ts">
	import { FileDiff, type FileContents } from '@pierre/diffs';
	import type { ArtifactDraftPatch } from '$lib/artifacts';
	import { mode } from 'mode-watcher';
	import { onDestroy } from 'svelte';

	let {
		patch,
		original,
		modified,
		compact = false,
		diffStyle = 'unified'
	}: {
		patch?: ArtifactDraftPatch;
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
		disableLineNumbers: true,
		overflow: 'wrap' as const,
		lineDiffType: 'word' as const,
		expandUnchanged: true,
		collapsedContextThreshold: compact ? 4 : 8,
		expansionLineCount: compact ? 3 : 6,
		unsafeCSS: `
			:host {
				--diffs-font-family-mono: var(--font-mono), ui-monospace, monospace;
				--diffs-font-family-sans: inherit;
				--diffs-background: transparent;
				--diffs-border-color: color-mix(in srgb, var(--border) 75%, transparent);
				--diffs-radius: 0;
			}

			pre {
				font-size: ${compact ? '0.75rem' : '0.8125rem'};
				line-height: ${compact ? '1.35' : '1.5'};
			}

			[data-diffs='header'] {
				display: none;
			}
		`
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

	function renderDiff() {
		if (!containerEl) return;

		fileDiff ??= new FileDiff(renderOptions);
		fileDiff.setOptions(renderOptions);

		const fallbackFiles = buildFallbackFiles();
		fileDiff.render({
			fileDiff: patch,
			...(patch
				? {}
				: fallbackFiles
					? { oldFile: fallbackFiles.oldFile, newFile: fallbackFiles.newFile }
					: {}),
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
	class="artifact-diff-renderer flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border/60 bg-background"
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
