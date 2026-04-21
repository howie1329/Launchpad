<script lang="ts">
	import ArtifactCodeEditor from '$lib/components/workspaces/ArtifactCodeEditor.svelte';
	import { cn } from '$lib/utils';
	import githubDarkDefault from '@shikijs/themes/github-dark-default';
	import githubLightDefault from '@shikijs/themes/github-light-default';
	import { mode } from 'mode-watcher';
	import Code from 'svelte-streamdown/code';
	import MathRenderer from 'svelte-streamdown/math';
	import Mermaid from 'svelte-streamdown/mermaid';
	import { Streamdown, type StreamdownProps } from 'svelte-streamdown';

	let {
		artifactId,
		value,
		compact = false,
		readMode,
		saveError = '',
		onChange
	}: {
		artifactId: string;
		value: string;
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

	const streamdownTheme = $derived(
		mode.current === 'dark' ? 'github-dark-default' : 'github-light-default'
	);
</script>

<div class="min-h-0 flex-1">
	{#if readMode === 'editor'}
		<div class={compact ? 'min-h-[12rem]' : 'min-h-[18rem]'}>
			{#key artifactId}
				<ArtifactCodeEditor {value} readOnly={false} {compact} {onChange} />
			{/key}
		</div>
	{:else}
		<div class={cn('overflow-y-auto px-1 py-2', compact ? 'min-h-[12rem]' : 'min-h-[18rem]')}>
			{#if value.trim().length === 0}
				<p class="text-xs text-muted-foreground">Nothing to preview yet.</p>
			{:else}
				{#key artifactId}
					<div
						class={cn(
							'prose max-w-none prose-neutral dark:prose-invert',
							compact ? 'prose-sm text-xs leading-relaxed' : 'text-sm'
						)}
					>
						<Streamdown
							content={value}
							baseTheme="shadcn"
							components={streamdownComponents}
							shikiTheme={streamdownTheme}
							shikiThemes={{
								'github-light-default': githubLightDefault,
								'github-dark-default': githubDarkDefault
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
