<script lang="ts">
	import { page } from '$app/stores';
	import { auth } from '$lib/auth.svelte';
	import { getThreadQuery } from '$lib/chat';
	import WorkspaceThread from '$lib/components/workspaces/WorkspaceThread.svelte';
	import type { Id } from '../../../../convex/_generated/dataModel';
	import { useQuery } from 'convex-svelte';

	const activeThreadId = $derived($page.params.threadId?.trim() ?? '');
	const thread = useQuery(getThreadQuery, () =>
		auth.isAuthenticated && activeThreadId
			? { threadId: activeThreadId as Id<'chatThreads'> }
			: 'skip'
	);
	const isLoading = $derived(thread.data === undefined && !thread.error);
	const isMissing = $derived(thread.data === null || Boolean(thread.error));
</script>

<svelte:head>
	<title>Thread | Launchpad</title>
	<meta name="description" content="Workspace chat thread." />
</svelte:head>

{#if isLoading}
	<div class="flex h-full min-h-0 flex-1 items-center justify-center px-4 py-8 text-center">
		<div>
			<p class="text-sm font-semibold tracking-tight">Loading chat</p>
			<p class="mt-2 text-xs leading-5 text-muted-foreground">Checking thread access…</p>
		</div>
	</div>
{:else if isMissing}
	<div class="flex h-full min-h-0 flex-1 items-center justify-center px-4 py-8 text-center">
		<div class="max-w-sm">
			<p class="text-sm font-semibold tracking-tight">Chat not available</p>
			<p class="mt-2 text-xs leading-5 text-muted-foreground">
				This thread does not exist or you no longer have access to it.
			</p>
		</div>
	</div>
{:else}
	<div class="flex h-full min-h-0 flex-1 flex-col">
		<WorkspaceThread />
	</div>
{/if}
