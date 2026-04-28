<script lang="ts">
	import {
		closeBrackets,
		autocompletion,
		closeBracketsKeymap,
		completionKeymap
	} from '@codemirror/autocomplete';
	import {
		defaultKeymap,
		history,
		historyKeymap,
		indentLess,
		indentMore
	} from '@codemirror/commands';
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
	import { Compartment, EditorSelection, EditorState, Transaction } from '@codemirror/state';
	import {
		EditorView,
		crosshairCursor,
		drawSelection,
		dropCursor,
		highlightSpecialChars,
		keymap,
		rectangularSelection,
		type KeyBinding,
		type ViewUpdate
	} from '@codemirror/view';
	import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
	import { onDestroy, onMount } from 'svelte';

	type MarkdownHeading = {
		line: number;
		level: number;
		text: string;
	};

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
	const urlPattern = /^https?:\/\/\S+$/i;

	function selectedRanges(state: EditorState) {
		return state.selection.ranges.filter((range) => !range.empty);
	}

	function wrapSelection(view: EditorView, mark: string) {
		const ranges = selectedRanges(view.state);
		if (ranges.length === 0) return false;

		view.dispatch(
			view.state.changeByRange((range) => ({
				changes: [
					{ from: range.from, insert: mark },
					{ from: range.to, insert: mark }
				],
				range: EditorSelection.range(range.from + mark.length, range.to + mark.length)
			})),
			{ userEvent: 'input.markdown' }
		);
		return true;
	}

	function toggleHeading(view: EditorView, level: number) {
		const line = view.state.doc.lineAt(view.state.selection.main.head);
		const marker = `${'#'.repeat(level)} `;
		const text = line.text.replace(/^#{1,6}\s+/, '');

		view.dispatch({
			changes: { from: line.from, to: line.to, insert: `${marker}${text}` },
			selection: { anchor: line.from + marker.length + text.length },
			userEvent: 'input.markdown'
		});
		return true;
	}

	function makeMarkdownLink(view: EditorView) {
		const range = view.state.selection.main;
		if (range.empty) return false;

		const selected = view.state.sliceDoc(range.from, range.to);
		view.dispatch({
			changes: { from: range.from, to: range.to, insert: `[${selected}]()` },
			selection: { anchor: range.to + 3 },
			userEvent: 'input.markdown'
		});
		return true;
	}

	function continueMarkdownList(view: EditorView) {
		const line = view.state.doc.lineAt(view.state.selection.main.head);
		const beforeCursor = view.state.sliceDoc(line.from, view.state.selection.main.head);
		const bulletMatch = /^(\s*)([-*+])\s+(.*)$/.exec(beforeCursor);
		const numberedMatch = /^(\s*)(\d+)\.\s+(.*)$/.exec(beforeCursor);

		if (bulletMatch) {
			const [, indent, bullet, content] = bulletMatch;
			const insert = content.trim().length === 0 ? '\n' : `\n${indent}${bullet} `;
			view.dispatch(view.state.replaceSelection(insert), { userEvent: 'input' });
			return true;
		}

		if (numberedMatch) {
			const [, indent, number, content] = numberedMatch;
			const insert = content.trim().length === 0 ? '\n' : `\n${indent}${Number(number) + 1}. `;
			view.dispatch(view.state.replaceSelection(insert), { userEvent: 'input' });
			return true;
		}

		return false;
	}

	function pasteMarkdownLink(event: ClipboardEvent, view: EditorView) {
		const text = event.clipboardData?.getData('text/plain').trim() ?? '';
		const range = view.state.selection.main;
		if (!text || !urlPattern.test(text) || range.empty) return false;

		const selected = view.state.sliceDoc(range.from, range.to);
		view.dispatch({
			changes: { from: range.from, to: range.to, insert: `[${selected}](${text})` },
			userEvent: 'input.paste'
		});
		event.preventDefault();
		return true;
	}

	const markdownKeymap: KeyBinding[] = [
		{ key: 'Enter', run: continueMarkdownList },
		{ key: 'Mod-b', run: (view) => wrapSelection(view, '**') },
		{ key: 'Mod-i', run: (view) => wrapSelection(view, '*') },
		{ key: 'Mod-e', run: (view) => wrapSelection(view, '`') },
		{ key: 'Mod-k', run: makeMarkdownLink },
		{ key: 'Mod-Alt-1', run: (view) => toggleHeading(view, 1) },
		{ key: 'Mod-Alt-2', run: (view) => toggleHeading(view, 2) },
		{ key: 'Mod-Alt-3', run: (view) => toggleHeading(view, 3) },
		{ key: 'Tab', run: indentMore },
		{ key: 'Shift-Tab', run: indentLess }
	];

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
		EditorView.domEventHandlers({
			paste: pasteMarkdownLink
		}),
		keymap.of([
			...markdownKeymap,
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
		scrollToLine = null,
		onHeadingsChange,
		onChange
	}: {
		value: string;
		readOnly?: boolean;
		compact?: boolean;
		scrollToLine?: number | null;
		onHeadingsChange?: (headings: MarkdownHeading[]) => void;
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
				maxWidth: isCompact ? 'none' : '48rem',
				minHeight: '100%',
				margin: isCompact ? '0' : '0 auto',
				fontFamily: 'var(--font-sans)',
				fontSize: isCompact ? '0.8125rem' : '0.9375rem',
				lineHeight: isCompact ? '1.5' : '1.65'
			}
		});

	function markdownHeadings(doc: string): MarkdownHeading[] {
		return doc
			.split('\n')
			.map((line, index) => {
				const match = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
				if (!match) return null;
				return {
					line: index + 1,
					level: match[1].length,
					text: match[2].trim()
				};
			})
			.filter((heading): heading is MarkdownHeading => heading !== null);
	}

	function emitHeadings(doc: string) {
		onHeadingsChange?.(markdownHeadings(doc));
	}

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
						emitHeadings(update.state.doc.toString());
						const fromRemote = update.transactions.some((tr) =>
							tr.annotation(Transaction.userEvent)?.startsWith('remote')
						);
						if (fromRemote) return;
						onChange?.(update.state.doc.toString());
					})
				]
			})
		});
		emitHeadings(value);
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
		emitHeadings(value);
	});

	$effect(() => {
		if (!view) return;
		if (scrollToLine === null) return;
		const line = view.state.doc.line(Math.min(scrollToLine, view.state.doc.lines));

		view.dispatch({
			selection: { anchor: line.from },
			effects: EditorView.scrollIntoView(line.from, { y: 'start', yMargin: 24 })
		});
		view.focus();
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
