<script lang="ts">
	import { auth, getConvexClient } from '$lib/auth.svelte'
	import {
		applyArtifactDraftChangeMutation,
		discardArtifactDraftChangeMutation,
		listArtifactDraftChangesQuery,
		updateArtifactMutation,
		type ArtifactDraftChange,
		type SavedArtifact
	} from '$lib/artifacts'
	import { draftPreview } from '$lib/artifact-display'
	import { Button } from '$lib/components/ui/button'
	import ArtifactCodeEditor from '$lib/components/workspaces/ArtifactCodeEditor.svelte'
	import FileTextIcon from '@lucide/svelte/icons/file-text'
	import SaveIcon from '@lucide/svelte/icons/save'
	import { useQuery } from 'convex-svelte'
	import type { Id } from '../../../convex/_generated/dataModel'

	let {
		artifact,
		compact = false,
		fullWidthContent = false
	}: {
		artifact: SavedArtifact | null | undefined
		compact?: boolean
		fullWidthContent?: boolean
	} = $props()

	type ArtifactViewMode = 'editor' | 'preview'

	let busyDraftChangeId = $state('')
	let draftError = $state('')
	let isEditing = $state(true)
	let editorValue = $state('')
	let saveError = $state('')
	let isSaving = $state(false)
	let viewMode = $state<ArtifactViewMode>('editor')

	const draftChanges = useQuery(listArtifactDraftChangesQuery, () =>
		auth.isAuthenticated && artifact ? { artifactId: artifact._id as Id<'artifacts'> } : 'skip'
	)

	const pendingDraftChanges = $derived(
		draftChanges.data?.filter((draftChange) => draftChange.status === 'pending') ?? []
	)

	const canSave = $derived(
		Boolean(artifact) &&
			isEditing &&
			viewMode === 'editor' &&
			editorValue.trim().length > 0 &&
			editorValue !== (artifact?.contentMarkdown ?? '') &&
			!isSaving
	)

	$effect(() => {
		if (artifact === undefined || artifact === null || isEditing) return
		editorValue = artifact.contentMarkdown
		saveError = ''
	})

	$effect(() => {
		if (!artifact) return
		if (viewMode === 'editor' && !isEditing) {
			saveError = ''
			isEditing = true
		}
		if (viewMode === 'preview' && isEditing) {
			isEditing = false
		}
	})

	const applyDraftChange = async (draftChangeId: Id<'artifactDraftChanges'>) => {
		if (busyDraftChangeId) return

		draftError = ''
		busyDraftChangeId = draftChangeId

		try {
			await getConvexClient().mutation(applyArtifactDraftChangeMutation, { draftChangeId })
		} catch (error) {
			console.error(error)
			draftError = 'Could not apply this draft. Please try again.'
		} finally {
			busyDraftChangeId = ''
		}
	}

	const discardDraftChange = async (draftChangeId: Id<'artifactDraftChanges'>) => {
		if (busyDraftChangeId) return

		draftError = ''
		busyDraftChangeId = draftChangeId

		try {
			await getConvexClient().mutation(discardArtifactDraftChangeMutation, { draftChangeId })
		} catch (error) {
			console.error(error)
			draftError = 'Could not discard this draft. Please try again.'
		} finally {
			busyDraftChangeId = ''
		}
	}

	const setEditorMode = () => {
		if (!artifact) return
		viewMode = 'editor'
		saveError = ''
		isEditing = true
	}

	const setPreviewMode = () => {
		viewMode = 'preview'
		saveError = ''
		isEditing = false
	}

	const saveChanges = async () => {
		if (!artifact || !canSave) return

		isSaving = true
		saveError = ''

		try {
			await getConvexClient().mutation(updateArtifactMutation, {
				artifactId: artifact._id,
				contentMarkdown: editorValue
			})
		} catch (error) {
			console.error(error)
			saveError = 'Could not save this artifact. Please try again.'
		} finally {
			isSaving = false
		}
	}
</script>

{#snippet DraftChangeRow(draftChange: ArtifactDraftChange)}
	<div class="rounded-md px-2 py-2.5">
		<div class="flex items-start gap-3">
			<div class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-accent">
				<FileTextIcon class="size-3.5 text-muted-foreground" />
			</div>
			<div class="min-w-0 flex-1">
				<div class="flex items-center justify-between gap-2">
					<p class="truncate text-xs font-medium tracking-tight">{draftChange.proposedTitle}</p>
					<span class="shrink-0 text-[10px] text-muted-foreground">Draft</span>
				</div>
				{#if draftChange.summary}
					<p class="mt-1 text-xs leading-5 text-foreground">{draftChange.summary}</p>
				{/if}
				<p class="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
					{draftPreview(draftChange.proposedContentMarkdown)}
				</p>
				<div class="mt-2 flex gap-2">
					<Button
						type="button"
						size="sm"
						variant="ghost"
						class="h-6 px-2 text-xs text-muted-foreground hover:bg-accent/70 hover:text-foreground"
						disabled={Boolean(busyDraftChangeId)}
						onclick={() => applyDraftChange(draftChange._id)}
					>
						{busyDraftChangeId === draftChange._id ? 'Applying...' : 'Apply'}
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						class="h-6 px-2 text-xs text-muted-foreground hover:bg-accent/70 hover:text-foreground"
						disabled={Boolean(busyDraftChangeId)}
						onclick={() => discardDraftChange(draftChange._id)}
					>
						{busyDraftChangeId === draftChange._id ? 'Working...' : 'Discard'}
					</Button>
				</div>
			</div>
		</div>
	</div>
{/snippet}

<section class="flex h-full min-h-0 flex-col bg-background text-foreground">
	{#if artifact === undefined}
		<div class="flex min-h-0 flex-1 items-center justify-center px-4">
			<div class="text-center">
				<p class="text-sm font-semibold tracking-tight">Loading artifact.</p>
				<p class="mt-2 text-xs leading-5 text-muted-foreground">
					Pulling the saved document into view.
				</p>
			</div>
		</div>
	{:else if artifact === null}
		<div class="flex min-h-0 flex-1 items-center justify-center px-4">
			<div class="text-center">
				<p class="text-sm font-semibold tracking-tight">Artifact not found.</p>
				<p class="mt-2 text-xs leading-5 text-muted-foreground">
					It may have been moved, deleted, or you may not have access.
				</p>
			</div>
		</div>
	{:else}
		<div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
			<div
				class={
					fullWidthContent
						? 'space-y-6'
						: compact
							? 'space-y-5'
							: 'mx-auto max-w-3xl space-y-6'
				}
			>
				{#if draftChanges.data === undefined}
					<div>
						<p class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
							Pending drafts
						</p>
						<p class="mt-1 text-xs text-muted-foreground">Loading drafts...</p>
					</div>
				{:else if pendingDraftChanges.length > 0 || draftError}
					<div class="space-y-1">
						<p class="px-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
							Pending drafts
						</p>
						{#if draftError}
							<p class="px-2 py-1 text-xs text-destructive">{draftError}</p>
						{/if}
						{#each pendingDraftChanges as draftChange (draftChange._id)}
							{@render DraftChangeRow(draftChange)}
						{/each}
					</div>
				{/if}

				<div>
					<div
						class={`overflow-hidden rounded-md border border-border/70 ${
							compact ? 'min-h-[12rem]' : 'min-h-[18rem]'
						}`}
					>
						{#if viewMode === 'editor'}
							<ArtifactCodeEditor
								value={editorValue}
								readOnly={!isEditing}
								{compact}
								onChange={(nextValue) => (editorValue = nextValue)}
							/>
						{:else}
							<div class="h-full min-h-[inherit] overflow-y-auto bg-background px-4 py-3">
								{#if editorValue.trim().length === 0}
									<p class="text-xs text-muted-foreground">Nothing to preview yet.</p>
								{:else}
									<pre
										class="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-foreground"
									>{editorValue}</pre>
								{/if}
							</div>
						{/if}
					</div>
					{#if saveError}
						<p class="mt-2 text-xs text-destructive">{saveError}</p>
					{/if}
				</div>
			</div>
		</div>

		<footer class="shrink-0 border-t border-border/50 px-0 py-1.5">
			<div class="flex w-full items-center justify-between gap-2">
				<div class="inline-flex items-center rounded-md border border-border/70 p-0.5">
					<Button
						type="button"
						size="sm"
						variant={viewMode === 'editor' ? 'default' : 'ghost'}
						class="h-6 rounded-sm px-2 text-xs"
						onclick={setEditorMode}
					>
						Editor
					</Button>
					<Button
						type="button"
						size="sm"
						variant={viewMode === 'preview' ? 'default' : 'ghost'}
						class="h-6 rounded-sm px-2 text-xs"
						onclick={setPreviewMode}
					>
						Preview
					</Button>
				</div>

				{#if viewMode === 'editor'}
					<Button
						type="button"
						size="sm"
						class="h-6 gap-1.5 px-2 text-xs"
						disabled={!canSave}
						onclick={saveChanges}
					>
						<SaveIcon class="size-3.5" />
						{isSaving ? 'Saving...' : 'Save'}
					</Button>
				{/if}
			</div>
		</footer>
	{/if}
</section>
