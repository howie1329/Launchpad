<script lang="ts">
	import ArtifactCodeEditor from '$lib/components/workspaces/ArtifactCodeEditor.svelte';
	import ArtifactSandboxPreview from '$lib/components/workspaces/ArtifactSandboxPreview.svelte';
	import type { ArtifactContentFormat } from '$lib/artifacts';
	import { isCodeArtifactFormat } from '$lib/artifacts';
	import { getArtifactPreviewStreamdownTheme } from '$lib/streamdown/artifactPreviewTheme';
	import { cn } from '$lib/utils';
	import minDark from '@shikijs/themes/min-dark';
	import minLight from '@shikijs/themes/min-light';
	import { mode } from 'mode-watcher';
	import Code from 'svelte-streamdown/code';
	import MathRenderer from 'svelte-streamdown/math';
	import Mermaid from 'svelte-streamdown/mermaid';
	import { Streamdown, type StreamdownProps } from 'svelte-streamdown';

	type MarkdownHeading = {
		line: number;
		level: number;
		text: string;
	};

	let {
		artifactId,
		value,
		contentFormat = 'markdown',
		compact = false,
		readMode,
		saveError = '',
		onChange
	}: {
		artifactId: string;
		value: string;
		contentFormat?: ArtifactContentFormat;
		compact?: boolean;
		readMode: 'editor' | 'preview';
		saveError?: string;
		onChange: (nextValue: string) => void;
	} = $props();

	type StreamdownComponents = NonNullable<StreamdownProps['components']>;
	const streamdownComponents = {
		code: Code,
		mermaid: Mermaid,
		math: MathRenderer
	} satisfies StreamdownComponents;

	const streamdownTheme = $derived(mode.current === 'dark' ? 'min-dark' : 'min-light');

	const previewStreamdownTheme = $derived(getArtifactPreviewStreamdownTheme(compact));

	const formatLabel = $derived(
		contentFormat === 'markdown' ? 'Markdown' : contentFormat === 'html' ? 'HTML' : 'SVG'
	);

	let headings = $state<MarkdownHeading[]>([]);
	let outlineOpen = $state(true);
	let scrollToLine = $state<number | null>(null);

	const showOutline = $derived(
		contentFormat === 'markdown' && readMode === 'editor' && headings.length > 1 && !compact
	);

	function jumpToHeading(line: number) {
		scrollToLine = line;
		requestAnimationFrame(() => {
			scrollToLine = null;
		});
	}
</script>

<div class="min-h-0 flex-1 space-y-3">
	{#if readMode === 'editor'}
		<div class="flex items-center justify-between gap-3 px-1">
			<p class="text-xs leading-5 text-muted-foreground">
				Edit the {formatLabel.toLowerCase()} source. Use
				<kbd class="rounded border border-border px-1 py-0.5 font-mono text-[10px]">Cmd</kbd>
				or <kbd class="rounded border border-border px-1 py-0.5 font-mono text-[10px]">Ctrl</kbd> +
				<kbd class="rounded border border-border px-1 py-0.5 font-mono text-[10px]">S</kbd> to save.
			</p>
			{#if showOutline}
				<button
					type="button"
					class="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
					onclick={() => (outlineOpen = !outlineOpen)}
				>
					{outlineOpen ? 'Hide outline' : 'Show outline'}
				</button>
			{/if}
		</div>

		<div
			class={cn('grid min-h-0 gap-4', showOutline && outlineOpen ? 'lg:grid-cols-[1fr_14rem]' : '')}
		>
			<div class={compact ? 'min-h-[12rem]' : 'min-h-[calc(100vh-17rem)]'}>
				{#key `${artifactId}-${contentFormat}`}
					<ArtifactCodeEditor
						{value}
						{contentFormat}
						readOnly={false}
						{compact}
						{scrollToLine}
						onHeadingsChange={(nextHeadings) => (headings = nextHeadings)}
						{onChange}
					/>
				{/key}
			</div>
			{#if showOutline && outlineOpen}
				<aside class="hidden min-h-0 border-l border-border/60 pl-4 lg:block">
					<div class="sticky top-0 max-h-[calc(100vh-12rem)] overflow-y-auto py-1">
						<p class="mb-2 text-xs font-medium text-muted-foreground">Outline</p>
						<div class="space-y-0.5">
							{#each headings as heading (`${heading.line}-${heading.text}`)}
								<button
									type="button"
									class="block w-full truncate rounded-sm px-2 py-1 text-left text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
									style={`padding-left: ${Math.min(heading.level - 1, 3) * 0.75 + 0.5}rem`}
									onclick={() => jumpToHeading(heading.line)}
								>
									{heading.text}
								</button>
							{/each}
						</div>
					</div>
				</aside>
			{/if}
		</div>
	{:else if isCodeArtifactFormat(contentFormat)}
		{#if value.trim().length === 0}
			<div
				class={cn(
					'flex items-center justify-center rounded-lg border border-border/70 bg-background text-center',
					compact ? 'min-h-[12rem] px-4 py-3' : 'min-h-[calc(100vh-16rem)] px-5 py-6'
				)}
			>
				<div>
					<p class="text-sm font-medium text-foreground">Nothing to preview yet</p>
					<p class="mt-1 text-xs leading-5 text-muted-foreground">
						Switch to Edit and add {formatLabel} to build this artifact.
					</p>
				</div>
			</div>
		{:else}
			{#key `${artifactId}-${contentFormat}`}
				<ArtifactSandboxPreview
					content={value}
					{contentFormat}
					{compact}
					title={`${formatLabel} preview`}
				/>
			{/key}
		{/if}
	{:else}
		<div
			class={cn(
				'overflow-y-auto rounded-lg border border-border/70 bg-background text-foreground',
				compact ? 'min-h-[12rem] px-4 py-3' : 'min-h-[calc(100vh-16rem)] px-5 py-6'
			)}
		>
			{#if value.trim().length === 0}
				<div class="flex min-h-48 items-center justify-center text-center">
					<div>
						<p class="text-sm font-medium text-foreground">Nothing to preview yet</p>
						<p class="mt-1 text-xs leading-5 text-muted-foreground">
							Switch to Edit and add markdown to build this artifact.
						</p>
					</div>
				</div>
			{:else}
				{#key artifactId}
					<div
						class="mx-auto prose prose-sm max-w-3xl text-foreground prose-headings:text-balance prose-p:text-pretty"
					>
						<Streamdown
							content={value}
							baseTheme="shadcn"
							theme={previewStreamdownTheme}
							components={streamdownComponents}
							shikiTheme={streamdownTheme}
							mermaidConfig={{
								securityLevel: 'loose',
								theme: 'default',
								themeVariables: {
									primaryTextColor: 'var(--foreground)',
									secondaryTextColor: 'var(--muted-foreground)',
									lineColor: 'var(--border)',
									primaryColor: 'var(--muted)',
									background: 'var(--background)'
								}
							}}
							shikiThemes={{
								'min-light': minLight,
								'min-dark': minDark
							}}
						/>
					</div>
				{/key}
			{/if}
		</div>
	{/if}
	{#if saveError}
		<p class="mt-2 text-xs text-destructive" role="status">{saveError}</p>
	{/if}
</div>
