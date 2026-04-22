<script lang="ts">
	import type { ArtifactDraftChange, SavedArtifact } from '$lib/artifacts';
	import { draftStatItems, draftSummaryText } from '$lib/artifact-review';
	import ArtifactDiffRendererDiffs from '$lib/components/workspaces/ArtifactDiffRendererDiffs.svelte';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import { LayoutTwoColumnIcon, LayoutTwoRowIcon } from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import type { Id } from '../../../convex/_generated/dataModel';

	let {
		artifact,
		selectedDraft,
		compact = false,
		diffLayout = 'unified',
		hydratingDraftChangeId = '',
		busyDraftChangeId = '',
		onSetUnified,
		onSetSplit,
		onApply,
		onDiscard
	}: {
		artifact: SavedArtifact;
		selectedDraft: ArtifactDraftChange | undefined;
		compact?: boolean;
		diffLayout?: 'unified' | 'split';
		hydratingDraftChangeId?: string;
		busyDraftChangeId?: string;
		onSetUnified: () => void;
		onSetSplit: () => void;
		onApply: (draftChangeId: Id<'artifactDraftChanges'>) => void;
		onDiscard: (draftChangeId: Id<'artifactDraftChanges'>) => void;
	} = $props();
</script>

{#if selectedDraft}
	<div class="space-y-3">
		<div
			class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2"
		>
			<div class="space-y-1">
				<p class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
					Draft review
				</p>
				<p class="text-xs text-foreground">{draftSummaryText(selectedDraft)}</p>
				{#if draftStatItems(selectedDraft).length > 0}
					<div class="flex flex-wrap gap-1">
						{#each draftStatItems(selectedDraft) as stat, index (`${stat}-${index}`)}
							<span
								class="rounded-full border border-border/60 bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground"
							>
								{stat}
							</span>
						{/each}
					</div>
				{/if}
				{#if selectedDraft.isStale && selectedDraft.staleReason}
					<p class="text-xs text-destructive">{selectedDraft.staleReason}</p>
				{/if}
			</div>
			<div class="inline-flex items-center rounded-md border border-border/70 p-0.5">
				<Button
					type="button"
					size="sm"
					variant={diffLayout === 'unified' ? 'secondary' : 'ghost'}
					class="h-7 gap-1 rounded-sm px-2 text-xs font-medium"
					onclick={onSetUnified}
				>
					<HugeiconsIcon icon={LayoutTwoRowIcon} strokeWidth={2} class="size-3" />
					Unified
				</Button>
				<Button
					type="button"
					size="sm"
					variant={diffLayout === 'split' ? 'secondary' : 'ghost'}
					class="h-7 gap-1 rounded-sm px-2 text-xs font-medium"
					onclick={onSetSplit}
				>
					<HugeiconsIcon icon={LayoutTwoColumnIcon} strokeWidth={2} class="size-3" />
					Split
				</Button>
			</div>
		</div>

		{#if selectedDraft.baseTitle && selectedDraft.baseTitle !== selectedDraft.proposedTitle}
			<div class="rounded-md border border-border/60 bg-background px-3 py-3">
				<p class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
					Title change
				</p>
				<div
					class={cn('mt-2 grid gap-3', diffLayout === 'split' ? 'md:grid-cols-2' : 'grid-cols-1')}
				>
					<div>
						<p class="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
							Saved
						</p>
						<p class="mt-1 text-sm font-medium text-foreground">{selectedDraft.baseTitle}</p>
					</div>
					<div>
						<p class="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
							Proposed
						</p>
						<p class="mt-1 text-sm font-medium text-foreground">
							{selectedDraft.proposedTitle}
						</p>
					</div>
				</div>
			</div>
		{/if}

		{#if hydratingDraftChangeId === selectedDraft._id}
			<p class="text-xs text-muted-foreground">Preparing legacy draft review...</p>
		{:else if selectedDraft.isStale && !selectedDraft.patch}
			<div class="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-3">
				<p class="text-sm font-medium text-foreground">Draft review unavailable</p>
				<p class="mt-1 text-xs leading-5 text-muted-foreground">
					{selectedDraft.staleReason ??
						'This draft cannot be safely compared because its original base content is unavailable.'}
				</p>
			</div>
		{:else}
			<div class={compact ? 'min-h-[14rem]' : 'min-h-[20rem]'}>
				{#key `${artifact._id}-${selectedDraft._id}-${diffLayout}`}
					<ArtifactDiffRendererDiffs
						patch={selectedDraft.patch}
						original={selectedDraft.baseContentMarkdown ?? artifact.contentMarkdown}
						modified={selectedDraft.proposedContentMarkdown}
						diffStyle={diffLayout}
						{compact}
					/>
				{/key}
			</div>
		{/if}

		<div
			class="flex flex-wrap items-center justify-center gap-2 border-t border-border/50 bg-background pt-3"
		>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				class="h-7 px-2.5 text-xs"
				disabled={Boolean(busyDraftChangeId) || Boolean(selectedDraft.isStale)}
				onclick={() => onApply(selectedDraft._id)}
			>
				{busyDraftChangeId === selectedDraft._id ? 'Applying...' : 'Apply draft'}
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				class="h-7 px-2.5 text-xs"
				disabled={Boolean(busyDraftChangeId)}
				onclick={() => onDiscard(selectedDraft._id)}
			>
				{busyDraftChangeId === selectedDraft._id ? 'Working...' : 'Discard draft'}
			</Button>
		</div>
	</div>
{:else}
	<p class="text-xs text-muted-foreground">
		No draft selected. Pending drafts will appear above when the AI proposes changes.
	</p>
{/if}
