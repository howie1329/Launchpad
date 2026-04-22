<script lang="ts">
	import { auth, getConvexClient } from '$lib/auth.svelte';
	import {
		applyArtifactDraftChangeMutation,
		discardArtifactDraftChangeMutation,
		hydrateArtifactDraftChangeReviewDataMutation,
		listArtifactDraftChangesQuery,
		updateArtifactMutation,
		type ArtifactDraftChange,
		type ArtifactLinkReason,
		type SavedArtifact
	} from '$lib/artifacts';
	import ArtifactDraftList from '$lib/components/workspaces/ArtifactDraftList.svelte';
	import ArtifactReadSurface from '$lib/components/workspaces/ArtifactReadSurface.svelte';
	import ArtifactReviewSurface from '$lib/components/workspaces/ArtifactReviewSurface.svelte';
	import { Button } from '$lib/components/ui/button';
	import { workspaceArtifactChrome } from '$lib/workspace-artifact-chrome.svelte';
	import { SaveIcon } from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { useQuery } from 'convex-svelte';
	import type { Id } from '../../../convex/_generated/dataModel';

	let {
		artifact,
		compact = false,
		fullWidthContent = false,
		initialSelectedDraftChangeId = null,
		showHeader,
		onBack
	}: {
		artifact: SavedArtifact | null | undefined;
		compact?: boolean;
		fullWidthContent?: boolean;
		initialSelectedDraftChangeId?: Id<'artifactDraftChanges'> | null;
		/** When `false`, never show the optional context toolbar. */
		showHeader?: boolean;
		linkReason?: ArtifactLinkReason;
		onBack?: () => void;
	} = $props();

	type SurfaceMode = 'read' | 'compare';
	type ReadSubMode = 'editor' | 'preview';
	type DiffLayout = 'unified' | 'split';

	let busyDraftChangeId = $state('');
	let draftError = $state('');
	let contentDirty = $state(false);
	let diffLayout = $state<DiffLayout>('unified');
	let editorValue = $state('');
	let hydratedArtifactId = $state<Id<'artifacts'> | null>(null);
	let hydratingDraftChangeId = $state('');
	let saveError = $state('');
	let isSaving = $state(false);
	let surfaceMode = $state<SurfaceMode>('read');
	let readMode = $state<ReadSubMode>('editor');
	let selectedDraftChangeId = $state<Id<'artifactDraftChanges'> | null>(null);

	const draftChanges = useQuery(listArtifactDraftChangesQuery, () =>
		auth.isAuthenticated && artifact ? { artifactId: artifact._id as Id<'artifacts'> } : 'skip'
	);

	const pendingDraftChanges = $derived(
		draftChanges.data?.filter((draftChange) => draftChange.status === 'pending') ?? []
	);

	const selectedDraft = $derived(
		selectedDraftChangeId == null
			? undefined
			: pendingDraftChanges.find((d) => d._id === selectedDraftChangeId)
	);

	const canCompare = $derived(pendingDraftChanges.length > 0);

	const canSave = $derived(
		Boolean(artifact) &&
			surfaceMode === 'read' &&
			readMode === 'editor' &&
			editorValue.trim().length > 0 &&
			editorValue !== (artifact?.contentMarkdown ?? '') &&
			!isSaving
	);

	$effect(() => {
		if (artifact === undefined || artifact === null) {
			hydratedArtifactId = null;
			return;
		}

		const id = artifact._id;
		if (hydratedArtifactId !== id) {
			hydratedArtifactId = id;
			editorValue = artifact.contentMarkdown;
			contentDirty = false;
			saveError = '';
			surfaceMode = 'read';
			readMode = 'editor';
			diffLayout = 'unified';
			selectedDraftChangeId = initialSelectedDraftChangeId;
			if (initialSelectedDraftChangeId) {
				surfaceMode = 'compare';
			}
			return;
		}

		if (!contentDirty) {
			editorValue = artifact.contentMarkdown;
			saveError = '';
		}
	});

	$effect(() => {
		const list = pendingDraftChanges;
		if (list.length === 0) {
			selectedDraftChangeId = null;
			if (surfaceMode === 'compare') {
				surfaceMode = 'read';
			}
			return;
		}
		if (
			initialSelectedDraftChangeId &&
			list.some((d) => d._id === initialSelectedDraftChangeId) &&
			selectedDraftChangeId !== initialSelectedDraftChangeId
		) {
			selectedDraftChangeId = initialSelectedDraftChangeId;
			surfaceMode = 'compare';
			return;
		}
		if (selectedDraftChangeId == null || !list.some((d) => d._id === selectedDraftChangeId)) {
			selectedDraftChangeId = list[0]!._id;
		}
	});

	$effect(() => {
		const draft = selectedDraft;
		if (
			!draft ||
			!draft.needsHydration ||
			draft.isStale ||
			hydratingDraftChangeId === draft._id ||
			busyDraftChangeId === draft._id
		) {
			return;
		}

		hydratingDraftChangeId = draft._id;
		void getConvexClient()
			.mutation(hydrateArtifactDraftChangeReviewDataMutation, { draftChangeId: draft._id })
			.catch((error) => {
				console.error(error);
			})
			.finally(() => {
				if (hydratingDraftChangeId === draft._id) {
					hydratingDraftChangeId = '';
				}
			});
	});

	const applyDraftChange = async (draftChangeId: Id<'artifactDraftChanges'>) => {
		if (busyDraftChangeId) return;

		draftError = '';
		busyDraftChangeId = draftChangeId;
		const draft = pendingDraftChanges.find((item) => item._id === draftChangeId);
		if (draft?.isStale) {
			draftError = draft.staleReason ?? 'This draft is stale and cannot be applied.';
			busyDraftChangeId = '';
			return;
		}

		try {
			await getConvexClient().mutation(applyArtifactDraftChangeMutation, { draftChangeId });
			if (draft) queueArtifactMemorySync(draft.artifactId);
		} catch (error) {
			console.error(error);
			draftError = getDraftErrorMessage(error, 'apply');
		} finally {
			busyDraftChangeId = '';
		}
	};

	const discardDraftChange = async (draftChangeId: Id<'artifactDraftChanges'>) => {
		if (busyDraftChangeId) return;

		draftError = '';
		busyDraftChangeId = draftChangeId;

		try {
			await getConvexClient().mutation(discardArtifactDraftChangeMutation, { draftChangeId });
		} catch (error) {
			console.error(error);
			draftError = getDraftErrorMessage(error, 'discard');
		} finally {
			busyDraftChangeId = '';
		}
	};

	const setReadSurface = () => {
		if (!artifact) return;
		surfaceMode = 'read';
		saveError = '';
	};

	const setCompareSurface = () => {
		if (!artifact || !canCompare) return;
		surfaceMode = 'compare';
		saveError = '';
	};

	const setEditorMode = () => {
		if (!artifact) return;
		readMode = 'editor';
		saveError = '';
	};

	const setPreviewMode = () => {
		readMode = 'preview';
		saveError = '';
	};

	const saveChanges = async () => {
		if (!artifact || !canSave) return;

		isSaving = true;
		saveError = '';

		try {
			await getConvexClient().mutation(updateArtifactMutation, {
				artifactId: artifact._id,
				contentMarkdown: editorValue
			});
			contentDirty = false;
			queueArtifactMemorySync(artifact._id);
		} catch (error) {
			console.error(error);
			saveError = 'Could not save this artifact. Please try again.';
		} finally {
			isSaving = false;
		}
	};

	const selectDraftForCompare = (draftChangeId: Id<'artifactDraftChanges'>) => {
		selectedDraftChangeId = draftChangeId;
		surfaceMode = 'compare';
	};

	const setUnifiedDiffLayout = () => {
		diffLayout = 'unified';
	};

	const setSplitDiffLayout = () => {
		diffLayout = 'split';
	};

	function getDraftErrorMessage(error: unknown, action: 'apply' | 'discard') {
		const message = error instanceof Error ? error.message : '';
		if (message.toLowerCase().includes('stale')) {
			return 'This draft is stale because the artifact changed after the draft was created.';
		}
		return action === 'apply'
			? 'Could not apply this draft. Please try again.'
			: 'Could not discard this draft. Please try again.';
	}

	function queueArtifactMemorySync(artifactId: Id<'artifacts'>) {
		if (!auth.token) return;

		void fetch('/api/workspace/memory/artifact', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${auth.token}`
			},
			body: JSON.stringify({ artifactId })
		})
			.then(async (response) => {
				const body = await response.json().catch(() => null);
				if (!response.ok) {
					console.info('Artifact memory sync failed', body ?? response.statusText);
					return;
				}

				const status = body?.result?.status;
				if (status && status !== 'synced' && status !== 'disabled') {
					console.info('Artifact memory sync skipped', body.result);
				}
			})
			.catch((error) => {
				console.info('Artifact memory sync skipped', error);
			});
	}

	$effect(() => {
		if (showHeader === false || artifact === undefined || artifact === null) {
			workspaceArtifactChrome.value = null;
			return;
		}

		workspaceArtifactChrome.value = {
			onBack,
			surfaceMode,
			canCompare,
			setRead: setReadSurface,
			setCompare: setCompareSurface
		};

		return () => {
			workspaceArtifactChrome.value = null;
		};
	});
</script>

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
		<div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
			<div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
				<div
					class={fullWidthContent
						? 'space-y-6'
						: compact
							? 'space-y-5'
							: 'mx-auto max-w-3xl space-y-6'}
				>
					{#if draftChanges.data === undefined}
						<div>
							<p class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
								Pending drafts
							</p>
							<p class="mt-1 text-xs text-muted-foreground">Loading drafts...</p>
						</div>
					{:else if pendingDraftChanges.length > 0 || draftError}
						<ArtifactDraftList
							drafts={pendingDraftChanges}
							{selectedDraftChangeId}
							{busyDraftChangeId}
							{draftError}
							onSelect={selectDraftForCompare}
							onApply={applyDraftChange}
							onDiscard={discardDraftChange}
						/>
					{/if}

					<div class="min-h-0 flex-1">
						{#if surfaceMode === 'compare'}
							<ArtifactReviewSurface
								{artifact}
								{selectedDraft}
								{compact}
								{diffLayout}
								{hydratingDraftChangeId}
								{busyDraftChangeId}
								onSetUnified={setUnifiedDiffLayout}
								onSetSplit={setSplitDiffLayout}
								onApply={applyDraftChange}
								onDiscard={discardDraftChange}
							/>
						{:else}
							<ArtifactReadSurface
								artifactId={artifact._id}
								value={editorValue}
								{compact}
								{readMode}
								{saveError}
								onChange={(nextValue) => {
									editorValue = nextValue;
									contentDirty = true;
								}}
							/>
						{/if}
					</div>
				</div>
			</div>

			{#if surfaceMode === 'read'}
				<div
					class="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-border/50 bg-background {compact
						? 'px-2 py-1.5'
						: 'px-4 py-1.5'}"
				>
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
					<Button
						type="button"
						variant="default"
						size="sm"
						class="h-7 gap-1.5 px-2.5 text-xs"
						disabled={!canSave}
						onclick={saveChanges}
					>
						<HugeiconsIcon icon={SaveIcon} strokeWidth={2} class="size-3.5" />
						{isSaving ? 'Saving...' : 'Save'}
					</Button>
				</div>
			{/if}
		</div>
	{/if}
</section>
