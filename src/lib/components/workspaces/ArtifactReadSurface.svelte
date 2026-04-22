<script lang="ts">
	import ArtifactCodeEditor from '$lib/components/workspaces/ArtifactCodeEditor.svelte'
	import { getArtifactPreviewStreamdownTheme } from '$lib/streamdown/artifactPreviewTheme'
	import { cn } from '$lib/utils'
	import minDark from '@shikijs/themes/min-dark'
	import minLight from '@shikijs/themes/min-light'
	import { mode } from 'mode-watcher'
	import Code from 'svelte-streamdown/code'
	import MathRenderer from 'svelte-streamdown/math'
	import Mermaid from 'svelte-streamdown/mermaid'
	import { Streamdown, type StreamdownProps } from 'svelte-streamdown'

	let {
		artifactId,
		value,
		compact = false,
		readMode,
		saveError = '',
		onChange
	}: {
		artifactId: string
		value: string
		compact?: boolean
		readMode: 'editor' | 'preview'
		saveError?: string
		onChange: (nextValue: string) => void
	} = $props()

	type StreamdownComponents = NonNullable<StreamdownProps['components']>
	const streamdownComponents = {
		code: Code,
		mermaid: Mermaid,
		math: MathRenderer
	} satisfies StreamdownComponents

	const streamdownTheme = $derived(mode.current === 'dark' ? 'min-dark' : 'min-light')

	const previewStreamdownTheme = $derived(getArtifactPreviewStreamdownTheme(compact))
</script>

<div class="min-h-0 flex-1">
	{#if readMode === 'editor'}
		<div class={compact ? 'min-h-[12rem]' : 'min-h-[18rem]'}>
			{#key artifactId}
				<ArtifactCodeEditor {value} readOnly={false} {compact} {onChange} />
			{/key}
		</div>
	{:else}
		<div
			class={cn(
				'bg-background text-foreground overflow-y-auto px-4 py-3',
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
