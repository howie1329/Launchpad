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

	let {
		artifactId,
		title,
		value,
		contentFormat = 'markdown',
		compact = false,
		readMode,
		saveError = '',
		onChange
	}: {
		artifactId: string;
		title: string;
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
</script>

<div class="min-h-0 flex-1">
	<h1 class="sr-only">{title}</h1>
	{#if readMode === 'editor'}
		<div class={compact ? 'min-h-[12rem]' : 'min-h-[calc(100vh-9rem)]'}>
			<div class={compact ? 'px-1 pt-1' : 'mx-auto max-w-[48rem] px-5 pt-8 sm:px-8'}>
				<p class="text-xs text-muted-foreground">
					{formatLabel} source <span class="mx-1 text-border">·</span> Save with
					<kbd class="font-mono text-[11px] text-foreground/80">⌘S</kbd>
				</p>
			</div>
			{#key `${artifactId}-${contentFormat}`}
				<ArtifactCodeEditor {value} {contentFormat} readOnly={false} {compact} {onChange} />
			{/key}
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
		<article
			class={cn(
				'text-foreground',
				compact ? 'min-h-[12rem] px-1 py-2' : 'min-h-[calc(100vh-9rem)] px-5 py-12 sm:px-8 sm:py-16'
			)}
		>
			{#if value.trim().length === 0}
				<div class="mx-auto flex min-h-64 max-w-[46rem] items-center">
					<div>
						<p class="text-base font-medium tracking-tight text-foreground">This note is empty</p>
						<p class="mt-2 text-sm leading-6 text-muted-foreground">
							Switch to Edit when you are ready to write.
						</p>
					</div>
				</div>
			{:else}
				{#key artifactId}
					<div
						class="mx-auto prose prose-base max-w-[46rem] text-foreground prose-headings:text-balance prose-p:leading-7 prose-p:text-pretty"
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
		</article>
	{/if}
	{#if saveError}
		<p class="mt-2 text-xs text-destructive" role="status">{saveError}</p>
	{/if}
</div>
