<script lang="ts">
	import { resolve } from '$app/paths';
	import { LaunchpadLogo } from '$lib/components/brand';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { NativeSelect, NativeSelectOption } from '$lib/components/ui/native-select';
	import { Separator } from '$lib/components/ui/separator';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Textarea } from '$lib/components/ui/textarea';

	type Status = 'idle' | 'loading' | 'done' | 'error';

	type Prd = {
		problemStatement: string;
		targetUser: string;
		mustHaveFeatures: string[];
		outOfScope: string[];
		suggestedStack: string;
		fullMVPPlan: string;
	};

	const emptyPrd: Prd = {
		problemStatement: '',
		targetUser: '',
		mustHaveFeatures: [],
		outOfScope: [],
		suggestedStack: '',
		fullMVPPlan: ''
	};

	const appTypes = ['web app', 'SaaS', 'mobile', 'CLI', 'API'];

	let idea = $state('');
	let appType = $state('web app');
	let preferredStack = $state('');
	let status = $state<Status>('idle');
	let errorMessage = $state('');
	let copied = $state(false);
	let prd = $state<Prd>(emptyPrd);

	const trimmedIdea = $derived(idea.trim());
	const canSubmit = $derived(Boolean(trimmedIdea) && status !== 'loading');
	const hasResult = $derived(status === 'done');
	const briefMeta = $derived([
		{ label: 'App type', value: appType },
		{ label: 'Stack', value: preferredStack.trim() || 'Not specified' }
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

	const generatePrd = async () => {
		if (!canSubmit) return;

		status = 'loading';
		errorMessage = '';

		try {
			const response = await fetch('/api/scope', {
				method: 'POST',
				body: JSON.stringify({
					idea: trimmedIdea,
					appType,
					preferredStack: preferredStack.trim()
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
		} catch (error) {
			console.error(error);
			status = 'error';
			errorMessage = 'Error generating PRD. Please try again.';
		}
	};
</script>

<svelte:head>
	<title>Start Scoping | Launchpad</title>
	<meta name="description" content="Start scoping your MVP with Launchpad." />
</svelte:head>

<main class="flex h-svh flex-col overflow-hidden bg-background text-foreground">
	<header
		class="flex h-12 shrink-0 items-center justify-between border-b border-border/50 px-4 sm:px-5"
	>
		<a href={resolve('/')} aria-label="Launchpad home">
			<LaunchpadLogo />
		</a>
		<div class="flex items-center gap-2">
			<Badge variant="secondary">MVP scope</Badge>
			<Button href={resolve('/')} variant="ghost" size="sm">Home</Button>
		</div>
	</header>

	<div
		class="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[22rem_minmax(0,1fr)] md:grid-rows-1"
	>
		<section class="border-b border-border/50 p-4 md:border-r md:border-b-0 md:p-5">
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
						{hasResult ? 'PRD generated' : 'No history or saved drafts in this MVP.'}
					</p>
					<Button type="submit" disabled={!canSubmit}>
						{status === 'loading' ? 'Generating...' : 'Generate PRD'}
					</Button>
				</div>
			</form>
		</section>

		<section class="flex min-h-0 flex-col">
			<div
				class="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border/50 px-4 md:px-5"
			>
				<div class="min-w-0">
					<p class="truncate text-sm font-semibold tracking-tight">
						{hasResult ? 'MVP PRD' : status === 'loading' ? 'Drafting PRD' : 'Generated PRD'}
					</p>
					<p class="truncate text-[11px] text-muted-foreground">
						{hasResult
							? 'Ready to copy into your build notes.'
							: 'The result will stay in this workspace.'}
					</p>
				</div>
				<Button size="sm" disabled={!hasResult} onclick={copyMarkdown}>
					{copied ? 'Copied' : 'Copy Markdown'}
				</Button>
			</div>

			<div class="grid min-h-0 flex-1 md:grid-cols-[14rem_minmax(0,1fr)]">
				<aside class="border-b border-border/50 p-4 md:border-r md:border-b-0 md:p-5">
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

					<div class="flex flex-col gap-3">
						{#each briefMeta as item (item.label)}
							<div>
								<p class="text-[11px] text-muted-foreground">{item.label}</p>
								<p class="mt-1 truncate text-xs font-medium">{item.value}</p>
							</div>
						{/each}
					</div>
				</aside>

				<div class="min-h-0 overflow-y-auto p-4 md:p-5">
					{#if status === 'loading'}
						<div class="flex flex-col gap-5">
							{#each prdSections as section (section.id)}
								<section class="scroll-mt-5">
									<Skeleton class="mb-3 h-3 w-32" />
									<Skeleton class="mb-2 h-3 w-full" />
									<Skeleton class="mb-2 h-3 w-10/12" />
									<Skeleton class="h-3 w-7/12" />
								</section>
							{/each}
						</div>
					{:else if hasResult}
						<div class="flex flex-col gap-6">
							{#each prdSections as section (section.id)}
								<section id={section.id} class="scroll-mt-5">
									<p
										class="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
									>
										{section.title}
									</p>
									{#if section.items}
										<ul class="flex flex-col gap-2">
											{#each section.items as item (item)}
												<li class="flex gap-2 text-xs leading-5">
													<span class="mt-2 size-1 rounded-full bg-muted-foreground/50"></span>
													<span>{item}</span>
												</li>
											{/each}
										</ul>
									{:else}
										<p class="max-w-3xl text-xs leading-5 whitespace-pre-line text-foreground">
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
</main>
