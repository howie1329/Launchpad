<script lang="ts">
	import {
		closeBrackets,
		autocompletion,
		closeBracketsKeymap,
		completionKeymap
	} from '@codemirror/autocomplete';
	import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
	import { markdown } from '@codemirror/lang-markdown';
	import {
		bracketMatching,
		foldKeymap,
		HighlightStyle,
		indentOnInput,
		syntaxHighlighting
	} from '@codemirror/language';
	import { lintKeymap } from '@codemirror/lint';
	import { tags } from '@lezer/highlight';
	import { Compartment, EditorState, Transaction } from '@codemirror/state';
	import {
		EditorView,
		crosshairCursor,
		drawSelection,
		dropCursor,
		highlightSpecialChars,
		keymap,
		rectangularSelection,
		type ViewUpdate
	} from '@codemirror/view';
	import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
	import { onDestroy, onMount } from 'svelte';

	/** Design-token markdown / common Lezer tag styling (replaces default rainbow). */
	const artifactHighlightStyle = HighlightStyle.define(
		[
			{ tag: tags.meta, color: 'var(--muted-foreground)' },
			{ tag: tags.comment, color: 'var(--muted-foreground)' },
			{ tag: tags.documentMeta, color: 'var(--muted-foreground)' },
			{
				tag: [
					tags.heading,
					tags.heading1,
					tags.heading2,
					tags.heading3,
					tags.heading4,
					tags.heading5,
					tags.heading6
				],
				color: 'var(--foreground)',
				fontWeight: '600'
			},
			{ tag: tags.list, color: 'var(--foreground)' },
			{ tag: tags.quote, color: 'var(--muted-foreground)' },
			{ tag: tags.link, color: 'var(--primary)', textDecoration: 'underline' },
			{ tag: [tags.url, tags.labelName], color: 'var(--primary)' },
			{ tag: tags.emphasis, color: 'var(--foreground)', fontStyle: 'italic' },
			{ tag: tags.strong, color: 'var(--foreground)', fontWeight: '600' },
			{ tag: tags.strikethrough, color: 'var(--muted-foreground)', textDecoration: 'line-through' },
			{ tag: tags.deleted, color: 'var(--muted-foreground)', textDecoration: 'line-through' },
			{ tag: tags.monospace, color: 'var(--foreground)' },
			{ tag: tags.keyword, color: 'var(--foreground)', fontWeight: '500' },
			{
				tag: [tags.atom, tags.bool, tags.contentSeparator, tags.unit, tags.self, tags.null],
				color: 'var(--muted-foreground)'
			},
			{
				tag: [tags.literal, tags.string, tags.inserted, tags.className, tags.macroName],
				color: 'var(--foreground)'
			},
			{
				tag: [tags.regexp, tags.escape, tags.special(tags.string)],
				color: 'var(--muted-foreground)'
			},
			{ tag: [tags.typeName, tags.namespace], color: 'var(--muted-foreground)' },
			{ tag: tags.variableName, color: 'var(--foreground)' },
			{ tag: tags.propertyName, color: 'var(--foreground)' },
			{ tag: tags.local(tags.variableName), color: 'var(--foreground)' },
			{ tag: tags.function(tags.variableName), color: 'var(--foreground)' },
			{ tag: tags.special(tags.variableName), color: 'var(--foreground)' },
			{ tag: tags.definition(tags.variableName), color: 'var(--foreground)' },
			{ tag: tags.definition(tags.propertyName), color: 'var(--foreground)' },
			{
				tag: [
					tags.punctuation,
					tags.separator,
					tags.bracket,
					tags.angleBracket,
					tags.squareBracket,
					tags.paren,
					tags.brace,
					tags.operator
				],
				color: 'var(--muted-foreground)'
			},
			{ tag: [tags.tagName, tags.attributeName, tags.attributeValue], color: 'var(--foreground)' },
			{ tag: tags.invalid, color: 'var(--destructive)' }
		],
		{ all: { color: 'var(--foreground)' } }
	);

	/**
	 * Same role as `basicSetup` from the `codemirror` package, but without
	 * line numbers, the active-line gutter, or the fold gutter (the left
	 * column with line numbers and chevrons).
	 */
	const artifactEditorSetup = /* @__PURE__ */ (() => [
		highlightSpecialChars(),
		history(),
		drawSelection(),
		dropCursor(),
		EditorState.allowMultipleSelections.of(true),
		indentOnInput(),
		syntaxHighlighting(artifactHighlightStyle),
		bracketMatching(),
		closeBrackets(),
		autocompletion(),
		rectangularSelection(),
		crosshairCursor(),
		highlightSelectionMatches(),
		keymap.of([
			...closeBracketsKeymap,
			...defaultKeymap,
			...searchKeymap,
			...historyKeymap,
			...foldKeymap,
			...completionKeymap,
			...lintKeymap
		])
	])();

	let {
		value,
		readOnly = true,
		compact = false,
		onChange
	}: {
		value: string;
		readOnly?: boolean;
		compact?: boolean;
		onChange?: (nextValue: string) => void;
	} = $props();

	let editorElement = $state<HTMLDivElement | null>(null);
	let view = $state<EditorView | null>(null);

	const editableCompartment = new Compartment();
	const readOnlyCompartment = new Compartment();
	const sizeCompartment = new Compartment();

	const editorTheme = EditorView.theme({
		'&': {
			height: '100%',
			backgroundColor: 'var(--background)',
			color: 'var(--foreground)'
		},
		'.cm-scroller': {
			overflow: 'auto',
			fontFamily: 'var(--font-mono)'
		},
		'.cm-content': {
			padding: '0.75rem 1rem'
		},
		'.cm-line': {
			padding: '0'
		},
		'.cm-cursor, .cm-dropCursor': {
			borderLeftColor: 'var(--foreground)'
		},
		'.cm-selectionBackground': {
			background: 'color-mix(in oklch, var(--primary) 18%, var(--background) 82%)'
		},
		'.cm-content ::selection': {
			background: 'color-mix(in oklch, var(--primary) 18%, var(--background) 82%)'
		},
		'&.cm-focused .cm-matchingBracket': {
			backgroundColor: 'color-mix(in oklch, var(--primary) 20%, transparent)'
		},
		'&.cm-focused .cm-nonmatchingBracket': {
			backgroundColor: 'color-mix(in oklch, var(--destructive) 22%, transparent)'
		}
	});

	const createSizeTheme = (isCompact: boolean) =>
		EditorView.theme({
			'.cm-content': {
				fontSize: isCompact ? '0.6875rem' : '0.75rem',
				lineHeight: isCompact ? '1.38' : '1.4'
			}
		});

	onMount(() => {
		if (!editorElement) return;

		view = new EditorView({
			parent: editorElement,
			state: EditorState.create({
				doc: value,
				extensions: [
					artifactEditorSetup,
					markdown(),
					EditorView.lineWrapping,
					editorTheme,
					sizeCompartment.of(createSizeTheme(compact)),
					editableCompartment.of(EditorView.editable.of(!readOnly)),
					readOnlyCompartment.of(EditorState.readOnly.of(readOnly)),
					EditorView.updateListener.of((update: ViewUpdate) => {
						if (!update.docChanged) return;
						const fromRemote = update.transactions.some((tr) =>
							tr.annotation(Transaction.userEvent)?.startsWith('remote')
						);
						if (fromRemote) return;
						onChange?.(update.state.doc.toString());
					})
				]
			})
		});
	});

	onDestroy(() => {
		view?.destroy();
		view = null;
	});

	$effect(() => {
		if (!view) return;
		const currentValue = view.state.doc.toString();
		if (currentValue === value) return;

		view.dispatch({
			changes: {
				from: 0,
				to: currentValue.length,
				insert: value
			},
			annotations: Transaction.userEvent.of('remote.sync')
		});
	});

	$effect(() => {
		if (!view) return;

		view.dispatch({
			effects: [
				editableCompartment.reconfigure(EditorView.editable.of(!readOnly)),
				readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly)),
				sizeCompartment.reconfigure(createSizeTheme(compact))
			]
		});
	});
</script>

<div
	class="artifact-code-editor rounded-md outline-none focus-within:ring-2 focus-within:ring-ring"
	bind:this={editorElement}
></div>

<style>
	.artifact-code-editor {
		height: 100%;
		min-height: 0;
	}
</style>
