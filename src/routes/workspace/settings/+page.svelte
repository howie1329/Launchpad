<script lang="ts">
	import { auth, getConvexClient } from '$lib/auth.svelte'
	import { listMyActivityEventsQuery } from '$lib/activity'
	import { Button } from '$lib/components/ui/button'
	import { Input } from '$lib/components/ui/input'
	import { Label } from '$lib/components/ui/label'
	import { Separator } from '$lib/components/ui/separator'
	import { getAiBudgetStatusQuery } from '$lib/usage'
	import { getMyUserSettingsQuery, upsertMyUserSettingsMutation } from '$lib/user-settings'
	import { useQuery } from 'convex-svelte'

	const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
	const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

	const settings = useQuery(getMyUserSettingsQuery, () => (auth.isAuthenticated ? {} : 'skip'))
	const budget = useQuery(getAiBudgetStatusQuery, () => (auth.isAuthenticated ? {} : 'skip'))
	const activity = useQuery(listMyActivityEventsQuery, () =>
		auth.isAuthenticated ? { limit: 200 } : 'skip'
	)

	let timeZone = $state(detectedTimeZone)
	let dailyCapUsd = $state('0.50')
	let saveError = $state('')
	let isSaving = $state(false)
	let didAutofillTimeZone = $state(false)

	$effect(() => {
		if (!settings.data) return
		timeZone = settings.data.timeZone || detectedTimeZone
		dailyCapUsd = String(settings.data.dailyAiCapUsd)
	})

	$effect(() => {
		if (!auth.isAuthenticated) return
		if (didAutofillTimeZone) return

		if (settings.data === null) {
			didAutofillTimeZone = true
			void upsert({ timeZone: detectedTimeZone })
			return
		}

		if (settings.data && !settings.data.timeZone) {
			didAutofillTimeZone = true
			void upsert({ timeZone: detectedTimeZone })
		}
	})

	async function upsert(payload: { timeZone: string; dailyAiCapUsd?: number }) {
		if (isSaving) return
		saveError = ''
		isSaving = true

		try {
			await getConvexClient().mutation(upsertMyUserSettingsMutation, payload)
		} catch (error) {
			console.error(error)
			saveError = 'Could not save settings. Please try again.'
		} finally {
			isSaving = false
		}
	}

	const save = async () => {
		const cleanTimeZone = timeZone.trim() || detectedTimeZone
		const cap = Number(dailyCapUsd)

		if (!Number.isFinite(cap) || cap < 0) {
			saveError = 'Daily cap must be a valid number.'
			return
		}

		await upsert({ timeZone: cleanTimeZone, dailyAiCapUsd: cap })
	}

	function activityLabel(eventType: string, metadata?: Record<string, unknown>) {
		const meta = metadata ?? {}
		const artifactType = typeof meta.artifactType === 'string' ? meta.artifactType : ''

		switch (eventType) {
			case 'thread_created':
				return 'Created a thread'
			case 'project_created':
				return 'Created a project'
			case 'project_created_from_thread':
				return 'Promoted a thread into a project'
			case 'artifact_created':
				return artifactType ? `Created an artifact (${artifactType})` : 'Created an artifact'
			case 'draft_proposed':
				return 'Proposed changes'
			case 'draft_applied':
				return 'Applied changes'
			case 'draft_discarded':
				return 'Discarded changes'
			default:
				return eventType
		}
	}
</script>

<svelte:head>
	<title>Settings | Launchpad</title>
	<meta name="description" content="Launchpad workspace settings." />
</svelte:head>

<section class="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col gap-6 overflow-y-auto px-5 py-10">
	<header class="space-y-1">
		<h1 class="text-xl font-semibold tracking-tight">Settings</h1>
		<p class="text-xs leading-5 text-muted-foreground">Usage limits and workspace activity.</p>
	</header>

	<section class="space-y-4">
		<div class="space-y-1">
			<h2 class="text-sm font-semibold tracking-tight">AI usage</h2>
			<p class="text-xs leading-5 text-muted-foreground">Daily spend cap applies to workspace chat.</p>
		</div>

		<div class="rounded-md border border-border/60 bg-background/40 p-4">
			{#if budget.data}
				<div class="flex items-center justify-between gap-3">
					<p class="text-xs">
						Today: <span class="font-medium">{money.format(budget.data.spentUsd)}</span> / {money.format(budget.data.capUsd)}
					</p>
					<p class="text-xs text-muted-foreground">Remaining: {money.format(budget.data.remainingUsd)}</p>
				</div>
				<p class="mt-1 text-[11px] text-muted-foreground">Resets daily ({budget.data.dateKey}).</p>
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
	</section>

	<Separator class="my-2" />

	<section class="space-y-4">
		<div class="space-y-1">
			<h2 class="text-sm font-semibold tracking-tight">Activity</h2>
			<p class="text-xs leading-5 text-muted-foreground">Workspace-wide history for your account.</p>
		</div>

		<div class="rounded-md border border-border/60">
			{#if activity.data === undefined}
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
</section>
