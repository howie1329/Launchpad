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
		expansionLineCount: compact ? 3 : 6,
		unsafeCSS: `
			:host {
				color: var(--foreground);
				--diffs-font-family-mono: var(--font-mono), ui-monospace, monospace;
				--diffs-font-family-sans: var(--font-sans), ui-sans-serif, sans-serif;
				--diffs-background: transparent;
				--diffs-border-color: color-mix(in srgb, var(--border) 60%, transparent);
				--diffs-bg-separator-override: color-mix(in srgb, var(--background) 88%, var(--muted));
				--diffs-fg-number-override: color-mix(in srgb, var(--muted-foreground) 85%, transparent);
				--diffs-radius: 0;
			}

			pre {
				font-size: ${compact ? '0.75rem' : '0.8125rem'};
				line-height: ${compact ? '1.35' : '1.5'};
				background: transparent;
			}

			[data-diffs='header'] {
				display: none;
			}

			button {
				font-size: 0.75rem;
				color: var(--muted-foreground);
				background: transparent;
			}

			[data-separator='line-info'],
			[data-separator='line-info-basic'] {
				font-size: 0.75rem;
				line-height: 1.25rem;
				color: var(--muted-foreground);
			}

			[data-separator-content] {
				display: inline-flex;
				align-items: center;
				gap: 0.375rem;
				min-height: 1.5rem;
				padding-inline: 0.5rem;
				border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
				border-radius: 0.375rem;
				background: color-mix(in srgb, var(--accent) 38%, transparent);
			}

			[data-unmodified-lines] {
				font-family: var(--font-sans), ui-sans-serif, sans-serif;
				letter-spacing: 0;
			}

			[data-expand-button],
			[data-utility-button] {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				color: var(--muted-foreground);
				fill: currentColor;
				border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
				border-radius: 0.375rem;
				background: color-mix(in srgb, var(--accent) 32%, transparent);
				transition: background-color 150ms ease, color 150ms ease;
			}

			[data-expand-button]:hover,
			[data-utility-button]:hover {
				color: var(--foreground);
				background: color-mix(in srgb, var(--accent) 55%, transparent);
			}

			[data-expand-button]:not([data-expand-all-button]),
			[data-utility-button] {
				width: 1.5rem;
				height: 1.5rem;
				padding: 0;
			}

			[data-expand-all-button] {
				width: auto;
				min-height: 1.5rem;
				padding-inline: 0.5rem;
				font-family: var(--font-sans), ui-sans-serif, sans-serif;
				font-size: 0.75rem;
				font-weight: 500;
			}

			[data-expand-button] [data-icon] {
				opacity: 0.85;
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

	function buildFileDiffMetadata(fallbackFiles: { oldFile: FileContents; newFile: FileContents } | null) {
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
