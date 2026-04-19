<script lang="ts">
	import { Compartment, EditorState, Transaction } from '@codemirror/state'
	import { EditorView, type ViewUpdate } from '@codemirror/view'
	import { markdown } from '@codemirror/lang-markdown'
	import { basicSetup } from 'codemirror'
	import { onDestroy, onMount } from 'svelte'

	let {
		value,
		readOnly = true,
		compact = false,
		onChange
	}: {
		value: string
		readOnly?: boolean
		compact?: boolean
		onChange?: (nextValue: string) => void
	} = $props()

	let editorElement = $state<HTMLDivElement | null>(null)
	let view = $state<EditorView | null>(null)

	const editableCompartment = new Compartment()
	const readOnlyCompartment = new Compartment()
	const sizeCompartment = new Compartment()

	const editorTheme = EditorView.theme({
		'&': {
			height: '100%',
			backgroundColor: 'var(--background)',
			color: 'var(--foreground)'
		},
		'.cm-scroller': {
			overflow: 'auto',
			fontFamily: 'var(--font-mono), ui-monospace, monospace'
		},
		'.cm-gutters': {
			backgroundColor: 'var(--muted)',
			borderRight: '1px solid var(--border)',
			color: 'var(--muted-foreground)'
		},
		'.cm-lineNumbers .cm-gutterElement': {
			padding: '0 0.375rem 0 0.5rem',
			minWidth: '2.25rem'
		},
		'.cm-content': {
			padding: '0.75rem 0.875rem'
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

	const createSizeTheme = (isCompact: boolean) =>
		EditorView.theme({
			'.cm-content': {
				fontSize: isCompact ? '0.75rem' : '0.8125rem',
				lineHeight: isCompact ? '1.35' : '1.5'
			}
		})

	onMount(() => {
		if (!editorElement) return

		view = new EditorView({
			parent: editorElement,
			state: EditorState.create({
				doc: value,
				extensions: [
					basicSetup,
					markdown(),
					EditorView.lineWrapping,
					editorTheme,
					sizeCompartment.of(createSizeTheme(compact)),
					editableCompartment.of(EditorView.editable.of(!readOnly)),
					readOnlyCompartment.of(EditorState.readOnly.of(readOnly)),
					EditorView.updateListener.of((update: ViewUpdate) => {
						if (!update.docChanged) return
						const fromRemote = update.transactions.some((tr) =>
							tr.annotation(Transaction.userEvent)?.startsWith('remote')
						)
						if (fromRemote) return
						onChange?.(update.state.doc.toString())
					})
				]
			})
		})
	})

	onDestroy(() => {
		view?.destroy()
		view = null
	})

	$effect(() => {
		if (!view) return
		const currentValue = view.state.doc.toString()
		if (currentValue === value) return

		view.dispatch({
			changes: {
				from: 0,
				to: currentValue.length,
				insert: value
			},
			annotations: Transaction.userEvent.of('remote.sync')
		})
	})

	$effect(() => {
		if (!view) return

		view.dispatch({
			effects: [
				editableCompartment.reconfigure(EditorView.editable.of(!readOnly)),
				readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly)),
				sizeCompartment.reconfigure(createSizeTheme(compact))
			]
		})
	})
</script>

<div
	class="artifact-code-editor rounded-md outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
	bind:this={editorElement}
></div>

<style>
	.artifact-code-editor {
		height: 100%;
		min-height: 0;
	}
</style>
