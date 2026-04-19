<script lang="ts">
	import { Compartment, EditorState } from '@codemirror/state'
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
			backgroundColor: 'hsl(var(--background))',
			color: 'hsl(var(--foreground))'
		},
		'.cm-scroller': {
			overflow: 'auto',
			fontFamily: 'var(--font-mono, var(--font-sans))'
		},
		'.cm-content': {
			padding: '0.75rem 0.875rem'
		},
		'.cm-line': {
			padding: '0'
		},
		'.cm-focused': {
			outline: 'none'
		},
		'.cm-editor.cm-focused': {
			outline: 'none'
		},
		'.cm-cursor, .cm-dropCursor': {
			borderLeftColor: 'hsl(var(--foreground))'
		},
		'.cm-selectionBackground, ::selection': {
			backgroundColor: 'hsl(var(--accent))'
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
			}
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

<div class="artifact-code-editor" bind:this={editorElement}></div>
