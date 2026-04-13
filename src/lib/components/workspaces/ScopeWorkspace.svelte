<script lang="ts">
	import { resolve } from '$app/paths';
	import { auth, getConvexClient } from '$lib/auth.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { NativeSelect, NativeSelectOption } from '$lib/components/ui/native-select';
	import { Separator } from '$lib/components/ui/separator';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Button } from '$lib/components/ui/button';
	import {
		getPrdQuery,
		listPrdGenerationsQuery,
		saveNewPrdMutation,
		savePrdGenerationMutation,
		type PrdGeneration
	} from '$lib/prds';
	import { useQuery } from 'convex-svelte';

	type Status = 'idle' | 'loading' | 'done' | 'error';
	type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
	type StartMode = 'full' | 'compact';

	type Prd = {
		problemStatement: string;
		targetUser: string;
		mustHaveFeatures: string[];
		outOfScope: string[];
		suggestedStack: string;
		fullMVPPlan: string;
		projectType: string;
	};

	const emptyPrd: Prd = {
		problemStatement: '',
		targetUser: '',
		mustHaveFeatures: [],
		outOfScope: [],
		suggestedStack: '',
		fullMVPPlan: '',
		projectType: 'personal'
	};

	const appTypes = ['web app', 'SaaS', 'mobile', 'CLI', 'API'];
	const projectTypes = ['personal', 'side project', 'resume project', 'client project'];

	let {
		startMode = 'full',
		selectedPrdId = null
	}: { startMode?: StartMode; selectedPrdId?: string | null } = $props();

	let idea = $state('');
	let appType = $state('web app');
	let preferredStack = $state('');
	let status = $state<Status>('idle');
	let saveStatus = $state<SaveStatus>('idle');
	let errorMessage = $state('');
	let saveErrorMessage = $state('');
	let copied = $state(false);
	let prd = $state<Prd>(emptyPrd);
	let projectType = $state('personal');
	let activePrdId = $state<string | null>(null);
	let activeVersion = $state<number | null>(null);
	let latestSavedVersion = $state(0);
	let loadedSelectionKey = $state('');
	let hasUnsavedGeneration = $state(false);

	const selectedPrd = useQuery(getPrdQuery, () =>
		auth.isAuthenticated && selectedPrdId ? { prdId: selectedPrdId } : 'skip'
	);
	const savedGenerations = useQuery(listPrdGenerationsQuery, () =>
		auth.isAuthenticated && activePrdId ? { prdId: activePrdId } : 'skip'
	);

	const trimmedIdea = $derived(idea.trim());
	const canSubmit = $derived(Boolean(trimmedIdea) && status !== 'loading');
	const hasResult = $derived(status === 'done');
	const showCompactStart = $derived(startMode === 'compact' && !hasResult);
	const hasSavedContext = $derived(Boolean(activePrdId));
	const canSave = $derived(
		hasResult && hasUnsavedGeneration && saveStatus !== 'saving' && auth.isAuthenticated
	);
	const saveButtonLabel = $derived(
		saveStatus === 'saving'
			? 'Saving...'
			: !hasUnsavedGeneration && activeVersion
				? `Saved v${activeVersion}`
				: hasSavedContext
				? `Save as v${latestSavedVersion + 1}`
				: 'Save PRD'
	);
	const selectedGenerationValue = $derived(
		activePrdId && activeVersion ? `${activePrdId}:${activeVersion}` : ''
	);
	const briefMeta = $derived([
		{ label: 'App type', value: appType },
		{ label: 'Project type', value: projectType },
		{ label: 'Stack', value: preferredStack.trim() || 'Not specified' },
		{ label: 'Version', value: activeVersion ? `v${activeVersion}` : 'Unsaved' }
	]);
	const prdSections = $derived([
		{
			id: 'problem',
			label: 'Problem',
			title: 'Problem statement',
			value: prd.problemStatement
		},
		{
			id: 'user',
			label: 'User',
			title: 'Target user',
			value: prd.targetUser
		},
		{
			id: 'features',
			label: 'Must-haves',
			title: 'Must-have features',
			items: prd.mustHaveFeatures
		},
		{
			id: 'scope',
			label: 'Out of scope',
			title: 'Out of scope',
			items: prd.outOfScope
		},
		{
			id: 'stack',
			label: 'Stack',
			title: 'Suggested stack',
			value: prd.suggestedStack
		},
		{
			id: 'plan',
			label: 'Week 1',
			title: 'One-week build plan',
			value: prd.fullMVPPlan
		}
	]);

	const formatMarkdown = () => {
		const lines = [
			'# MVP PRD',
			'',
			'## Problem Statement',
			prd.problemStatement,
			'',
			'## Target User',
			prd.targetUser,
			'',
			'## Must-Have Features',
			...prd.mustHaveFeatures.map((feature) => `- ${feature}`),
			'',
			'## Out of Scope',
			...prd.outOfScope.map((item) => `- ${item}`),
			'',
			'## Suggested Stack',
			prd.suggestedStack,
			'',
			'## One-Week Build Plan',
			prd.fullMVPPlan
		];

		return lines.join('\n').trim();
	};

	const copyMarkdown = async () => {
		await navigator.clipboard.writeText(formatMarkdown());
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 1600);
	};

	const savePrd = async () => {
		if (!hasResult || !hasUnsavedGeneration || saveStatus === 'saving') return;

		if (!auth.isAuthenticated) {
			saveStatus = 'error';
			saveErrorMessage = 'Sign in to save PRDs.';
			return;
		}

		saveStatus = 'saving';
		saveErrorMessage = '';

		const args = {
			idea: trimmedIdea,
			appType,
			projectType,
			preferredStack: preferredStack.trim(),
			output: prd
		};

		try {
			const result = activePrdId
				? await getConvexClient().mutation(savePrdGenerationMutation, {
						prdId: activePrdId,
						...args
					})
				: await getConvexClient().mutation(saveNewPrdMutation, args);

			activePrdId = result.prdId;
			activeVersion = result.version;
			latestSavedVersion = result.version;
			hasUnsavedGeneration = false;
			saveStatus = 'saved';
		} catch (error) {
			console.error(error);
			saveStatus = 'error';
			saveErrorMessage = 'Error saving PRD. Please try again.';
		}
	};

	const loadGeneration = (generation: PrdGeneration) => {
		activePrdId = generation.prdId;
		activeVersion = generation.version;
		idea = generation.idea;
		appType = generation.appType;
		projectType = generation.projectType;
		preferredStack = generation.preferredStack;
		prd = generation.output;
		status = 'done';
		errorMessage = '';
		saveErrorMessage = '';
		saveStatus = 'idle';
		hasUnsavedGeneration = false;
	};

	const selectGeneration = (value: string) => {
		const generation = savedGenerations.data?.find(
			(item) => `${item.prdId}:${item.version}` === value
		);
		if (generation) loadGeneration(generation);
	};

	const generatePrd = async () => {
		if (!canSubmit) return;

		status = 'loading';
		saveStatus = 'idle';
		errorMessage = '';
		saveErrorMessage = '';

		try {
			const response = await fetch('/api/scope', {
				method: 'POST',
				body: JSON.stringify({
					idea: trimmedIdea,
					appType,
					preferredStack: preferredStack.trim(),
					projectType: projectType.trim()
				}),
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				const data = await response.json();
				status = 'error';
				errorMessage = data.error ?? 'Error generating PRD. Please try again.';
				return;
			}

			prd = await response.json();
			status = 'done';
			activeVersion = null;
			hasUnsavedGeneration = true;
		} catch (error) {
			console.error(error);
			status = 'error';
			errorMessage = 'Error generating PRD. Please try again.';
		}
	};

	$effect(() => {
		const data = selectedPrd.data;
		const generation = data?.latestGeneration;
		if (!data || !generation) return;

		const selectionKey = `${data.prd._id}:${generation.version}:${generation._id}`;
		if (selectionKey === loadedSelectionKey) return;

		loadedSelectionKey = selectionKey;
		latestSavedVersion = data.prd.latestVersion;
		loadGeneration(generation);
	});
</script>

{#if showCompactStart}
	<div class="flex h-full min-h-0 overflow-hidden bg-background px-5 py-8 text-foreground">
		<form
			class="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col justify-center gap-4 overflow-y-auto"
			onsubmit={(event) => {
				event.preventDefault();
				generatePrd();
			}}
		>
			<div class="text-center">
				<p class="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
					MVP Creator
				</p>
				<h1 class="text-xl font-semibold tracking-tight">Start a new MVP scope</h1>
				<p class="mx-auto mt-2 max-w-md text-xs leading-5 text-muted-foreground">
					Describe the idea, choose a few defaults, then generate the first PRD.
				</p>
			</div>

			<div class="flex flex-col gap-2">
				<div class="flex items-center justify-between gap-3">
					<Label for="compact-idea">Idea</Label>
					<p class="text-[11px] text-muted-foreground">{idea.length} characters</p>
				</div>
				<Textarea
					id="compact-idea"
					bind:value={idea}
					aria-invalid={status === 'error' && !trimmedIdea}
					class="min-h-36 resize-none"
					placeholder="A lightweight tool that helps developers scope what to build first..."
				/>
			</div>

			<div class="grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-3">
				<div>
					<Label for="compact-project-type">Project type</Label>
					<NativeSelect id="compact-project-type" bind:value={projectType} class="w-full">
						{#each projectTypes as type (type)}
							<NativeSelectOption value={type}>{type}</NativeSelectOption>
						{/each}
					</NativeSelect>
				</div>
				<div>
					<Label for="compact-app-type">App type</Label>
					<NativeSelect id="compact-app-type" bind:value={appType} class="w-full">
						{#each appTypes as type (type)}
							<NativeSelectOption value={type}>{type}</NativeSelectOption>
						{/each}
					</NativeSelect>
				</div>
				<div>
					<Label for="compact-preferred-stack">Preferred stack</Label>
					<Input
						id="compact-preferred-stack"
						bind:value={preferredStack}
						placeholder="SvelteKit, Convex..."
					/>
				</div>
			</div>

			{#if status === 'error'}
				<p class="text-xs leading-5 text-destructive">{errorMessage}</p>
			{/if}

			<div class="flex items-center justify-between gap-3">
				<p class="text-[11px] text-muted-foreground">
					{activeVersion ? `Saved v${activeVersion}` : 'No saved PRD selected.'}
				</p>
				<Button type="submit" disabled={!canSubmit}>
					{status === 'loading' ? 'Generating...' : 'Generate PRD'}
				</Button>
			</div>
		</form>
	</div>
{:else}
	<div
		class="grid h-full min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-background text-foreground md:grid-cols-[22rem_minmax(0,1fr)] md:grid-rows-1"
	>
		<section
			class="min-h-0 overflow-y-auto border-b border-border/50 p-4 md:border-r md:border-b-0 md:p-5"
		>
			<form
				class="flex h-full min-h-0 flex-col gap-4"
				onsubmit={(event) => {
					event.preventDefault();
					generatePrd();
				}}
			>
				<div>
					<p class="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
						Idea brief
					</p>
					<h1 class="text-xl font-semibold tracking-tight">Scope the first version.</h1>
					<p class="mt-2 text-xs leading-5 text-muted-foreground">
						Add the raw idea, a basic app type, and the stack you want to use.
					</p>
				</div>

				<div class="flex min-h-0 flex-1 flex-col gap-2">
					<div class="flex items-center justify-between gap-3">
						<Label for="idea">Idea</Label>
						<p class="text-[11px] text-muted-foreground">{idea.length} characters</p>
					</div>
					<Textarea
						id="idea"
						bind:value={idea}
						aria-invalid={status === 'error' && !trimmedIdea}
						class="min-h-28 flex-1 md:min-h-0"
						placeholder="A lightweight tool that helps developers scope what to build first..."
					/>
				</div>

				<div class="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
					<div>
						<Label for="project-type">Project type</Label>
						<NativeSelect id="project-type" bind:value={projectType} class="w-full">
							{#each projectTypes as type (type)}
								<NativeSelectOption value={type}>{type}</NativeSelectOption>
							{/each}
						</NativeSelect>
					</div>
					<div class="flex flex-col gap-2">
						<Label for="app-type">App type</Label>
						<NativeSelect id="app-type" bind:value={appType} class="w-full">
							{#each appTypes as type (type)}
								<NativeSelectOption value={type}>{type}</NativeSelectOption>
							{/each}
						</NativeSelect>
					</div>

					<div class="flex flex-col gap-2">
						<Label for="preferred-stack">Preferred stack</Label>
						<Input
							id="preferred-stack"
							bind:value={preferredStack}
							placeholder="SvelteKit, Convex, Tailwind..."
						/>
					</div>
				</div>

				{#if status === 'error'}
					<p class="text-xs leading-5 text-destructive">{errorMessage}</p>
				{/if}

				<div class="flex items-center justify-between gap-3">
					<p class="text-[11px] text-muted-foreground">
						{hasResult
							? activeVersion
								? `Viewing saved v${activeVersion}`
								: 'PRD generated'
							: 'Saved PRDs will appear in the dashboard.'}
					</p>
					<Button type="submit" disabled={!canSubmit}>
						{status === 'loading' ? 'Generating...' : 'Generate PRD'}
					</Button>
				</div>
			</form>
		</section>

		<section class="flex min-h-0 min-w-0 flex-col overflow-hidden">
			<div
				class="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border/50 px-4 md:px-5"
			>
				<div class="min-w-0">
					<p class="truncate text-sm font-semibold tracking-tight">
						{hasResult ? 'MVP PRD' : status === 'loading' ? 'Drafting PRD' : 'Generated PRD'}
					</p>
					<p class="truncate text-[11px] text-muted-foreground">
						{hasResult
							? hasUnsavedGeneration
								? 'Unsaved generation ready to review.'
								: activeVersion
									? `Saved as v${activeVersion}.`
									: 'Ready to copy into your build notes.'
							: 'The result will stay in this workspace.'}
					</p>
				</div>
				<div class="flex items-center gap-2">
					{#if hasResult}
						{#if auth.isAuthenticated}
							<Button size="sm" disabled={!canSave} onclick={savePrd}>
								{saveButtonLabel}
							</Button>
						{:else}
							<Button size="sm" href={resolve('/auth?redirectTo=/dashboard')} variant="secondary">
								Sign in to save
							</Button>
						{/if}
					{/if}
					<Button size="sm" disabled={!hasResult} onclick={copyMarkdown}>
						{copied ? 'Copied' : 'Copy Markdown'}
					</Button>
				</div>
			</div>

			<div
				class="grid min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden md:grid-cols-[14rem_minmax(0,1fr)] md:grid-rows-1"
			>
				<aside
					class="min-h-0 overflow-y-auto border-b border-border/50 p-4 md:border-r md:border-b-0 md:p-5"
				>
					<p class="mb-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
						Overview
					</p>

					<div class="flex flex-col gap-1">
						{#each prdSections as section (section.id)}
							<a
								href={`#${section.id}`}
								class="flex h-8 items-center justify-between rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
							>
								<span>{section.label}</span>
								{#if hasResult}
									<span class="size-1.5 rounded-full bg-primary"></span>
								{/if}
							</a>
						{/each}
					</div>

					<Separator class="my-4" />

					{#if activePrdId && savedGenerations.data?.length}
						<div class="mb-4 flex flex-col gap-2">
							<Label for="prd-version">Saved versions</Label>
							<NativeSelect
								id="prd-version"
								value={selectedGenerationValue}
								onchange={(event) => selectGeneration(event.currentTarget.value)}
								class="w-full"
							>
								{#each savedGenerations.data as generation (generation._id)}
									<NativeSelectOption value={`${generation.prdId}:${generation.version}`}>
										v{generation.version}
									</NativeSelectOption>
								{/each}
							</NativeSelect>
						</div>
						<Separator class="my-4" />
					{/if}

					<div class="flex flex-col gap-3">
						{#each briefMeta as item (item.label)}
							<div>
								<p class="text-[11px] text-muted-foreground">{item.label}</p>
								<p class="mt-1 truncate text-xs font-medium">{item.value}</p>
							</div>
						{/each}
					</div>
				</aside>

				<div class="min-h-0 min-w-0 overflow-y-auto p-4 md:p-5">
					{#if status === 'loading'}
						<div class="flex min-w-0 flex-col gap-5">
							{#each prdSections as section (section.id)}
								<section class="min-w-0 scroll-mt-5">
									<Skeleton class="mb-3 h-3 w-32" />
									<Skeleton class="mb-2 h-3 w-full" />
									<Skeleton class="mb-2 h-3 w-10/12" />
									<Skeleton class="h-3 w-7/12" />
								</section>
							{/each}
						</div>
					{:else if hasResult}
						<div class="flex min-w-0 flex-col gap-6">
							{#if saveStatus === 'error'}
								<p class="text-xs leading-5 text-destructive">{saveErrorMessage}</p>
							{:else if saveStatus === 'saved'}
								<p class="text-xs leading-5 text-muted-foreground">Saved v{activeVersion}.</p>
							{/if}
							{#each prdSections as section (section.id)}
								<section id={section.id} class="min-w-0 scroll-mt-5">
									<p
										class="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
									>
										{section.title}
									</p>
									{#if section.items}
										<ul class="flex min-w-0 flex-col gap-2">
											{#each section.items as item (item)}
												<li class="flex min-w-0 gap-2 text-xs leading-5">
													<span class="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/50"
													></span>
													<span class="min-w-0 break-words">{item}</span>
												</li>
											{/each}
										</ul>
									{:else}
										<p
											class="max-w-3xl min-w-0 text-xs leading-5 break-words whitespace-pre-line text-foreground"
										>
											{section.value}
										</p>
									{/if}
								</section>
							{/each}
						</div>
					{:else}
						<div class="flex h-full min-h-72 items-center justify-center">
							<div class="max-w-sm text-center">
								<p class="text-sm font-semibold tracking-tight">Ready when your idea is.</p>
								<p class="mt-2 text-xs leading-5 text-muted-foreground">
									The PRD sections will appear here without moving the brief out of view.
								</p>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</section>
	</div>
{/if}
