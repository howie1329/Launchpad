<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { artifactTypeLabel } from '$lib/artifact-display';
	import type { SavedArtifact } from '$lib/artifacts';
	import type { SavedChatThread } from '$lib/chat';
	import { formatThreadTitleForDisplay } from '$lib/thread-title';
	import type { SavedProject } from '$lib/projects';
	import {
		workspaceArtifactHref,
		workspaceProjectHref,
		workspaceRootHref,
		workspaceSettingsHref,
		workspaceThreadHref
	} from '$lib/workspace-nav';
	import {
		Add01Icon,
		ChatAdd01Icon,
		Chat01Icon,
		Folder01Icon,
		Settings01Icon,
		File01Icon
	} from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';

	let {
		projects = undefined,
		threads = undefined,
		artifacts = undefined,
		open = $bindable(false)
	}: {
		projects: SavedProject[] | undefined;
		threads: SavedChatThread[] | undefined;
		artifacts: SavedArtifact[] | undefined;
		open?: boolean;
	} = $props();

	const loading = $derived(
		projects === undefined || threads === undefined || artifacts === undefined
	);

	const itemClass =
		'flex min-h-0 w-full cursor-default items-center gap-2 rounded-md px-2 py-2 text-xs ' +
		'outline-none hover:bg-accent/50 focus:bg-accent ' +
		'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground';

	const headingClass =
		'px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground';

	const projectsCap = 50;
	const threadsCap = 50;
	const artifactsCap = 200;

	const projectsShown = $derived((projects ?? []).slice(0, projectsCap));
	const threadsShown = $derived((threads ?? []).slice(0, threadsCap));
	const artifactsShown = $derived((artifacts ?? []).slice(0, artifactsCap));

	function navTo(href: string) {
		return () => {
			void goto(resolve(href as '/workspace'));
			open = false;
		};
	}
</script>

<DropdownMenu.Root bind:open>
	<DropdownMenu.Trigger type="button" class="inline-flex shrink-0" aria-label="Add workspace tab">
		<Button variant="ghost" size="icon" type="button" class="size-8" aria-label="Add workspace tab">
			<HugeiconsIcon icon={Add01Icon} strokeWidth={2} class="size-3.5" />
		</Button>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content
		class="w-[min(100vw-2rem,20rem)] rounded-lg border-border/70 bg-popover p-0"
		align="start"
		sideOffset={6}
	>
		<ScrollArea class="h-[min(22rem,60vh)]">
			<div class="p-1">
				{#if loading}
					<p class="px-2 py-4 text-center text-xs text-muted-foreground">Loading workspace…</p>
				{:else}
					<div class={headingClass}>Open</div>
					<DropdownMenu.Item class={itemClass} onSelect={navTo(workspaceRootHref())}>
						<HugeiconsIcon
							icon={ChatAdd01Icon}
							strokeWidth={2}
							class="size-3 text-muted-foreground"
						/>
						<span class="min-w-0 flex-1 truncate">New chat</span>
					</DropdownMenu.Item>
					<DropdownMenu.Item class={itemClass} onSelect={navTo(workspaceSettingsHref())}>
						<HugeiconsIcon
							icon={Settings01Icon}
							strokeWidth={2}
							class="size-3 text-muted-foreground"
						/>
						<span class="min-w-0 flex-1 truncate">Settings</span>
					</DropdownMenu.Item>
					{#if projectsShown.length > 0}
						<DropdownMenu.Separator class="my-1" />
						<div class={headingClass}>Projects</div>
						{#each projectsShown as project (project._id)}
							<DropdownMenu.Item
								class={itemClass}
								onSelect={navTo(workspaceProjectHref(project._id))}
							>
								<HugeiconsIcon
									icon={Folder01Icon}
									strokeWidth={2}
									class="size-3 text-muted-foreground"
								/>
								<span class="min-w-0 flex-1 truncate">{project.name}</span>
							</DropdownMenu.Item>
						{/each}
					{/if}
					{#if threadsShown.length > 0}
						<DropdownMenu.Separator class="my-1" />
						<div class={headingClass}>Chats</div>
						{#each threadsShown as thread (thread._id)}
							<DropdownMenu.Item class={itemClass} onSelect={navTo(workspaceThreadHref(thread))}>
								<HugeiconsIcon
									icon={Chat01Icon}
									strokeWidth={2}
									class="size-3 text-muted-foreground"
								/>
								<span class="min-w-0 flex-1 truncate"
									>{formatThreadTitleForDisplay(thread.title)}</span
								>
							</DropdownMenu.Item>
						{/each}
					{/if}
					{#if artifactsShown.length > 0}
						<DropdownMenu.Separator class="my-1" />
						<div class={headingClass}>Artifacts</div>
						{#each artifactsShown as artifact (artifact._id)}
							<DropdownMenu.Item
								class={itemClass}
								onSelect={navTo(workspaceArtifactHref(artifact._id))}
							>
								<HugeiconsIcon
									icon={File01Icon}
									strokeWidth={2}
									class="size-3 text-muted-foreground"
								/>
								<span class="min-w-0 flex-1 truncate">{artifact.title}</span>
								<span class="shrink-0 pl-1 text-[11px] text-muted-foreground"
									>{artifactTypeLabel(artifact.type)}</span
								>
							</DropdownMenu.Item>
						{/each}
					{/if}
					<div
						class="border-t border-border/50 p-2 text-[10px] leading-relaxed text-muted-foreground"
					>
						Lists show at most {projectsCap} projects, {threadsCap} chats, and {artifactsCap} documents
						(newest first).
					</div>
				{/if}
			</div>
		</ScrollArea>
	</DropdownMenu.Content>
</DropdownMenu.Root>
