import type { Theme } from 'svelte-streamdown';

type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

/**
 * Streamdown (shadcn base) partial theme for artifact + chat preview:
 * design-system tokens, quiet headings, text-xs or 11px compact body, no literal alert accents.
 */
export function getArtifactPreviewStreamdownTheme(compact: boolean): DeepPartial<Theme> {
	const body = compact
		? 'text-[11px] leading-[1.4] text-foreground'
		: 'text-xs leading-[1.4] text-foreground';
	const thTdBase = compact
		? 'px-3 py-2 text-[11px] min-w-[200px] max-w-[400px] break-words'
		: 'px-3 py-2 text-xs min-w-[200px] max-w-[400px] break-words';

	return {
		paragraph: { base: body },
		h1: { base: 'mt-4 mb-1.5 text-base font-semibold text-foreground' },
		h2: { base: 'mt-4 mb-1.5 text-sm font-semibold text-foreground' },
		h3: { base: 'mt-3 mb-1 text-sm font-semibold text-foreground' },
		h4: { base: 'mt-3 mb-1 text-xs font-semibold text-foreground' },
		h5: { base: 'mt-2 mb-0.5 text-xs font-medium text-foreground' },
		h6: { base: 'mt-2 mb-0.5 text-[11px] font-medium text-muted-foreground' },
		ul: {
			base: `ml-4 list-inside list-disc whitespace-normal text-foreground ${body}`
		},
		ol: {
			base: `ml-4 list-inside list-decimal marker:text-muted-foreground whitespace-normal text-foreground ${body}`
		},
		li: { base: 'py-0.5' },
		code: {
			base: 'my-3 w-full overflow-hidden rounded-lg border border-border/50 flex flex-col',
			container: 'relative overflow-visible bg-muted/30 p-2 font-mono text-xs',
			header: 'flex items-center justify-between bg-muted/40 px-2 py-1 text-muted-foreground text-[11px]',
			pre: 'overflow-x-auto font-mono p-0 text-xs',
			skeleton: 'block rounded-md font-mono text-transparent bg-border/50 scale-y-90 animate-pulse whitespace-nowrap'
		},
		codespan: { base: 'bg-muted/50 rounded px-1.5 py-0.5 font-mono text-foreground text-[0.9em]' },
		blockquote: {
			base: 'border-border text-muted-foreground my-3 border-l-2 pl-3 italic'
		},
		table: {
			base: 'overflow-x-auto max-w-full my-3 rounded-lg border border-border/70'
		},
		td: { base: `${thTdBase} text-foreground` },
		th: { base: `${thTdBase} text-foreground font-medium` },
		strong: { base: 'font-semibold text-foreground' },
		em: { base: 'italic text-foreground' },
		sup: { base: compact ? 'text-[10px]' : 'text-xs' },
		sub: { base: compact ? 'text-[10px]' : 'text-xs' },
		hr: { base: 'border-border/70 my-4' },
		alert: {
			base: 'relative my-4 border-l-4 p-3 bg-muted/20',
			note: '[&>[data-alert-title]]:text-primary border-primary/70 stroke-primary',
			tip: '[&>[data-alert-title]]:text-primary border-primary/60 stroke-primary',
			warning: '[&>[data-alert-title]]:text-foreground border-border stroke-muted-foreground',
			caution: '[&>[data-alert-title]]:text-destructive border-destructive stroke-destructive',
			important: '[&>[data-alert-title]]:text-foreground border-primary/50 stroke-primary/80'
		},
		mermaid: {
			base: 'group relative my-4 h-auto min-h-[240px] rounded-lg border border-border bg-background overflow-hidden',
			buttons: 'absolute right-1 top-1 flex h-fit w-fit items-center justify-end gap-1'
		},
		math: {
			block: body,
			inline: body
		},
		components: {
			popover:
				'min-w-[250px] max-w-md fixed z-[1000] max-h-md overflow-y-auto rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-sm'
		}
	}
}
