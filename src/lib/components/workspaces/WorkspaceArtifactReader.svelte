<script lang="ts">
	import { auth, getConvexClient } from '$lib/auth.svelte'
	import {
		applyArtifactDraftChangeMutation,
		discardArtifactDraftChangeMutation,
		listArtifactDraftChangesQuery,
		updateArtifactMutation,
		type ArtifactDraftChange,
		type ArtifactLinkReason,
		type SavedArtifact
	} from '$lib/artifacts'
	import { draftPreview, linkReasonLabel } from '$lib/artifact-display'
	import ArtifactCodeEditor from '$lib/components/workspaces/ArtifactCodeEditor.svelte'
	import ArtifactDiffEditor from '$lib/components/workspaces/ArtifactDiffEditor.svelte'
	import { Button } from '$lib/components/ui/button'
	import { cn } from '$lib/utils'
	import githubDarkDefault from '@shikijs/themes/github-dark-default'
	import githubLightDefault from '@shikijs/themes/github-light-default'
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left'
	import FileTextIcon from '@lucide/svelte/icons/file-text'
	import SaveIcon from '@lucide/svelte/icons/save'
	import XIcon from '@lucide/svelte/icons/x'
	import { mode } from 'mode-watcher'
	import { useQuery } from 'convex-svelte'
	import Code from 'svelte-streamdown/code'
	import MathRenderer from 'svelte-streamdown/math'
	import Mermaid from 'svelte-streamdown/mermaid'
	import { Streamdown, type StreamdownProps } from 'svelte-streamdown'
	import type { Id } from '../../../convex/_generated/dataModel'

	let {
		artifact,
		compact = false,
		fullWidthContent = false,
		showHeader,
		linkReason,
		onBack,
		onClose
	}: {
		artifact: SavedArtifact | null | undefined
		compact?: boolean
		fullWidthContent?: boolean
		/** When `false`, never show the optional context toolbar (e.g. standalone artifact page). */
		showHeader?: boolean
		linkReason?: ArtifactLinkReason
		onBack?: () => void
		onClose?: () => void
	} = $props()

	const showContextToolbar = $derived(
		showHeader !== false && (Boolean(onBack) || Boolean(onClose) || linkReason != null)
	)

	type SurfaceMode = 'read' | 'compare'
	type ReadSubMode = 'editor' | 'preview'

	let busyDraftChangeId = $state('')
	let draftError = $state('')
	let contentDirty = $state(false)
	let editorValue = $state('')
	let hydratedArtifactId = $state<Id<'artifacts'> | null>(null)
	let saveError = $state('')
	let isSaving = $state(false)
	let surfaceMode = $state<SurfaceMode>('read')
	let readMode = $state<ReadSubMode>('editor')
	let selectedDraftChangeId = $state<Id<'artifactDraftChanges'> | null>(null)

	type StreamdownComponents = NonNullable<StreamdownProps['components']>
	const streamdownComponents = {
		code: Code,
		mermaid: Mermaid,
		math: MathRenderer
	} satisfies StreamdownComponents

	let streamdownTheme = $derived(
		mode.current === 'dark' ? 'github-dark-default' : 'github-light-default'
	)

	const draftChanges = useQuery(listArtifactDraftChangesQuery, () =>
		auth.isAuthenticated && artifact ? { artifactId: artifact._id as Id<'artifacts'> } : 'skip'
	)

	const pendingDraftChanges = $derived(
		draftChanges.data?.filter((draftChange) => draftChange.status === 'pending') ?? []
	)

	const selectedDraft = $derived(
		selectedDraftChangeId == null
			? undefined
			: pendingDraftChanges.find((d) => d._id === selectedDraftChangeId)
	)

	const canCompare = $derived(pendingDraftChanges.length > 0)

	const canSave = $derived(
		Boolean(artifact) &&
			surfaceMode === 'read' &&
			readMode === 'editor' &&
			editorValue.trim().length > 0 &&
			editorValue !== (artifact?.contentMarkdown ?? '') &&
			!isSaving
	)

	$effect(() => {
		if (artifact === undefined || artifact === null) {
			hydratedArtifactId = null
			return
		}

		const id = artifact._id
		if (hydratedArtifactId !== id) {
			hydratedArtifactId = id
			editorValue = artifact.contentMarkdown
			contentDirty = false
			saveError = ''
			surfaceMode = 'read'
			readMode = 'editor'
			selectedDraftChangeId = null
			return
		}

		if (!contentDirty) {
			editorValue = artifact.contentMarkdown
			saveError = ''
		}
	})

	$effect(() => {
		const list = pendingDraftChanges
		if (list.length === 0) {
			selectedDraftChangeId = null
			if (surfaceMode === 'compare') {
				surfaceMode = 'read'
			}
			return
		}
		if (
			selectedDraftChangeId == null ||
			!list.some((d) => d._id === selectedDraftChangeId)
		) {
			selectedDraftChangeId = list[0]!._id
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

	const setReadSurface = () => {
		if (!artifact) return
		surfaceMode = 'read'
		saveError = ''
	}

	const setCompareSurface = () => {
		if (!artifact || !canCompare) return
		surfaceMode = 'compare'
		saveError = ''
	}

	const setEditorMode = () => {
		if (!artifact) return
		readMode = 'editor'
		saveError = ''
	}

	const setPreviewMode = () => {
		readMode = 'preview'
		saveError = ''
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
			contentDirty = false
		} catch (error) {
			console.error(error)
			saveError = 'Could not save this artifact. Please try again.'
		} finally {
			isSaving = false
		}
	}

	const selectDraftForCompare = (draftChangeId: Id<'artifactDraftChanges'>) => {
		selectedDraftChangeId = draftChangeId
	}
</script>

{#snippet DraftChangeRow(draftChange: ArtifactDraftChange, selected: boolean)}
	<div
		class={cn(
			'relative rounded-md px-2 py-2.5 transition-colors',
			selected ? 'bg-accent/60 ring-1 ring-ring/60' : 'hover:bg-accent/50'
		)}
	>
		<button
			type="button"
			class="absolute inset-0 z-0 rounded-md"
			aria-label={`Select draft “${draftChange.proposedTitle}” for compare`}
			aria-pressed={selected}
			onclick={() => selectDraftForCompare(draftChange._id)}
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
					<span class="shrink-0 text-[10px] text-muted-foreground">Draft</span>
				</div>
				{#if draftChange.summary}
					<p class="mt-1 text-xs leading-5 text-foreground">{draftChange.summary}</p>
				{/if}
				<p class="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
					{draftPreview(draftChange.proposedContentMarkdown)}
				</p>
				<div class="pointer-events-auto mt-2 flex gap-2">
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
				<p class="text-base font-semibold tracking-tight">Loading artifact.</p>
				<p class="mt-2 text-xs leading-5 text-muted-foreground">
					Pulling the saved document into view.
				</p>
			</div>
		</div>
	{:else if artifact === null}
		<div class="flex min-h-0 flex-1 items-center justify-center px-4">
			<div class="text-center">
				<p class="text-base font-semibold tracking-tight">Artifact not found.</p>
				<p class="mt-2 text-xs leading-5 text-muted-foreground">
					It may have been moved, deleted, or you may not have access.
				</p>
			</div>
		</div>
	{:else}
		{#if showContextToolbar}
			<div
				class="flex shrink-0 items-center gap-2 border-b border-border/50 py-2 {compact
					? 'px-3'
					: 'px-4'}"
			>
				{#if onBack}
					<Button
						type="button"
						variant="ghost"
						size="icon"
						class="size-8 shrink-0"
						aria-label="Back to thread artifacts"
						onclick={onBack}
					>
						<ChevronLeftIcon class="size-4" />
					</Button>
				{/if}
				<div class="min-w-0 flex-1">
					<p
						class="truncate font-semibold tracking-tight {compact ? 'text-sm' : 'text-base'}"
					>
						{artifact.title}
					</p>
					{#if linkReason != null}
						<p class="mt-0.5 text-[11px] leading-4 text-muted-foreground">
							{linkReasonLabel(linkReason)}
						</p>
					{/if}
				</div>
				{#if onClose}
					<Button
						type="button"
						variant="ghost"
						size="icon"
						class="size-8 shrink-0"
						aria-label="Close thread context"
						onclick={onClose}
					>
						<XIcon class="size-3.5" />
					</Button>
				{/if}
			</div>
		{/if}

		<div
			class="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/50 py-1.5 {compact
				? 'px-3'
				: 'px-4'}"
		>
			<div class="inline-flex items-center rounded-md border border-border/70 p-0.5">
				<Button
					type="button"
					size="sm"
					variant={surfaceMode === 'read' ? 'secondary' : 'ghost'}
					class="h-7 rounded-sm px-2.5 text-xs font-medium"
					onclick={setReadSurface}
				>
					Read
				</Button>
				<Button
					type="button"
					size="sm"
					variant={surfaceMode === 'compare' ? 'secondary' : 'ghost'}
					class="h-7 rounded-sm px-2.5 text-xs font-medium"
					disabled={!canCompare}
					title={!canCompare ? 'No pending AI drafts to compare' : undefined}
					onclick={setCompareSurface}
				>
					Compare
				</Button>
			</div>

			{#if surfaceMode === 'read'}
				<div class="inline-flex items-center rounded-md border border-border/70 p-0.5">
					<Button
						type="button"
						size="sm"
						variant={readMode === 'editor' ? 'secondary' : 'ghost'}
						class="h-7 rounded-sm px-2.5 text-xs font-medium"
						onclick={setEditorMode}
					>
						Editor
					</Button>
					<Button
						type="button"
						size="sm"
						variant={readMode === 'preview' ? 'secondary' : 'ghost'}
						class="h-7 rounded-sm px-2.5 text-xs font-medium"
						onclick={setPreviewMode}
					>
						Preview
					</Button>
				</div>
			{/if}

			<span class="min-w-[1rem] flex-1"></span>

			{#if surfaceMode === 'read' && readMode === 'editor'}
				<Button
					type="button"
					variant="default"
					size="sm"
					class="h-8 gap-1.5 px-2.5 text-xs"
					disabled={!canSave}
					onclick={saveChanges}
				>
					<SaveIcon class="size-3.5" />
					{isSaving ? 'Saving...' : 'Save'}
				</Button>
			{/if}
		</div>

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
							{@render DraftChangeRow(
								draftChange,
								selectedDraftChangeId === draftChange._id
							)}
						{/each}
					</div>
				{/if}

				<div class="min-h-0 flex-1">
					{#if surfaceMode === 'compare'}
						{#if selectedDraft}
							<div class={compact ? 'min-h-[14rem]' : 'min-h-[20rem]'}>
								{#key `${artifact._id}-${selectedDraft._id}`}
									<ArtifactDiffEditor
										original={artifact.contentMarkdown}
										modified={selectedDraft.proposedContentMarkdown}
										{compact}
									/>
								{/key}
							</div>
						{:else}
							<p class="text-xs text-muted-foreground">
								No draft selected. Pending drafts will appear above when the AI proposes
								changes.
							</p>
						{/if}
					{:else if readMode === 'editor'}
						<div class={compact ? 'min-h-[12rem]' : 'min-h-[18rem]'}>
							{#key artifact._id}
								<ArtifactCodeEditor
									value={editorValue}
									readOnly={false}
									{compact}
									onChange={(nextValue) => {
										editorValue = nextValue
										contentDirty = true
									}}
								/>
							{/key}
						</div>
					{:else}
						<div
							class={cn(
								'overflow-y-auto px-1 py-2',
								compact ? 'min-h-[12rem]' : 'min-h-[18rem]'
							)}
						>
							{#if editorValue.trim().length === 0}
								<p class="text-xs text-muted-foreground">Nothing to preview yet.</p>
							{:else}
								{#key artifact._id}
									<div
										class={cn(
											'prose prose-neutral dark:prose-invert max-w-none',
											compact ? 'prose-sm text-xs leading-relaxed' : 'text-sm'
										)}
									>
										<Streamdown
											content={editorValue}
											baseTheme="shadcn"
											components={streamdownComponents}
											shikiTheme={streamdownTheme}
											shikiThemes={{
												'github-light-default': githubLightDefault,
												'github-dark-default': githubDarkDefault
											}}
										/>
									</div>
								{/key}
							{/if}
						</div>
					{/if}
					{#if saveError}
						<p class="mt-2 text-xs text-destructive">{saveError}</p>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</section>
