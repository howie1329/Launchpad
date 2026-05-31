<script lang="ts">
	import { page } from '$app/stores';
	import { auth, getConvexClient } from '$lib/auth.svelte';
	import {
		getExternalContextImportDraftQuery,
		startExternalContextImportDraftReviewMutation,
		updateExternalContextImportDraftReviewMutation
	} from '$lib/external-context-imports';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { useQuery } from 'convex-svelte';
	import type { Id } from '../../../../../convex/_generated/dataModel';

	const draftId = $derived($page.params.draftId?.trim() ?? '');
	const draft = useQuery(getExternalContextImportDraftQuery, () =>
		auth.isAuthenticated && draftId
			? { draftId: draftId as Id<'externalContextImportDrafts'> }
			: 'skip'
	);
	const isLoading = $derived(draft.data === undefined && !draft.error);
	const isMissing = $derived(draft.data === null || Boolean(draft.error));
	let projectName = $state('');
	let projectSummary = $state('');
	let projectBriefMarkdown = $state('');
	let syncedDraftKey = $state('');
	let saveError = $state('');
	let retryError = $state('');
	let isSaving = $state(false);
	let isRetrying = $state(false);

	$effect(() => {
		const row = draft.data;
		const draftKey = row ? `${row._id}:${row.status}:${row.updatedAt}` : '';
		if (!row || draftKey === syncedDraftKey || row.status === 'processing') return;

		projectName = row.generatedProjectName ?? '';
		projectSummary = row.generatedProjectSummary ?? '';
		projectBriefMarkdown = row.generatedProjectBriefMarkdown ?? '';
		syncedDraftKey = draftKey;
		saveError = '';
		retryError = '';
	});

	const hasReviewChanges = $derived(
		Boolean(
			draft.data &&
			(projectName !== (draft.data.generatedProjectName ?? '') ||
				projectSummary !== (draft.data.generatedProjectSummary ?? '') ||
				projectBriefMarkdown !== (draft.data.generatedProjectBriefMarkdown ?? ''))
		)
	);

	const canSaveReview = $derived(
		Boolean(
			draft.data &&
			draft.data.status === 'ready' &&
			projectName.trim() &&
			projectBriefMarkdown.trim() &&
			hasReviewChanges
		)
	);

	function statusLabel(status: string) {
		switch (status) {
			case 'pending':
				return 'Pending review';
			case 'processing':
				return 'Processing';
			case 'ready':
				return 'Ready to review';
			case 'failed':
				return 'Failed';
			case 'created':
				return 'Project created';
			case 'abandoned':
				return 'Abandoned';
			default:
				return status;
		}
	}

	async function saveReview() {
		if (!draft.data || !canSaveReview || isSaving) return;

		isSaving = true;
		saveError = '';
		try {
			await getConvexClient().mutation(updateExternalContextImportDraftReviewMutation, {
				draftId: draft.data._id,
				generatedProjectName: projectName,
				generatedProjectSummary: projectSummary,
				generatedProjectBriefMarkdown: projectBriefMarkdown
			});
			syncedDraftKey = '';
		} catch (error) {
			console.error(error);
			saveError =
				error instanceof Error && error.message ? error.message : 'Could not save review changes.';
		} finally {
			isSaving = false;
		}
	}

	async function retryReview() {
		if (!draft.data || isRetrying) return;

		isRetrying = true;
		retryError = '';
		try {
			await getConvexClient().mutation(startExternalContextImportDraftReviewMutation, {
				draftId: draft.data._id
			});
		} catch (error) {
			console.error(error);
			retryError =
				error instanceof Error && error.message ? error.message : 'Could not retry import review.';
		} finally {
			isRetrying = false;
		}
	}
</script>

<svelte:head>
	<title>External Context Import | Workspace | Launchpad</title>
	<meta name="description" content="Review an external AI context import draft." />
</svelte:head>

{#if isLoading}
	<div class="flex h-full min-h-0 flex-1 items-center justify-center px-4 py-8 text-center">
		<div>
			<p class="text-sm font-semibold tracking-tight">Loading import</p>
			<p class="mt-2 text-xs leading-5 text-muted-foreground">Checking import access...</p>
		</div>
	</div>
{:else if isMissing}
	<div class="flex h-full min-h-0 flex-1 items-center justify-center px-4 py-8 text-center">
		<div class="max-w-sm">
			<p class="text-sm font-semibold tracking-tight">Import not available</p>
			<p class="mt-2 text-xs leading-5 text-muted-foreground">
				This import draft does not exist or you no longer have access to it.
			</p>
		</div>
	</div>
{:else if draft.data}
	<div class="h-full min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
		<div class="mx-auto flex max-w-5xl flex-col gap-5">
			<header class="border-b pb-4">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
							External AI context import
						</p>
						<h1 class="mt-1 text-xl font-semibold tracking-tight">
							{draft.data.generatedProjectName || 'Imported project draft'}
						</h1>
					</div>
					<span class="rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
						{statusLabel(draft.data.status)}
					</span>
				</div>
				{#if draft.data.generatedProjectSummary}
					<p class="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
						{draft.data.generatedProjectSummary}
					</p>
				{/if}
			</header>

			{#if draft.data.status === 'failed'}
				<section class="rounded-md border border-destructive/30 bg-destructive/10 p-4">
					<p class="text-sm font-semibold text-destructive">Import review failed</p>
					<p class="mt-2 text-sm leading-6 text-destructive">
						{draft.data.errorMessage || 'The synthesis step did not complete.'}
					</p>
					<div class="mt-3 flex flex-wrap items-center gap-2">
						<Button type="button" size="sm" disabled={isRetrying} onclick={retryReview}>
							{isRetrying ? 'Retrying...' : 'Retry review'}
						</Button>
						{#if retryError}
							<p class="text-xs text-destructive">{retryError}</p>
						{/if}
					</div>
				</section>
			{/if}

			{#if draft.data.status === 'processing'}
				<section class="rounded-md border bg-muted/20 p-4">
					<p class="text-sm font-semibold tracking-tight">Reviewing imported context</p>
					<p class="mt-2 text-sm leading-6 text-muted-foreground">
						You can leave this page. Launchpad will notify you when the project draft is ready.
					</p>
				</section>
			{:else if draft.data.status === 'ready' || draft.data.generatedProjectBriefMarkdown}
				<form
					class="grid gap-4"
					onsubmit={(event) => {
						event.preventDefault();
						void saveReview();
					}}
				>
					<div class="grid gap-3 sm:grid-cols-[1fr_1fr]">
						<div class="space-y-1.5">
							<Label for="import-project-name">Project name</Label>
							<Input
								id="import-project-name"
								bind:value={projectName}
								placeholder="Project name"
								disabled={isSaving}
							/>
						</div>
						<div class="space-y-1.5">
							<Label for="import-project-summary">Project summary</Label>
							<Textarea
								id="import-project-summary"
								bind:value={projectSummary}
								placeholder="Short project overview"
								class="min-h-24"
								disabled={isSaving}
							/>
						</div>
					</div>

					<div class="space-y-1.5">
						<Label for="import-project-brief">Project Brief</Label>
						<Textarea
							id="import-project-brief"
							bind:value={projectBriefMarkdown}
							placeholder="# Project Brief"
							class="min-h-[28rem] font-mono text-xs"
							disabled={isSaving}
						/>
					</div>

					<div class="flex flex-wrap items-center justify-between gap-3">
						{#if saveError}
							<p class="text-xs text-destructive">{saveError}</p>
						{:else}
							<p class="text-xs text-muted-foreground">
								Raw imported context is preserved separately below.
							</p>
						{/if}
						<Button type="submit" disabled={!canSaveReview || isSaving}>
							{isSaving ? 'Saving...' : 'Save changes'}
						</Button>
					</div>
				</form>
			{:else}
				<section class="rounded-md border bg-muted/20 p-4">
					<p class="text-sm font-semibold tracking-tight">Review output is not ready yet</p>
					<p class="mt-2 text-sm leading-6 text-muted-foreground">
						Start review from the import wizard, then return here when synthesis has begun.
					</p>
				</section>
			{/if}

			<section class="grid gap-2">
				<h2 class="text-sm font-semibold tracking-tight">Imported external context</h2>
				<pre
					class="max-h-[32rem] overflow-auto rounded-md border bg-background p-4 text-sm leading-6 whitespace-pre-wrap">{draft
						.data.sourceMarkdown}</pre>
			</section>
		</div>
	</div>
{/if}
