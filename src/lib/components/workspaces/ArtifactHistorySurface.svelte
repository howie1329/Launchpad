<script lang="ts">
	import type { ArtifactVersion, SavedArtifact } from '$lib/artifacts';
	import {
		artifactVersionActorLabel,
		artifactVersionSourceLabel,
		artifactVersionSummary,
		artifactVersionTimestamp
	} from '$lib/artifact-versions';
	import ArtifactDiffRendererDiffs from '$lib/components/workspaces/ArtifactDiffRendererDiffs.svelte';
	import { Button } from '$lib/components/ui/button';
	import { NativeSelect, NativeSelectOption } from '$lib/components/ui/native-select';
	import { cn } from '$lib/utils';
	import type { Id } from '../../../convex/_generated/dataModel';

	let {
		artifact,
		versions,
		selectedVersion,
		compareBaseVersion,
		compact = false,
		restoringVersionId = '',
		onSelectVersion,
		onSelectCompareBase,
		onRestore
	}: {
		artifact: SavedArtifact;
		versions: ArtifactVersion[];
		selectedVersion: ArtifactVersion | undefined;
		compareBaseVersion: ArtifactVersion | undefined;
		compact?: boolean;
		restoringVersionId?: string;
		onSelectVersion: (versionId: Id<'artifactVersions'>) => void;
		onSelectCompareBase: (versionId: Id<'artifactVersions'>) => void;
		onRestore: (versionId: Id<'artifactVersions'>) => void;
	} = $props();

	const compareBaseOptions = $derived.by(() => {
		if (!selectedVersion) return [];
		return versions.filter((version) => version.versionNumber < selectedVersion.versionNumber);
	});

	const compareBaseValue = $derived(compareBaseVersion?._id ?? '');
	let diffStyle = $state<'unified' | 'split'>('unified');
	const canRestoreSelected = $derived(
		Boolean(selectedVersion && selectedVersion.versionNumber !== artifact.revision)
	);
	const hasBodyChanges = $derived.by(() =>
		Boolean(
			selectedVersion &&
			compareBaseVersion &&
			compareBaseVersion.contentMarkdown !== selectedVersion.contentMarkdown
		)
	);
	function asMarkdownFileName(title: string) {
		const trimmed = title.trim();
		if (!trimmed) return 'artifact.md';
		return trimmed.toLowerCase().endsWith('.md') ? trimmed : `${trimmed}.md`;
	}
</script>

<div class={compact ? 'space-y-4' : 'space-y-5'}>
	<div class={compact ? 'space-y-4' : 'grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]'}>
		<section class="space-y-2">
			<div class="px-1">
				<p class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
					Version history
				</p>
				<p class="mt-1 text-xs text-muted-foreground">
					Every saved artifact edit becomes a version you can compare or restore.
				</p>
			</div>
			<div class="space-y-1">
				{#each versions as version (version._id)}
					<button
						type="button"
						class={cn(
							'w-full rounded-md px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
							selectedVersion?._id === version._id ? 'bg-accent font-medium' : 'hover:bg-accent/50'
						)}
						onclick={() => onSelectVersion(version._id)}
					>
						<div class="flex items-center justify-between gap-2">
							<p class="text-xs font-medium text-foreground">Version {version.versionNumber}</p>
							{#if version.versionNumber === artifact.revision}
								<span class="text-[10px] text-muted-foreground">Current</span>
							{/if}
						</div>
						<p class="mt-1 text-[11px] text-muted-foreground">
							{artifactVersionActorLabel(version)} via {artifactVersionSourceLabel(version)}
						</p>
						<p class="mt-1 text-[11px] text-muted-foreground">
							{artifactVersionTimestamp(version)}
						</p>
						<p class="mt-1 text-[11px] leading-4 text-foreground">
							{artifactVersionSummary(version)}
						</p>
					</button>
				{/each}
			</div>
		</section>

		<section class="min-w-0 space-y-3">
			{#if selectedVersion}
				<div
					class="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-1 pb-2"
				>
					<div class="space-y-1">
						<p class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
							Compare
						</p>
						<p class="text-xs text-foreground">
							Version {selectedVersion.versionNumber}
							{#if compareBaseVersion}
								against version {compareBaseVersion.versionNumber}
							{/if}
						</p>
					</div>

					<div class="flex flex-wrap items-center gap-2">
						<div class="inline-flex items-center rounded-md border border-border/70 p-0.5">
							<Button
								type="button"
								size="sm"
								variant={diffStyle === 'unified' ? 'secondary' : 'ghost'}
								class="h-7 rounded-sm px-2 text-xs font-medium"
								onclick={() => {
									diffStyle = 'unified';
								}}
							>
								Unified
							</Button>
							<Button
								type="button"
								size="sm"
								variant={diffStyle === 'split' ? 'secondary' : 'ghost'}
								class="h-7 rounded-sm px-2 text-xs font-medium"
								onclick={() => {
									diffStyle = 'split';
								}}
							>
								Split
							</Button>
						</div>
						<NativeSelect
							value={compareBaseValue}
							size="sm"
							class="min-w-44"
							disabled={compareBaseOptions.length === 0}
							onchange={(event) => {
								const target = event.currentTarget as HTMLSelectElement;
								if (target.value) onSelectCompareBase(target.value as Id<'artifactVersions'>);
							}}
						>
							{#if compareBaseOptions.length === 0}
								<NativeSelectOption value="">No earlier version</NativeSelectOption>
							{:else}
								{#each compareBaseOptions as version (version._id)}
									<NativeSelectOption value={version._id}>
										Version {version.versionNumber}
									</NativeSelectOption>
								{/each}
							{/if}
						</NativeSelect>

						<Button
							type="button"
							variant="ghost"
							size="sm"
							class="h-8 px-3 text-xs"
							disabled={!canRestoreSelected || restoringVersionId === selectedVersion._id}
							onclick={() => onRestore(selectedVersion._id)}
						>
							{restoringVersionId === selectedVersion._id ? 'Restoring...' : 'Restore version'}
						</Button>
					</div>
				</div>

				{#if compareBaseVersion}
					{#if compareBaseVersion.title !== selectedVersion.title}
						<div class="border-b border-border/50 px-1 pb-3">
							<p class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
								Title change
							</p>
							<div class="mt-2 grid gap-3 md:grid-cols-2">
								<div>
									<p class="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
										Version {compareBaseVersion.versionNumber}
									</p>
									<p class="mt-1 text-sm font-medium text-foreground">{compareBaseVersion.title}</p>
								</div>
								<div>
									<p class="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
										Version {selectedVersion.versionNumber}
									</p>
									<p class="mt-1 text-sm font-medium text-foreground">{selectedVersion.title}</p>
								</div>
							</div>
						</div>
					{/if}

					{#if hasBodyChanges}
						<div class={cn(compact ? 'min-h-[14rem]' : 'min-h-[20rem]', 'pt-1')}>
							{#key `${selectedVersion._id}-${compareBaseVersion._id}`}
								<ArtifactDiffRendererDiffs
									original={compareBaseVersion.contentMarkdown}
									modified={selectedVersion.contentMarkdown}
									oldFileName={asMarkdownFileName(compareBaseVersion.title)}
									newFileName={asMarkdownFileName(selectedVersion.title)}
									{diffStyle}
									{compact}
								/>
							{/key}
						</div>
					{:else}
						<div class="px-1 py-2">
							<p class="text-sm font-medium text-foreground">No body changes</p>
							<p class="mt-1 text-xs leading-5 text-muted-foreground">
								Version {selectedVersion.versionNumber} and version
								{compareBaseVersion.versionNumber} have identical body content.
							</p>
						</div>
					{/if}
				{:else}
					<div class="px-1 py-2">
						<p class="text-sm font-medium text-foreground">No earlier version to compare</p>
						<p class="mt-1 text-xs leading-5 text-muted-foreground">
							Version {selectedVersion.versionNumber} is the first saved version for this artifact.
						</p>
					</div>
				{/if}
			{:else}
				<p class="text-xs text-muted-foreground">No version selected.</p>
			{/if}
		</section>
	</div>
</div>
