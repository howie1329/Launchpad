<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import { Cancel01Icon } from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import type { WorkspaceTabTarget } from '$lib/workspaceTabs';
	import { getWorkspaceTabLabel, hrefForWorkspaceTarget, workspaceTargetsEqual } from '$lib/workspace-tab-target';
	import type { SavedArtifact } from '$lib/artifacts';
	import type { SavedChatThread } from '$lib/chat';
	import type { SavedProject } from '$lib/projects';

	let {
		tabs,
		activeTarget,
		projects = undefined,
		threads = undefined,
		artifacts = undefined,
		onSelectTab,
		onCloseTab
	}: {
		tabs: { id: string; target: WorkspaceTabTarget }[];
		activeTarget: WorkspaceTabTarget;
		projects?: SavedProject[] | undefined;
		threads?: SavedChatThread[] | undefined;
		artifacts?: SavedArtifact[] | undefined;
		onSelectTab: (target: WorkspaceTabTarget) => void;
		onCloseTab: (tabId: string) => void;
	} = $props();

	const data = $derived({ projects, threads, artifacts });
	const canClose = $derived(tabs.length > 1);
</script>

<div
	class="flex min-w-0 flex-1 items-center overflow-hidden"
	role="tablist"
	aria-label="Workspace tabs"
>
	<div
		class="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto overflow-y-hidden [scrollbar-width:thin] [-ms-overflow-style:none] [&::-webkit-scrollbar]:h-0"
	>
		{#each tabs as tab (tab.id)}
			{@const { label, missing } = getWorkspaceTabLabel(tab.target, data)}
			{@const isActive = workspaceTargetsEqual(tab.target, activeTarget)}
			<div
				role="tab"
				aria-selected={isActive}
				class={cn(
					'group flex h-7 min-w-0 max-w-[10rem] shrink-0 items-center gap-0.5 rounded-md border border-transparent pl-1.5 pr-0.5 text-left text-xs transition-colors',
					isActive
						? 'bg-accent/80 font-medium text-accent-foreground'
						: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
					missing && 'border-dashed border-muted-foreground/25 opacity-80'
				)}
			>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					class="h-6 min-w-0 flex-1 gap-0 px-1.5 text-xs font-inherit"
					onclick={() => onSelectTab(tab.target)}
					title={label}
					aria-label={missing ? `Missing: ${label}` : label}
				>
					<span class="truncate">{label}</span>
				</Button>
				{#if canClose}
					<Button
						type="button"
						variant="ghost"
						size="icon"
						class="size-5 shrink-0 text-muted-foreground opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
						aria-label="Close tab"
						data-close-tab
						onclick={(e) => {
							e.stopPropagation();
							onCloseTab(tab.id);
						}}
					>
						<HugeiconsIcon icon={Cancel01Icon} class="size-3" strokeWidth={2} />
					</Button>
				{/if}
			</div>
		{/each}
	</div>
</div>
