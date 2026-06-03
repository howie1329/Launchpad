<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
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
	let externalAppsLoading = $state(false);
	let externalAppsLoaded = $state(false);
	let externalAppsAvailable = $state(false);
	let externalAppsError = $state('');
	let externalApps = $state<ExternalAppStatus[]>([]);
	let connectingExternalApp = $state<AllowedExternalApp | ''>('');
	let disconnectingExternalApp = $state<AllowedExternalApp | ''>('');
	let disconnectExternalAppDialogOpen = $state(false);
	let disconnectExternalAppSlug = $state<AllowedExternalApp | ''>('');
	let disconnectExternalAppError = $state('');

	let resetDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let isResetting = $state(false);
	let isDeleting = $state(false);
	let resetError = $state('');
	let deleteError = $state('');
	let lastSavedAt = $state<number | null>(null);

	const savedTimeZone = $derived(settings.data?.timeZone || detectedTimeZone);
	const savedDailyCapUsd = $derived(settings.data ? String(settings.data.dailyAiCapUsd) : '0.50');
	const savedAiContextMarkdown = $derived(settings.data?.aiContextMarkdown ?? '');
	const savedAiBehaviorMarkdown = $derived(settings.data?.aiBehaviorMarkdown ?? '');
	const hasUnsavedChanges = $derived(
		settings.data !== undefined &&
			(timeZone.trim() !== savedTimeZone ||
				dailyCapUsd.trim() !== savedDailyCapUsd ||
				aiContextMarkdown.trim() !== savedAiContextMarkdown ||
				aiBehaviorMarkdown.trim() !== savedAiBehaviorMarkdown)
	);
	const disconnectExternalApp = $derived(
		disconnectExternalAppSlug
			? externalApps.find((app) => app.slug === disconnectExternalAppSlug)
			: undefined
	);

	type AllowedExternalApp =
		| 'github'
		| 'linear'
		| 'slack'
		| 'gmail'
		| 'notion'
		| 'googledrive'
		| 'googledocs'
		| 'googlecalendar'
		| 'googlesheets';
	type ExternalAppStatus = {
		slug: AllowedExternalApp;
		name: string;
		logo?: string;
		connected: boolean;
		status: string;
		statusReason?: string;
		updatedAt?: string;
		connectable: boolean;
	};

	const confirmReset = async () => {
		if (isResetting) return;
		resetError = '';
		isResetting = true;
		try {
			await runAccountAction('/api/workspace/account/reset');
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
			await runAccountAction('/api/workspace/account/delete');
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

	async function runAccountAction(path: string) {
		if (!auth.token) {
			throw new Error('Authentication is required.');
		}

		const response = await fetch(path, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${auth.token}`
			}
		});
		const result = (await response.json().catch(() => null)) as {
			ok?: boolean;
			error?: string;
		} | null;

		if (!response.ok || !result?.ok) {
			throw new Error(result?.error || 'Account action failed. Please try again.');
		}
	}

	async function loadExternalApps() {
		if (!auth.token || externalAppsLoading) return;

		externalAppsLoading = true;
		externalAppsError = '';
		try {
			const response = await fetch('/api/workspace/composio/apps', {
				headers: authHeaders()
			});
			const result = (await response.json().catch(() => null)) as {
				available?: boolean;
				apps?: ExternalAppStatus[];
				error?: string;
			} | null;

			if (!response.ok) {
				throw new Error(result?.error || 'Could not load external apps.');
			}

			externalAppsAvailable = result?.available === true;
			externalApps = Array.isArray(result?.apps) ? result.apps.filter(isExternalAppStatus) : [];
			externalAppsError = result?.error ?? '';
			externalAppsLoaded = true;
		} catch (error) {
			console.error(error);
			externalAppsAvailable = false;
			externalApps = [];
			externalAppsError =
				error instanceof Error && error.message
					? error.message
					: 'External app tools are unavailable.';
		} finally {
			externalAppsLoading = false;
		}
	}

	async function connectExternalApp(toolkit: AllowedExternalApp) {
		if (!auth.token || connectingExternalApp || disconnectingExternalApp) return;

		connectingExternalApp = toolkit;
		externalAppsError = '';
		try {
			const response = await fetch('/api/workspace/composio/apps/connect', {
				method: 'POST',
				headers: {
					...authHeaders(),
					'content-type': 'application/json'
				},
				body: JSON.stringify({ toolkit })
			});
			const result = (await response.json().catch(() => null)) as {
				connected?: boolean;
				redirectUrl?: string;
				error?: string;
			} | null;

			if (!response.ok) {
				throw new Error(result?.error || 'Could not start external app connection.');
			}

			if (result?.connected) {
				externalAppsLoaded = false;
				await loadExternalApps();
				return;
			}

			if (result?.redirectUrl) {
				window.location.href = result.redirectUrl;
				return;
			}

			throw new Error('Composio did not return a connect link.');
		} catch (error) {
			console.error(error);
			externalAppsError =
				error instanceof Error && error.message
					? error.message
					: 'Could not start external app connection.';
		} finally {
			connectingExternalApp = '';
		}
	}

	async function confirmDisconnectExternalApp() {
		if (!auth.token || !disconnectExternalAppSlug || disconnectingExternalApp) return;

		const toolkit = disconnectExternalAppSlug;
		disconnectingExternalApp = toolkit;
		disconnectExternalAppError = '';
		externalAppsError = '';
		try {
			const response = await fetch('/api/workspace/composio/apps', {
				method: 'DELETE',
				headers: {
					...authHeaders(),
					'content-type': 'application/json'
				},
				body: JSON.stringify({ toolkit })
			});
			const result = (await response.json().catch(() => null)) as {
				ok?: boolean;
				error?: string;
			} | null;

			if (!response.ok || !result?.ok) {
				throw new Error(result?.error || 'Could not disconnect external app.');
			}

			externalApps = externalApps.map((app) =>
				app.slug === toolkit
					? { ...app, connected: false, status: 'NOT_CONNECTED', connectable: true }
					: app
			);
			disconnectExternalAppDialogOpen = false;
			disconnectExternalAppSlug = '';
			externalAppsLoaded = false;
			await loadExternalApps();
		} catch (error) {
			console.error(error);
			disconnectExternalAppError =
				error instanceof Error && error.message
					? error.message
					: 'Could not disconnect external app.';
		} finally {
			disconnectingExternalApp = '';
		}
	}

	function openDisconnectExternalAppDialog(app: ExternalAppStatus) {
		disconnectExternalAppSlug = app.slug;
		disconnectExternalAppError = '';
		disconnectExternalAppDialogOpen = true;
	}

	function authHeaders() {
		return { authorization: `Bearer ${auth.token}` };
	}

	function isExternalAppStatus(value: unknown): value is ExternalAppStatus {
		if (!value || typeof value !== 'object') return false;
		const row = value as Partial<ExternalAppStatus>;
		return (
			isAllowedExternalApp(row.slug) &&
			typeof row.name === 'string' &&
			typeof row.connected === 'boolean' &&
			typeof row.status === 'string' &&
			typeof row.connectable === 'boolean'
		);
	}

	function isAllowedExternalApp(value: unknown): value is AllowedExternalApp {
		return (
			value === 'github' ||
			value === 'linear' ||
			value === 'slack' ||
			value === 'gmail' ||
			value === 'notion' ||
			value === 'googledrive' ||
			value === 'googledocs' ||
			value === 'googlecalendar' ||
			value === 'googlesheets'
		);
	}

	function externalAppStatusLabel(app: ExternalAppStatus) {
		if (!externalAppsAvailable || app.status === 'UNAVAILABLE') return 'Unavailable';
		if (app.connected) return 'Connected';
		if (app.status === 'NOT_CONNECTED') return 'Not connected';
		if (app.status === 'INITIATED' || app.status === 'INITIALIZING') return 'Pending';
		return 'Needs reconnect';
	}

	function externalAppActionLabel(app: ExternalAppStatus) {
		return app.status === 'NOT_CONNECTED' ? 'Connect' : 'Reconnect';
	}

	function externalAppStatusClass(app: ExternalAppStatus) {
		if (app.connected) return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700';
		if (app.status === 'INITIATED' || app.status === 'INITIALIZING') {
			return 'border-amber-500/25 bg-amber-500/10 text-amber-700';
		}
		return 'border-border bg-muted/45 text-muted-foreground';
	}

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

	$effect(() => {
		if (!auth.isAuthenticated || !auth.token || externalAppsLoaded) return;
		void loadExternalApps();
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
		lastSavedAt = Date.now();
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

<section class="h-full min-h-0 overflow-y-auto">
	<div class="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-8 lg:px-8 lg:py-10">
		<header
			class="flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between"
		>
			<div class="max-w-2xl space-y-1.5">
				<h1 class="text-xl font-semibold tracking-tight text-balance">Settings</h1>
				<p class="text-sm leading-6 text-pretty text-muted-foreground">
					Control workspace defaults, AI instructions, usage limits, and account data.
				</p>
			</div>
			<div class="flex min-h-7 items-center gap-3 sm:justify-end">
				{#if saveError}
					<p class="text-xs text-destructive" role="status">{saveError}</p>
				{:else if lastSavedAt && !hasUnsavedChanges}
					<p class="text-xs text-muted-foreground" role="status">Saved</p>
				{:else if hasUnsavedChanges}
					<p class="text-xs text-muted-foreground">Unsaved changes</p>
				{/if}
				<Button type="button" size="sm" disabled={isSaving || !hasUnsavedChanges} onclick={save}>
					{isSaving ? 'Saving…' : 'Save changes'}
				</Button>
			</div>
		</header>

		{#if settingsQueryError}
			<div
				class="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive"
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

		<div class="grid gap-8 lg:grid-cols-[11rem_minmax(0,1fr)] lg:items-start">
			<nav class="hidden lg:sticky lg:top-8 lg:block" aria-label="Settings sections">
				<div class="space-y-1 text-xs">
					<a
						class="block rounded-md px-2 py-1.5 font-medium text-foreground hover:bg-muted"
						href="#usage">Usage</a
					>
					<a
						class="block rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
						href="#assistant">Assistant preferences</a
					>
					<a
						class="block rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
						href="#external-apps">External apps</a
					>
					<a
						class="block rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
						href="#activity">Activity</a
					>
					<a
						class="block rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
						href="#account">Account</a
					>
				</div>
			</nav>

			<div class="min-w-0 space-y-8">
				<section id="usage" class="scroll-mt-8 space-y-4">
					<div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,0.8fr)] sm:items-start">
						<div class="space-y-1">
							<h2 class="text-sm font-semibold tracking-tight">Usage</h2>
							<p class="max-w-prose text-xs leading-5 text-muted-foreground">
								Daily cap applies to workspace chat spending.
							</p>
						</div>
						<div class="rounded-lg border border-border/70 bg-muted/35 p-4">
							{#if budget.data}
								<div class="flex items-start justify-between gap-4">
									<div>
										<p class="text-[11px] text-muted-foreground">Spent today</p>
										<p class="mt-1 text-lg font-semibold tracking-tight tabular-nums">
											{money.format(budget.data.spentUsd)}
										</p>
									</div>
									<div class="text-right">
										<p class="text-[11px] text-muted-foreground">Remaining</p>
										<p class="mt-1 text-sm font-medium tabular-nums">
											{money.format(budget.data.remainingUsd)}
										</p>
									</div>
								</div>
								<div class="mt-3 h-1.5 overflow-hidden rounded-full bg-border/70">
									<div
										class="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
										style={`width: ${Math.min(100, Math.max(0, (budget.data.spentUsd / Math.max(budget.data.capUsd, 0.01)) * 100))}%`}
									></div>
								</div>
								<p class="mt-2 text-[11px] text-muted-foreground">
									Cap {money.format(budget.data.capUsd)}. Resets daily ({budget.data.dateKey}).
								</p>
							{:else if budget.error}
								<div class="space-y-2">
									<p class="text-xs text-destructive">
										Could not load usage: {budget.error.message}
									</p>
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
								<div class="space-y-3" aria-label="Loading usage">
									<div class="h-4 w-28 rounded bg-muted"></div>
									<div class="h-7 w-20 rounded bg-muted"></div>
									<div class="h-1.5 rounded-full bg-muted"></div>
								</div>
							{/if}
						</div>
					</div>

					<div class="grid gap-4 rounded-lg border border-border/70 p-4 sm:grid-cols-2">
						<div class="space-y-2">
							<Label for="timezone">Timezone</Label>
							<Input id="timezone" bind:value={timeZone} placeholder={detectedTimeZone} />
							<p class="text-[11px] leading-4 text-muted-foreground">
								IANA timezone, for example America/New_York.
							</p>
						</div>
						<div class="space-y-2">
							<Label for="daily-cap">Daily cap (USD)</Label>
							<Input id="daily-cap" bind:value={dailyCapUsd} inputmode="decimal" />
							<p class="text-[11px] leading-4 text-muted-foreground">Applies per user, per day.</p>
						</div>
					</div>
				</section>

				<Separator />

				<section id="assistant" class="scroll-mt-8 space-y-4">
					<div class="space-y-1">
						<h2 class="text-sm font-semibold tracking-tight">Assistant preferences</h2>
						<p class="max-w-2xl text-xs leading-5 text-pretty text-muted-foreground">
							Optional instructions included with workspace chat. Do not paste passwords, API keys,
							or regulated personal data.
						</p>
					</div>

					<div class="grid gap-4">
						<div class="space-y-2 rounded-lg border border-border/70 p-4">
							<div class="flex items-end justify-between gap-2">
								<div class="space-y-1">
									<Label for="ai-context">Background and context</Label>
									<p class="text-[11px] leading-4 text-muted-foreground">
										Stable facts the assistant should consider across threads.
									</p>
								</div>
								<span class="text-[11px] text-muted-foreground tabular-nums">
									{aiContextMarkdown.trim().length} / {maxAiPreferenceChars}
								</span>
							</div>
							<Textarea
								id="ai-context"
								bind:value={aiContextMarkdown}
								class="min-h-32 resize-y"
								placeholder="Role, product, users, constraints the assistant should keep in mind."
							/>
						</div>

						<div class="space-y-2 rounded-lg border border-border/70 p-4">
							<div class="flex items-end justify-between gap-2">
								<div class="space-y-1">
									<Label for="ai-behavior">How to respond</Label>
									<p class="text-[11px] leading-4 text-muted-foreground">
										Response preferences such as tone, length, and when to ask questions.
									</p>
								</div>
								<span class="text-[11px] text-muted-foreground tabular-nums">
									{aiBehaviorMarkdown.trim().length} / {maxAiPreferenceChars}
								</span>
							</div>
							<Textarea
								id="ai-behavior"
								bind:value={aiBehaviorMarkdown}
								class="min-h-32 resize-y"
								placeholder="Tone, length, language, when to ask questions, how you like artifacts suggested."
							/>
						</div>
					</div>
				</section>

				<Separator />

				<section id="external-apps" class="scroll-mt-8 space-y-4">
					<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div class="space-y-1">
							<h2 class="text-sm font-semibold tracking-tight">External apps</h2>
							<p class="max-w-2xl text-xs leading-5 text-pretty text-muted-foreground">
								Connect apps the workspace assistant can use when you enable app tools in chat.
							</p>
						</div>
						<Button
							type="button"
							variant="secondary"
							size="sm"
							disabled={externalAppsLoading}
							onclick={() => {
								externalAppsLoaded = false;
								void loadExternalApps();
							}}
						>
							{externalAppsLoading ? 'Refreshing…' : 'Refresh'}
						</Button>
					</div>

					{#if externalAppsError}
						<p
							class="rounded-lg border border-border/70 bg-muted/35 p-3 text-xs text-muted-foreground"
						>
							{externalAppsError}
						</p>
					{/if}

					<div class="overflow-hidden rounded-lg border border-border/70">
						{#if externalAppsLoading && externalApps.length === 0}
							<div class="space-y-3 p-4" aria-label="Loading external apps">
								<div class="h-4 w-36 rounded bg-muted"></div>
								<div class="h-4 w-52 rounded bg-muted"></div>
								<div class="h-4 w-44 rounded bg-muted"></div>
							</div>
						{:else if externalApps.length === 0}
							<p class="p-4 text-xs leading-5 text-muted-foreground">
								External app tools are unavailable.
							</p>
						{:else}
							<ul class="divide-y divide-border/60">
								{#each externalApps as app (app.slug)}
									<li class="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
										<div class="flex min-w-0 flex-1 items-center gap-3">
											{#if app.logo}
												<img src={app.logo} alt="" class="size-7 shrink-0 rounded-md" />
											{:else}
												<span
													class="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-muted-foreground uppercase"
													aria-hidden="true"
												>
													{app.name.slice(0, 1)}
												</span>
											{/if}
											<div class="min-w-0">
												<p class="truncate text-xs font-medium">{app.name}</p>
												<p class="mt-0.5 truncate text-[11px] text-muted-foreground">
													{app.statusReason || 'Available in workspace chat app tools.'}
												</p>
											</div>
										</div>
										<div class="flex shrink-0 items-center gap-2 sm:justify-end">
											<span
												class={`inline-flex h-7 items-center rounded-md border px-2 text-[11px] font-medium ${externalAppStatusClass(app)}`}
											>
												{externalAppStatusLabel(app)}
											</span>
											{#if app.connectable}
												<Button
													type="button"
													variant="outline"
													size="sm"
													disabled={Boolean(connectingExternalApp || disconnectingExternalApp)}
													onclick={() => {
														void connectExternalApp(app.slug);
													}}
												>
													{connectingExternalApp === app.slug
														? 'Opening…'
														: externalAppActionLabel(app)}
												</Button>
											{/if}
											{#if app.connected}
												<Button
													type="button"
													variant="outline"
													size="sm"
													class="border-destructive/40 text-destructive hover:bg-destructive/10"
													disabled={Boolean(connectingExternalApp || disconnectingExternalApp)}
													onclick={() => openDisconnectExternalAppDialog(app)}
												>
													{disconnectingExternalApp === app.slug ? 'Disconnecting…' : 'Disconnect'}
												</Button>
											{/if}
										</div>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</section>

				<Separator />

				<section id="activity" class="scroll-mt-8 space-y-4">
					<div class="space-y-1">
						<h2 class="text-sm font-semibold tracking-tight">Activity</h2>
						<p class="max-w-prose text-xs leading-5 text-muted-foreground">
							Workspace-wide history for your account.
						</p>
					</div>

					<div class="overflow-hidden rounded-lg border border-border/70">
						{#if activity.error}
							<div class="space-y-2 p-4">
								<p class="text-xs text-destructive">
									Could not load activity: {activity.error.message}
								</p>
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
							<div class="space-y-3 p-4" aria-label="Loading activity">
								<div class="h-4 w-40 rounded bg-muted"></div>
								<div class="h-4 w-56 rounded bg-muted"></div>
								<div class="h-4 w-32 rounded bg-muted"></div>
							</div>
						{:else if activity.data.length === 0}
							<p class="p-4 text-xs leading-5 text-muted-foreground">
								No activity yet. Created threads, projects, and artifacts will appear here.
							</p>
						{:else}
							<ul class="divide-y divide-border/60">
								{#each activity.data as item (item._id)}
									<li
										class="flex items-start justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/35"
									>
										<div class="min-w-0">
											<p class="text-xs font-medium">
												{activityLabel(item.eventType, item.metadata)}
											</p>
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

				<Separator />

				<section id="account" class="scroll-mt-8 space-y-4">
					<div class="space-y-1">
						<h2 class="text-sm font-semibold tracking-tight text-destructive">Account</h2>
						<p class="max-w-2xl text-xs leading-5 text-pretty text-muted-foreground">
							Permanent actions for this workspace. Read the outcome before confirming either
							action.
						</p>
					</div>
					<div class="grid gap-3 sm:grid-cols-2">
						<div class="rounded-lg border border-destructive/25 bg-destructive/5 p-4">
							<h3 class="text-xs font-semibold">Reset workspace data</h3>
							<p class="mt-1 text-[11px] leading-4 text-muted-foreground">
								Deletes projects, chats, messages, artifacts, and settings. Keeps this login.
							</p>
							<Button
								type="button"
								variant="outline"
								size="sm"
								class="mt-3 border-destructive/50 text-destructive hover:bg-destructive/10"
								onclick={() => {
									resetError = '';
									resetDialogOpen = true;
								}}
							>
								Reset workspace data
							</Button>
						</div>
						<div class="rounded-lg border border-destructive/35 bg-background p-4">
							<h3 class="text-xs font-semibold">Delete account</h3>
							<p class="mt-1 text-[11px] leading-4 text-muted-foreground">
								Deletes workspace data and this account, then signs you out.
							</p>
							<Button
								type="button"
								variant="destructive"
								size="sm"
								class="mt-3"
								onclick={() => {
									deleteError = '';
									deleteDialogOpen = true;
								}}
							>
								Delete account
							</Button>
						</div>
					</div>
				</section>
			</div>
		</div>
	</div>
</section>

<Dialog.Root bind:open={disconnectExternalAppDialogOpen}>
	<Dialog.Content class="sm:max-w-md" showCloseButton={!disconnectingExternalApp}>
		<Dialog.Header>
			<Dialog.Title>Disconnect external app</Dialog.Title>
			<Dialog.Description>
				{#if disconnectExternalApp}
					This removes Launchpad's Composio authorization for {disconnectExternalApp.name}. You can
					connect it again later.
				{:else}
					This removes Launchpad's Composio authorization for this app. You can connect it again
					later.
				{/if}
			</Dialog.Description>
		</Dialog.Header>
		{#if disconnectExternalAppError}
			<p class="text-xs text-destructive">{disconnectExternalAppError}</p>
		{/if}
		<Dialog.Footer>
			<Button
				type="button"
				variant="secondary"
				size="sm"
				disabled={Boolean(disconnectingExternalApp)}
				onclick={() => (disconnectExternalAppDialogOpen = false)}>Cancel</Button
			>
			<Button
				type="button"
				variant="destructive"
				size="sm"
				disabled={Boolean(disconnectingExternalApp)}
				onclick={confirmDisconnectExternalApp}
			>
				{disconnectingExternalApp ? 'Disconnecting…' : 'Disconnect'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

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
