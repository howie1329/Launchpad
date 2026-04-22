<script lang="ts">
	import { getArtifactPreviewStreamdownTheme } from '$lib/streamdown/artifactPreviewTheme'
	import { Streamdown, type StreamdownProps } from 'svelte-streamdown'
	import Code from 'svelte-streamdown/code'
	import MathRenderer from 'svelte-streamdown/math'
	import Mermaid from 'svelte-streamdown/mermaid'
	import { mode } from 'mode-watcher'
	import minDark from '@shikijs/themes/min-dark'
	import minLight from '@shikijs/themes/min-light'
	import { cn } from '$lib/utils'

	type StreamdownComponents = NonNullable<StreamdownProps['components']>

	type Props = {
		content: string
		class?: string
		components?: StreamdownComponents
	} & Omit<StreamdownProps, 'class' | 'content' | 'components'>

	let { content, class: className, components, ...restProps }: Props = $props()

	const defaultComponents = {
		code: Code,
		mermaid: Mermaid,
		math: MathRenderer
	} satisfies StreamdownComponents

	const chatStreamdownTheme = getArtifactPreviewStreamdownTheme(false)

	let mergedComponents = $derived({ ...defaultComponents, ...components })

	let currentTheme = $derived(mode.current === 'dark' ? 'min-dark' : 'min-light')
</script>

<div class={cn('size-full text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0', className)}>
	<Streamdown
		{...restProps}
		{content}
		baseTheme="shadcn"
		theme={chatStreamdownTheme}
		components={mergedComponents}
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
		shikiTheme={currentTheme}
	/>
</div>
