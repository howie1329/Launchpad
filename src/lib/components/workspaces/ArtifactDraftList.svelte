<script lang="ts">
	import { draftPreview } from '$lib/artifact-display';
	import { draftStatItems, draftSummaryText } from '$lib/artifact-review';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import type { ArtifactDraftChange } from '$lib/artifacts';
	import type { Id } from '../../../convex/_generated/dataModel';

	let {
		drafts,
		selectedDraftChangeId = null,
		busyDraftChangeId = '',
		draftError = '',
		onSelect,
		onApply,
		onDiscard
	}: {
		drafts: ArtifactDraftChange[];
		selectedDraftChangeId?: Id<'artifactDraftChanges'> | null;
		busyDraftChangeId?: string;
		draftError?: string;
		onSelect: (draftChangeId: Id<'artifactDraftChanges'>) => void;
		onApply: (draftChangeId: Id<'artifactDraftChanges'>) => void;
		onDiscard: (draftChangeId: Id<'artifactDraftChanges'>) => void;
	} = $props();
</script>

{#if drafts.length > 0 || draftError}
	<div class="space-y-1">
		<p class="px-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
			Pending drafts
		</p>
		{#if draftError}
			<p class="px-2 py-1 text-xs text-destructive">{draftError}</p>
		{/if}
		{#each drafts as draftChange (draftChange._id)}
			<div
				class={cn(
					'relative rounded-md px-2 py-2.5 transition-colors',
					selectedDraftChangeId === draftChange._id
						? 'bg-accent/60 ring-1 ring-ring/60'
						: 'hover:bg-accent/50'
				)}
			>
				<button
					type="button"
					class="absolute inset-0 z-0 rounded-md"
					aria-label={`Select draft “${draftChange.proposedTitle}” for compare`}
					aria-pressed={selectedDraftChangeId === draftChange._id}
					onclick={() => onSelect(draftChange._id)}
				></button>
				<div class="pointer-events-none relative z-10 flex items-start gap-3">
					<div
						class="mt-0.5 flex size-7 shrink-0 items-center justify-center text-muted-foreground"
					>
						<FileTextIcon class="size-3" />
					</div>
					<div class="min-w-0 flex-1">
						<div class="flex items-center justify-between gap-2">
							<p class="truncate text-xs font-medium tracking-tight">{draftChange.proposedTitle}</p>
							<span
								class={cn(
									'shrink-0 text-[10px]',
									draftChange.isStale ? 'text-destructive' : 'text-muted-foreground'
								)}
							>
								{draftChange.isStale ? 'Stale' : 'Draft'}
							</span>
						</div>
						<p class="mt-1 text-xs leading-5 text-foreground">{draftSummaryText(draftChange)}</p>
						{#if draftStatItems(draftChange).length > 0}
							<div class="mt-1 flex flex-wrap gap-1">
								{#each draftStatItems(draftChange) as stat, index (`${stat}-${index}`)}
									<span
										class="rounded-full border border-border/60 bg-muted/20 px-1.5 py-0.5 text-[10px] text-muted-foreground"
									>
										{stat}
									</span>
								{/each}
							</div>
						{/if}
						<p class="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
							{draftPreview(draftChange.proposedContentMarkdown)}
						</p>
						{#if draftChange.isStale && draftChange.staleReason}
							<p class="mt-2 text-xs leading-5 text-destructive">{draftChange.staleReason}</p>
						{/if}
						<div class="pointer-events-auto mt-2 flex gap-2">
							<Button
								type="button"
								size="sm"
								variant="ghost"
								class="h-6 px-2 text-xs text-muted-foreground hover:bg-accent/70 hover:text-foreground"
								disabled={Boolean(busyDraftChangeId) || Boolean(draftChange.isStale)}
								onclick={() => onApply(draftChange._id)}
							>
								{busyDraftChangeId === draftChange._id ? 'Applying...' : 'Apply'}
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								class="h-6 px-2 text-xs text-muted-foreground hover:bg-accent/70 hover:text-foreground"
								disabled={Boolean(busyDraftChangeId)}
								onclick={() => onDiscard(draftChange._id)}
							>
								{busyDraftChangeId === draftChange._id ? 'Working...' : 'Discard'}
							</Button>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}
