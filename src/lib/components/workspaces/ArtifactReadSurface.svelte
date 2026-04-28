<script lang="ts">
	import ArtifactCodeEditor from '$lib/components/workspaces/ArtifactCodeEditor.svelte';
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
		compact = false,
		readMode,
		saveState = 'saved',
		saveError = '',
		onChange
	}: {
		artifactId: string;
		value: string;
		compact?: boolean;
		readMode: 'editor' | 'preview';
		saveState?: 'clean' | 'dirty' | 'saving' | 'saved';
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

	let headings = $state<MarkdownHeading[]>([]);
	let outlineOpen = $state(true);
	let scrollToLine = $state<number | null>(null);

	const showOutline = $derived(readMode === 'editor' && headings.length > 1 && !compact);
	const saveStateLabel = $derived.by(() => {
		if (saveError) return 'Save failed';
		if (saveState === 'saving') return 'Saving...';
		if (saveState === 'dirty') return 'Unsaved changes';
		return 'Saved';
	});

	function jumpToHeading(line: number) {
		scrollToLine = line;
		requestAnimationFrame(() => {
			scrollToLine = null;
		});
	}
</script>

<div class="min-h-0 flex-1 space-y-2">
	{#if readMode === 'editor'}
		<div class="flex items-center justify-between gap-3 px-1">
			<p
				class={cn(
					'text-xs',
					saveError
						? 'text-destructive'
						: saveState === 'dirty'
							? 'text-foreground'
							: 'text-muted-foreground'
				)}
			>
				{saveStateLabel}
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
			<div class={compact ? 'min-h-[12rem]' : 'min-h-[24rem]'}>
				{#key artifactId}
					<ArtifactCodeEditor
						{value}
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
	{:else}
		<div
			class={cn(
				'overflow-y-auto bg-background px-4 py-3 text-foreground',
				compact ? 'min-h-[12rem]' : 'min-h-[18rem]'
			)}
		>
			{#if value.trim().length === 0}
				<p class="text-xs text-muted-foreground">Nothing to preview yet.</p>
			{:else}
				{#key artifactId}
					<div class="prose max-w-none text-foreground">
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
		<p class="mt-2 text-xs text-destructive">{saveError}</p>
	{/if}
</div>
