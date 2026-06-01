<script lang="ts">
	import { auth, getConvexClient } from '$lib/auth.svelte';
	import {
		listArtifactVersionsQuery,
		restoreArtifactVersionMutation,
		updateArtifactMutation,
		type ArtifactLinkReason,
		type SavedArtifact
	} from '$lib/artifacts';
	import ArtifactHistorySurface from '$lib/components/workspaces/ArtifactHistorySurface.svelte';
	import ArtifactReadSurface from '$lib/components/workspaces/ArtifactReadSurface.svelte';
	import { Button } from '$lib/components/ui/button';
	import { workspaceArtifactChrome } from '$lib/workspace-artifact-chrome.svelte';
	import { beforeNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import { SaveIcon } from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { useQuery } from 'convex-svelte';
	import { onMount } from 'svelte';
	import type { Id } from '../../../convex/_generated/dataModel';

	let {
		artifact,
		compact = false,
		fullWidthContent = false,
		initialSelectedVersionNumber = null,
		showHeader,
		onBack
	}: {
		artifact: SavedArtifact | null | undefined;
		compact?: boolean;
		fullWidthContent?: boolean;
		initialSelectedVersionNumber?: number | null;
		showHeader?: boolean;
		linkReason?: ArtifactLinkReason;
		onBack?: () => void;
	} = $props();

	type SurfaceMode = 'read' | 'history';
	type ReadSubMode = 'editor' | 'preview';

	let editorValue = $state('');
	let contentDirty = $state(false);
	let saveError = $state('');
	let isSaving = $state(false);
	let isRestoringVersionId = $state('');
	let surfaceMode = $state<SurfaceMode>('read');
	let readMode = $state<ReadSubMode>('editor');
	let selectedVersionId = $state<Id<'artifactVersions'> | null>(null);
	let compareBaseVersionId = $state<Id<'artifactVersions'> | null>(null);
	let editorBaseRevision = $state<number | null>(null);
	let hydratedArtifactId = $state<Id<'artifacts'> | null>(null);
	let initialVersionSelectionApplied = $state(false);

	const artifactVersions = useQuery(listArtifactVersionsQuery, () =>
		auth.isAuthenticated && artifact ? { artifactId: artifact._id as Id<'artifacts'> } : 'skip'
	);

	const versions = $derived(artifactVersions.data ?? []);
	const selectedVersion = $derived(
		selectedVersionId == null
			? versions[0]
			: versions.find((version) => version._id === selectedVersionId)
	);
	const compareBaseVersion = $derived(
		compareBaseVersionId == null
			? undefined
			: versions.find((version) => version._id === compareBaseVersionId)
	);
	const canShowHistory = $derived(versions.length > 0);
	const canSave = $derived(
		Boolean(artifact) &&
			surfaceMode === 'read' &&
			readMode === 'editor' &&
			editorValue.trim().length > 0 &&
			editorValue !== (artifact?.contentMarkdown ?? '') &&
			!isSaving
	);
	const newerSavedVersionAvailable = $derived(
		Boolean(
			contentDirty &&
			artifact &&
			editorBaseRevision !== null &&
			artifact.revision > editorBaseRevision
		)
	);
	const updatedAtLabel = $derived(
		artifact
			? new Date(artifact.updatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
			: ''
	);
	const saveStateLabel = $derived.by(() => {
		if (saveError) return 'Save failed';
		if (isSaving) return 'Saving…';
		if (contentDirty) return 'Unsaved changes';
		return 'Saved';
	});

	$effect(() => {
		if (artifact === undefined || artifact === null) {
			hydratedArtifactId = null;
			editorBaseRevision = null;
			return;
		}

		if (hydratedArtifactId !== artifact._id) {
			hydratedArtifactId = artifact._id;
			editorValue = artifact.contentMarkdown;
			contentDirty = false;
			saveError = '';
			surfaceMode = initialSelectedVersionNumber ? 'history' : 'read';
			readMode = fullWidthContent ? 'preview' : 'editor';
			selectedVersionId = null;
			compareBaseVersionId = null;
			editorBaseRevision = artifact.revision;
			initialVersionSelectionApplied = false;
			return;
		}

		if (!contentDirty) {
			editorValue = artifact.contentMarkdown;
			saveError = '';
			editorBaseRevision = artifact.revision;
		}
	});

	$effect(() => {
		if (versions.length === 0) {
			selectedVersionId = null;
			compareBaseVersionId = null;
			if (surfaceMode === 'history') {
				surfaceMode = 'read';
			}
			return;
		}

		if (!initialVersionSelectionApplied && initialSelectedVersionNumber !== null) {
			const match = versions.find(
				(version) => version.versionNumber === initialSelectedVersionNumber
			);
			if (match) {
				selectedVersionId = match._id;
				surfaceMode = 'history';
			}
			initialVersionSelectionApplied = true;
		}

		if (
			selectedVersionId == null ||
			!versions.some((version) => version._id === selectedVersionId)
		) {
			selectedVersionId = versions[0]!._id;
		}
	});

	$effect(() => {
		const current = selectedVersion;
		if (!current) {
			compareBaseVersionId = null;
			return;
		}

		const availableBaseVersions = versions.filter(
			(version) => version.versionNumber < current.versionNumber
		);

		if (availableBaseVersions.length === 0) {
			compareBaseVersionId = null;
			return;
		}

		if (
			compareBaseVersionId == null ||
			!availableBaseVersions.some((version) => version._id === compareBaseVersionId)
		) {
			compareBaseVersionId = availableBaseVersions[0]!._id;
		}
	});

	const setReadSurface = () => {
		if (!artifact) return;
		surfaceMode = 'read';
		saveError = '';
	};

	const setHistorySurface = () => {
		if (!artifact || !canShowHistory) return;
		surfaceMode = 'history';
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
			const result = await getConvexClient().mutation(updateArtifactMutation, {
				artifactId: artifact._id,
				contentMarkdown: editorValue
			});
			contentDirty = false;
			editorBaseRevision = result.versionNumber;
			queueArtifactMemorySync(artifact._id);
		} catch (error) {
			console.error(error);
			saveError = 'Could not save this artifact. Please try again.';
		} finally {
			isSaving = false;
		}
	};

	onMount(() => {
		const onKeydown = (event: KeyboardEvent) => {
			if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return;
			if (surfaceMode !== 'read' || readMode !== 'editor') return;

			event.preventDefault();
			void saveChanges();
		};

		const onBeforeUnload = (event: BeforeUnloadEvent) => {
			if (!contentDirty) return;
			event.preventDefault();
			event.returnValue = '';
		};

		window.addEventListener('keydown', onKeydown);
		window.addEventListener('beforeunload', onBeforeUnload);

		return () => {
			window.removeEventListener('keydown', onKeydown);
			window.removeEventListener('beforeunload', onBeforeUnload);
		};
	});

	if (browser) {
		beforeNavigate((navigation) => {
			if (!contentDirty) return;
			if (window.confirm('Discard unsaved artifact changes?')) return;
			navigation.cancel();
		});
	}

	const restoreVersion = async (artifactVersionId: Id<'artifactVersions'>) => {
		if (!artifact || isRestoringVersionId) return;

		isRestoringVersionId = artifactVersionId;
		saveError = '';

		try {
			const result = await getConvexClient().mutation(restoreArtifactVersionMutation, {
				artifactVersionId
			});
			if (result.restored) {
				queueArtifactMemorySync(artifact._id);
				surfaceMode = 'history';
			}
		} catch (error) {
			console.error(error);
			saveError = 'Could not restore this version. Please try again.';
		} finally {
			isRestoringVersionId = '';
		}
	};

	const reloadEditorToLatest = () => {
		if (!artifact) return;
		editorValue = artifact.contentMarkdown;
		contentDirty = false;
		editorBaseRevision = artifact.revision;
		saveError = '';
	};

	const viewLatestChanges = () => {
		if (!canShowHistory) return;
		selectedVersionId = versions[0]?._id ?? null;
		surfaceMode = 'history';
	};

	const selectVersion = (versionId: Id<'artifactVersions'>) => {
		selectedVersionId = versionId;
		surfaceMode = 'history';
	};

	const selectCompareBase = (versionId: Id<'artifactVersions'>) => {
		compareBaseVersionId = versionId;
	};

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
			canHistory: canShowHistory,
			setRead: setReadSurface,
			setHistory: setHistorySurface
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
			<header class="shrink-0 border-b border-border/70 bg-background px-4 py-3">
				<div
					class={fullWidthContent ? 'mx-auto flex max-w-6xl flex-col gap-3' : 'flex flex-col gap-3'}
				>
					<div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
						<div class="min-w-0 space-y-1">
							<div class="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
								<span class="rounded-md bg-muted px-1.5 py-0.5 text-foreground"
									>{artifact.type}</span
								>
								<span>Revision {artifact.revision}</span>
								<span>Updated {updatedAtLabel}</span>
							</div>
							<h1 class="truncate text-lg font-semibold tracking-tight text-balance">
								{artifact.title}
							</h1>
						</div>

						<div class="flex flex-wrap items-center gap-2">
							<p
								class={saveError
									? 'text-xs text-destructive'
									: contentDirty
										? 'text-xs text-foreground'
										: 'text-xs text-muted-foreground'}
								role="status"
							>
								{saveStateLabel}
							</p>
							<Button
								type="button"
								variant="default"
								size="sm"
								class="h-7 gap-1.5 px-2.5 text-xs"
								disabled={!canSave}
								onclick={saveChanges}
							>
								<HugeiconsIcon icon={SaveIcon} strokeWidth={2} class="size-3.5" />
								{isSaving ? 'Saving…' : 'Save changes'}
							</Button>
						</div>
					</div>

					<div class="flex flex-wrap items-center gap-2">
						<div class="inline-flex items-center rounded-md border border-border/70 p-0.5">
							<Button
								type="button"
								size="sm"
								variant={surfaceMode === 'read' ? 'secondary' : 'ghost'}
								class="h-7 rounded-sm px-2.5 text-xs font-medium"
								onclick={setReadSurface}
							>
								Document
							</Button>
							<Button
								type="button"
								size="sm"
								variant={surfaceMode === 'history' ? 'secondary' : 'ghost'}
								class="h-7 rounded-sm px-2.5 text-xs font-medium"
								disabled={!canShowHistory}
								onclick={setHistorySurface}
							>
								History
							</Button>
						</div>

						{#if surfaceMode === 'read'}
							<div class="inline-flex items-center rounded-md border border-border/70 p-0.5">
								<Button
									type="button"
									size="sm"
									variant={readMode === 'preview' ? 'secondary' : 'ghost'}
									class="h-7 rounded-sm px-2.5 text-xs font-medium"
									onclick={setPreviewMode}
								>
									Preview
								</Button>
								<Button
									type="button"
									size="sm"
									variant={readMode === 'editor' ? 'secondary' : 'ghost'}
									class="h-7 rounded-sm px-2.5 text-xs font-medium"
									onclick={setEditorMode}
								>
									Edit
								</Button>
							</div>
						{/if}
					</div>
				</div>
			</header>

			<div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
				<div
					class={fullWidthContent
						? 'mx-auto max-w-6xl space-y-6'
						: compact
							? 'space-y-5'
							: 'mx-auto max-w-5xl space-y-6'}
				>
					{#if newerSavedVersionAvailable}
						<div class="rounded-lg border border-border/70 bg-muted/30 px-4 py-3">
							<p class="text-sm font-medium text-foreground">A newer saved version is available</p>
							<p class="mt-1 text-xs leading-5 text-muted-foreground">
								Review history before saving if this artifact was changed elsewhere. Your unsaved
								editor changes are still here.
							</p>
							<div class="mt-3 flex flex-wrap gap-2">
								<Button type="button" variant="secondary" size="sm" onclick={viewLatestChanges}>
									Review history
								</Button>
								<Button type="button" variant="ghost" size="sm" onclick={reloadEditorToLatest}>
									Reload latest
								</Button>
							</div>
						</div>
					{/if}

					<div class="min-h-0 flex-1">
						{#if surfaceMode === 'history'}
							<ArtifactHistorySurface
								{artifact}
								{versions}
								{selectedVersion}
								{compareBaseVersion}
								{compact}
								restoringVersionId={isRestoringVersionId}
								onSelectVersion={selectVersion}
								onSelectCompareBase={selectCompareBase}
								onRestore={restoreVersion}
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
									contentDirty = nextValue !== (artifact?.contentMarkdown ?? '');
								}}
							/>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}
</section>
