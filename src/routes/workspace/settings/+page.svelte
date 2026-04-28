<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { deleteAccountMutation, resetAccountMutation } from '$lib/account-management';
	import { auth, getConvexClient, signOut } from '$lib/auth.svelte';
	import { listMyActivityEventsQuery } from '$lib/activity';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Separator } from '$lib/components/ui/separator';
	import { Textarea } from '$lib/components/ui/textarea';
	import { getAiBudgetStatusQuery } from '$lib/usage';
	import { getMyUserSettingsQuery, upsertMyUserSettingsMutation } from '$lib/user-settings';
	import { useQuery } from 'convex-svelte';

	const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
	const maxAiPreferenceChars = 2000;

	const settings = useQuery(getMyUserSettingsQuery, () => (auth.isAuthenticated ? {} : 'skip'));
	const budget = useQuery(getAiBudgetStatusQuery, () => (auth.isAuthenticated ? {} : 'skip'));
	const activity = useQuery(listMyActivityEventsQuery, () =>
		auth.isAuthenticated ? { limit: 200 } : 'skip'
	);
	const settingsQueryError = $derived(settings.error ?? budget.error ?? activity.error);

	let timeZone = $state(detectedTimeZone);
	let dailyCapUsd = $state('0.50');
	let aiContextMarkdown = $state('');
	let aiBehaviorMarkdown = $state('');
	let saveError = $state('');
	let isSaving = $state(false);
	let didAutofillTimeZone = $state(false);

	let resetDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let isResetting = $state(false);
	let isDeleting = $state(false);
	let resetError = $state('');
	let deleteError = $state('');

	const confirmReset = async () => {
		if (isResetting) return;
		resetError = '';
		isResetting = true;
		try {
			await getConvexClient().mutation(resetAccountMutation, {});
			resetDialogOpen = false;
			void invalidateAll();
		} catch (error) {
			console.error(error);
			resetError =
				error instanceof Error && error.message
					? error.message
					: 'Could not reset account. Please try again.';
		} finally {
			isResetting = false;
		}
	};

	const confirmDelete = async () => {
		if (isDeleting) return;
		deleteError = '';
		isDeleting = true;
		try {
			await getConvexClient().mutation(deleteAccountMutation, {});
			deleteDialogOpen = false;
			await signOut();
			goto(resolve('/'));
		} catch (error) {
			console.error(error);
			deleteError =
				error instanceof Error && error.message
					? error.message
					: 'Could not delete account. Please try again.';
		} finally {
			isDeleting = false;
		}
	};

	$effect(() => {
		if (!settings.data) return;
		timeZone = settings.data.timeZone || detectedTimeZone;
		dailyCapUsd = String(settings.data.dailyAiCapUsd);
		aiContextMarkdown = settings.data.aiContextMarkdown ?? '';
		aiBehaviorMarkdown = settings.data.aiBehaviorMarkdown ?? '';
	});

	$effect(() => {
		if (!auth.isAuthenticated) return;
		if (didAutofillTimeZone) return;

		if (settings.data === null) {
			didAutofillTimeZone = true;
			void upsert({ timeZone: detectedTimeZone });
			return;
		}

		if (settings.data && !settings.data.timeZone) {
			didAutofillTimeZone = true;
			void upsert({ timeZone: detectedTimeZone });
		}
	});

	async function upsert(payload: {
		timeZone: string;
		dailyAiCapUsd?: number;
		aiContextMarkdown?: string;
		aiBehaviorMarkdown?: string;
	}) {
		if (isSaving) return;
		saveError = '';
		isSaving = true;

		try {
			await getConvexClient().mutation(upsertMyUserSettingsMutation, payload);
		} catch (error) {
			console.error(error);
			saveError =
				error instanceof Error && error.message
					? error.message
					: 'Could not save settings. Please try again.';
		} finally {
			isSaving = false;
		}
	}

	const save = async () => {
		const cleanTimeZone = timeZone.trim() || detectedTimeZone;
		const cap = Number(dailyCapUsd);
		const ctx = aiContextMarkdown.trim();
		const beh = aiBehaviorMarkdown.trim();

		if (!Number.isFinite(cap) || cap < 0) {
			saveError = 'Daily cap must be a valid number.';
			return;
		}

		if (ctx.length > maxAiPreferenceChars || beh.length > maxAiPreferenceChars) {
			saveError = `Each preference field must be at most ${maxAiPreferenceChars} characters (after trimming).`;
			return;
		}

		await upsert({
			timeZone: cleanTimeZone,
			dailyAiCapUsd: cap,
			aiContextMarkdown: ctx,
			aiBehaviorMarkdown: beh
		});
	};

	function activityLabel(eventType: string, metadata?: Record<string, unknown>) {
		const meta = metadata ?? {};
		const artifactType = typeof meta.artifactType === 'string' ? meta.artifactType : '';

		switch (eventType) {
			case 'thread_created':
				return 'Created a thread';
			case 'project_created':
				return 'Created a project';
			case 'project_created_from_thread':
				return 'Promoted a thread into a project';
			case 'artifact_created':
				return artifactType ? `Created an artifact (${artifactType})` : 'Created an artifact';
			case 'artifact_updated':
				return 'Updated an artifact';
			case 'artifact_restored':
				return 'Restored an artifact version';
			default:
				return eventType;
		}
	}
</script>

<svelte:head>
	<title>Settings | Launchpad</title>
	<meta name="description" content="Launchpad workspace settings." />
</svelte:head>

<section
	class="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col gap-6 overflow-y-auto px-5 py-10"
>
	<header class="space-y-1">
		<h1 class="text-xl font-semibold tracking-tight">Settings</h1>
		<p class="text-xs leading-5 text-muted-foreground">Usage limits and workspace activity.</p>
	</header>

	{#if settingsQueryError}
		<div
			class="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive"
			role="status"
		>
			<p class="font-medium">Could not load settings data</p>
			<p class="mt-1 leading-snug opacity-90">{settingsQueryError.message}</p>
			<Button
				type="button"
				variant="secondary"
				size="sm"
				class="mt-3"
				onclick={() => {
					void invalidateAll();
				}}
			>
				Try again
			</Button>
		</div>
	{/if}

	<section class="space-y-4">
		<div class="space-y-1">
			<h2 class="text-sm font-semibold tracking-tight">AI usage</h2>
			<p class="text-xs leading-5 text-muted-foreground">
				Daily spend cap applies to workspace chat.
			</p>
		</div>

		<div class="rounded-md border border-border/60 bg-background/40 p-4">
			{#if budget.data}
				<div class="flex items-center justify-between gap-3">
					<p class="text-xs">
						Today: <span class="font-medium">{money.format(budget.data.spentUsd)}</span> / {money.format(
							budget.data.capUsd
						)}
					</p>
					<p class="text-xs text-muted-foreground">
						Remaining: {money.format(budget.data.remainingUsd)}
					</p>
				</div>
				<p class="mt-1 text-[11px] text-muted-foreground">Resets daily ({budget.data.dateKey}).</p>
			{:else if budget.error}
				<div class="space-y-2">
					<p class="text-xs text-destructive">Could not load usage: {budget.error.message}</p>
					<Button
						type="button"
						variant="secondary"
						size="sm"
						onclick={() => {
							void invalidateAll();
						}}
					>
						Retry
					</Button>
				</div>
			{:else}
				<p class="text-xs text-muted-foreground">Loading usage...</p>
			{/if}
		</div>

		<div class="grid gap-4 sm:grid-cols-2">
			<div class="space-y-2">
				<Label for="timezone">Timezone</Label>
				<Input id="timezone" bind:value={timeZone} placeholder={detectedTimeZone} />
				<p class="text-[11px] text-muted-foreground">IANA timezone (example: America/New_York).</p>
			</div>
			<div class="space-y-2">
				<Label for="daily-cap">Daily cap (USD)</Label>
				<Input id="daily-cap" bind:value={dailyCapUsd} inputmode="decimal" />
				<p class="text-[11px] text-muted-foreground">Applies per user, per day.</p>
			</div>
		</div>
	</section>

	<section class="space-y-4">
		<div class="space-y-1">
			<h2 class="text-sm font-semibold tracking-tight">AI assistant preferences</h2>
			<p class="text-xs leading-5 text-muted-foreground">
				Optional text included with workspace chat instructions. Artifacts remain your editable
				workspace memory; Launchpad may use secure memory recall to find relevant artifact context
				across chats. Do not paste passwords, API keys, or regulated personal data.
			</p>
		</div>

		<div class="space-y-2">
			<div class="flex items-end justify-between gap-2">
				<Label for="ai-context">Background & context</Label>
				<span class="text-[11px] text-muted-foreground tabular-nums">
					{aiContextMarkdown.trim().length} / {maxAiPreferenceChars}
				</span>
			</div>
			<Textarea
				id="ai-context"
				bind:value={aiContextMarkdown}
				class="min-h-28"
				placeholder="Role, product, users, constraints the assistant should keep in mind."
			/>
			<p class="text-[11px] text-muted-foreground">
				Stable facts about you or your work—assumed true for every thread unless you correct it in
				chat.
			</p>
		</div>

		<div class="space-y-2">
			<div class="flex items-end justify-between gap-2">
				<Label for="ai-behavior">How to respond</Label>
				<span class="text-[11px] text-muted-foreground tabular-nums">
					{aiBehaviorMarkdown.trim().length} / {maxAiPreferenceChars}
				</span>
			</div>
			<Textarea
				id="ai-behavior"
				bind:value={aiBehaviorMarkdown}
				class="min-h-28"
				placeholder="Tone, length, language, when to ask questions, how you like artifacts suggested."
			/>
			<p class="text-[11px] text-muted-foreground">
				Style and behavior preferences. Launchpad’s safety and product rules still apply first.
			</p>
		</div>
	</section>

	<div class="flex items-center justify-between gap-3">
		{#if saveError}
			<p class="text-xs text-destructive">{saveError}</p>
		{:else}
			<span></span>
		{/if}
		<Button type="button" size="sm" disabled={isSaving} onclick={save}>
			{isSaving ? 'Saving…' : 'Save'}
		</Button>
	</div>

	<Separator class="my-2" />

	<section class="space-y-4">
		<div class="space-y-1">
			<h2 class="text-sm font-semibold tracking-tight">Activity</h2>
			<p class="text-xs leading-5 text-muted-foreground">
				Workspace-wide history for your account.
			</p>
		</div>

		<div class="rounded-md border border-border/60">
			{#if activity.error}
				<div class="space-y-2 p-4">
					<p class="text-xs text-destructive">Could not load activity: {activity.error.message}</p>
					<Button
						type="button"
						variant="secondary"
						size="sm"
						onclick={() => {
							void invalidateAll();
						}}
					>
						Retry
					</Button>
				</div>
			{:else if activity.data === undefined}
				<p class="p-4 text-xs text-muted-foreground">Loading activity...</p>
			{:else if activity.data.length === 0}
				<p class="p-4 text-xs text-muted-foreground">No activity yet.</p>
			{:else}
				<ul class="divide-y divide-border/60">
					{#each activity.data as item (item._id)}
						<li class="flex items-start justify-between gap-4 px-4 py-3">
							<div class="min-w-0">
								<p class="text-xs font-medium">{activityLabel(item.eventType, item.metadata)}</p>
								<p class="mt-0.5 text-[11px] text-muted-foreground">
									{new Date(item.createdAt).toLocaleString()}
								</p>
							</div>
							<p class="shrink-0 text-[11px] text-muted-foreground">{item.dateKey}</p>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</section>

	<Separator class="my-2" />

	<section class="space-y-4">
		<div class="space-y-1">
			<h2 class="text-sm font-semibold tracking-tight text-destructive">Danger zone</h2>
			<p class="text-xs leading-5 text-muted-foreground">
				Permanent actions. Reset removes all your workspace data but keeps this login. Deleting
				removes your data and this account, then signs you out.
			</p>
		</div>
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
			<Button
				type="button"
				variant="outline"
				size="sm"
				class="border-destructive/50 text-destructive hover:bg-destructive/10"
				onclick={() => {
					resetError = '';
					resetDialogOpen = true;
				}}
			>
				Reset account
			</Button>
			<Button
				type="button"
				variant="destructive"
				size="sm"
				onclick={() => {
					deleteError = '';
					deleteDialogOpen = true;
				}}
			>
				Delete account
			</Button>
		</div>
	</section>
</section>

<Dialog.Root bind:open={resetDialogOpen}>
	<Dialog.Content class="sm:max-w-md" showCloseButton={!isResetting}>
		<Dialog.Header>
			<Dialog.Title>Reset account</Dialog.Title>
			<Dialog.Description>
				This permanently deletes your projects, chats, messages, artifacts, and settings. Your
				account and login will stay. This cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		{#if resetError}
			<p class="text-xs text-destructive">{resetError}</p>
		{/if}
		<Dialog.Footer>
			<Button
				type="button"
				variant="secondary"
				size="sm"
				disabled={isResetting}
				onclick={() => (resetDialogOpen = false)}>Cancel</Button
			>
			<Button
				type="button"
				variant="destructive"
				size="sm"
				disabled={isResetting}
				onclick={confirmReset}
			>
				{isResetting ? 'Resetting…' : 'Confirm reset'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={deleteDialogOpen}>
	<Dialog.Content class="sm:max-w-md" showCloseButton={!isDeleting}>
		<Dialog.Header>
			<Dialog.Title>Delete account</Dialog.Title>
			<Dialog.Description>
				This permanently deletes your workspace and your account, then signs you out. This cannot be
				undone. You can register again with the same email.
			</Dialog.Description>
		</Dialog.Header>
		{#if deleteError}
			<p class="text-xs text-destructive">{deleteError}</p>
		{/if}
		<Dialog.Footer>
			<Button
				type="button"
				variant="secondary"
				size="sm"
				disabled={isDeleting}
				onclick={() => (deleteDialogOpen = false)}>Cancel</Button
			>
			<Button
				type="button"
				variant="destructive"
				size="sm"
				disabled={isDeleting}
				onclick={confirmDelete}
			>
				{isDeleting ? 'Deleting…' : 'Confirm delete'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
