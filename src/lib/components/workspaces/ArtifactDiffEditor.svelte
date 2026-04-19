<script lang="ts">
	import { EditorState } from '@codemirror/state'
	import { EditorView } from '@codemirror/view'
	import { MergeView } from '@codemirror/merge'
	import { markdown } from '@codemirror/lang-markdown'
	import { basicSetup } from 'codemirror'
	import { onDestroy } from 'svelte'

	let {
		original,
		modified,
		compact = false
	}: {
		original: string
		modified: string
		compact?: boolean
	} = $props()

	let parentEl = $state<HTMLDivElement | null>(null)
	let mergeView = $state<MergeView | null>(null)

	const mergeTheme = EditorView.theme({
		'&': {
			height: '100%',
			backgroundColor: 'var(--background)',
			color: 'var(--foreground)'
		},
		'.cm-mergeView': {
			height: '100%',
			overflow: 'auto'
		},
		'.cm-scroller': {
			fontFamily: 'var(--font-mono), ui-monospace, monospace'
		},
		'.cm-gutters': {
			backgroundColor: 'var(--muted)',
			borderRight: '1px solid var(--border)',
			color: 'var(--muted-foreground)'
		},
		'.cm-content': {
			padding: '0.5rem 0.625rem'
		},
		'.cm-line': {
			padding: '0'
		},
		'.cm-cursor, .cm-dropCursor': {
			borderLeftColor: 'var(--foreground)'
		},
		'.cm-selectionBackground, ::selection': {
			backgroundColor: 'var(--accent)'
		}
	})

	const sizeTheme = $derived(
		EditorView.theme({
			'.cm-content': {
				fontSize: compact ? '0.75rem' : '0.8125rem',
				lineHeight: compact ? '1.35' : '1.5'
			}
		})
	)

	const readOnlyExtensions = [
		EditorView.editable.of(false),
		EditorState.readOnly.of(true)
	]

	function buildExtensions() {
		return [
			basicSetup,
			markdown(),
			EditorView.lineWrapping,
			mergeTheme,
			sizeTheme,
			...readOnlyExtensions
		]
	}

	function mountMerge() {
		if (!parentEl) return
		mergeView?.destroy()
		mergeView = new MergeView({
			parent: parentEl,
			orientation: 'a-b',
			gutter: true,
			highlightChanges: true,
			collapseUnchanged: { margin: 3, minSize: 4 },
			a: {
				doc: original,
				extensions: buildExtensions()
			},
			b: {
				doc: modified,
				extensions: buildExtensions()
			}
		})
	}

	$effect(() => {
		void original
		void modified
		void compact
		if (!parentEl) return
		mountMerge()
		return () => {
			mergeView?.destroy()
			mergeView = null
		}
	})

	onDestroy(() => {
		mergeView?.destroy()
		mergeView = null
	})
</script>

<div
	class="artifact-diff-editor flex min-h-0 flex-1 flex-col rounded-md border border-border/60 bg-background outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
>
	<div
		class="flex shrink-0 items-center gap-3 border-b border-border/50 px-2 py-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase"
	>
		<span class="min-w-0 flex-1 truncate">Saved</span>
		<span class="min-w-0 flex-1 truncate">Proposed</span>
	</div>
	<div class="min-h-0 flex-1" bind:this={parentEl}></div>
</div>

<style>
	.artifact-diff-editor :global(.cm-mergeView) {
		min-height: 12rem;
	}
</style>
