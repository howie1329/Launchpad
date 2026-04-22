<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Kbd from '$lib/components/ui/kbd/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar';
	import { artifactTypeLabel } from '$lib/artifact-display';
	import type { SavedArtifact } from '$lib/artifacts';
	import type { SavedProject } from '$lib/projects';
	import type { SavedChatThread } from '$lib/chat';
	import { formatThreadTitleForDisplay } from '$lib/thread-title';
	import {
		workspaceArtifactHref,
		workspaceProjectHref,
		workspaceRootHref,
		workspaceSettingsHref,
		workspaceThreadHref
	} from '$lib/workspace-nav';
	import {
		ChatAdd01Icon,
		Chat01Icon,
		Folder01Icon,
		PanelLeftCloseIcon,
		PanelLeftOpenIcon,
		PanelLeftIcon,
		PanelRightCloseIcon,
		PanelRightOpenIcon,
		Rocket01Icon,
		Search01Icon,
		Settings01Icon,
		File01Icon
	} from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';

	let {
		open = $bindable(false),
		projects,
		threads,
		artifacts,
		activeThreadId = '',
		contextPanelOpen = false,
		canPromoteThreadToProject = false,
		onRequestPromote,
		onToggleThreadContext
	}: {
		open?: boolean;
		projects: SavedProject[] | undefined;
		threads: SavedChatThread[] | undefined;
		artifacts: SavedArtifact[] | undefined;
		activeThreadId?: string;
		contextPanelOpen?: boolean;
		canPromoteThreadToProject?: boolean;
		onRequestPromote: () => void;
		onToggleThreadContext: () => void | Promise<void>;
	} = $props();

	const sidebar = useSidebar();

	const loading = $derived(
		projects === undefined || threads === undefined || artifacts === undefined
	);

	function close() {
		open = false;
	}

	function nav(path: string) {
		return async () => {
			await goto(path);
			close();
		};
	}

	async function runAction(fn: () => void | Promise<void>) {
		await fn();
		close();
	}

	const projectsCap = 50;
	const threadsCap = 50;
	const artifactsCap = 200;
</script>

<Command.CommandDialog
	bind:open
	title="Command center"
	description="Search projects, chats, and artifacts, or run a quick action."
	class="sm:max-w-lg"
>
	<Command.Input placeholder="Search threads, projects, artifacts, actions…" />
	<Command.List class="max-h-[min(24rem,60vh)]">
		<Command.Empty class="px-2 py-6 text-center text-xs text-muted-foreground">
			{#if loading}
				Loading workspace…
			{:else}
				No matches.
			{/if}
		</Command.Empty>

		<Command.Group heading="Actions" value="actions">
			<Command.Item
				value="action new chat new thread compose"
				keywords={['new', 'chat', 'compose', 'start']}
				onSelect={nav(workspaceRootHref())}
			>
				<HugeiconsIcon icon={ChatAdd01Icon} strokeWidth={2} class="size-4 text-muted-foreground" />
				<span>New chat</span>
			</Command.Item>
			<Command.Item
				value="action settings account preferences"
				keywords={['settings', 'preferences', 'account', 'usage', 'ai']}
				onSelect={nav(workspaceSettingsHref())}
			>
				<HugeiconsIcon
					icon={Settings01Icon}
					strokeWidth={2}
					class="size-4 text-muted-foreground"
				/>
				<span>Settings</span>
			</Command.Item>
			<Command.Item
				value="action toggle sidebar expand collapse"
				keywords={['sidebar', 'panel', 'toggle', 'collapse', 'expand']}
				onSelect={() => {
					sidebar.toggle();
					close();
				}}
			>
				<HugeiconsIcon
					icon={sidebar.open ? PanelLeftCloseIcon : PanelLeftOpenIcon}
					strokeWidth={2}
					class="size-4 text-muted-foreground"
				/>
				<span>{sidebar.open ? 'Collapse sidebar' : 'Expand sidebar'}</span>
				<Command.Shortcut>
					<Kbd.Group class="pointer-events-none hidden gap-0.5 sm:inline-flex">
						<Kbd.Kbd>⌘</Kbd.Kbd>
						<Kbd.Kbd>B</Kbd.Kbd>
					</Kbd.Group>
				</Command.Shortcut>
			</Command.Item>
			<Command.Item
				value="action focus workspace list keyboard navigation"
				keywords={['focus', 'sidebar', 'list', 'keyboard', 'navigate']}
				onSelect={() => {
					const first = document.querySelector<HTMLElement>(
						'#workspace-sidebar-nav [data-workspace-nav-item]'
					);
					first?.focus();
					close();
				}}
			>
				<HugeiconsIcon icon={PanelLeftIcon} strokeWidth={2} class="size-4 text-muted-foreground" />
				<span>Focus workspace list</span>
				<Command.Shortcut>
					<Kbd.Group class="pointer-events-none hidden gap-0.5 sm:inline-flex">
						<Kbd.Kbd>⌘</Kbd.Kbd>
						<Kbd.Kbd>⇧</Kbd.Kbd>
						<Kbd.Kbd>L</Kbd.Kbd>
					</Kbd.Group>
					<span class="sm:sr-only">Cmd+Shift+L</span>
				</Command.Shortcut>
			</Command.Item>
			{#if activeThreadId}
				<Command.Item
					value="action context panel thread"
					keywords={['context', 'panel', 'thread', 'right', 'artifacts']}
					onSelect={() => {
						void runAction(onToggleThreadContext);
					}}
				>
					<HugeiconsIcon
						icon={contextPanelOpen ? PanelRightCloseIcon : PanelRightOpenIcon}
						strokeWidth={2}
						class="size-4 text-muted-foreground"
					/>
					<span>{contextPanelOpen ? 'Close thread context' : 'Open thread context'}</span>
				</Command.Item>
			{/if}
			{#if canPromoteThreadToProject}
				<Command.Item
					value="action promote project from chat"
					keywords={['project', 'promote', 'create', 'export']}
					onSelect={() => {
						close();
						onRequestPromote();
					}}
				>
					<HugeiconsIcon icon={Rocket01Icon} strokeWidth={2} class="size-4 text-muted-foreground" />
					<span>Create project from this chat</span>
				</Command.Item>
			{/if}
		</Command.Group>

		{#if projects && projects.length > 0}
			<Command.Separator class="-mx-1 h-px bg-border" />
			<Command.Group heading="Projects" value="projects">
				{#each projects as project (project._id)}
					<Command.Item
						value="project {project._id} {project.name}"
						keywords={[project.name, 'project', 'folder']}
						onSelect={nav(workspaceProjectHref(project._id))}
					>
						<HugeiconsIcon icon={Folder01Icon} strokeWidth={2} class="size-4 text-muted-foreground" />
						<span class="min-w-0 flex-1 truncate">{project.name}</span>
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}

		{#if threads && threads.length > 0}
			<Command.Separator class="-mx-1 h-px bg-border" />
			<Command.Group heading="Chats" value="chats">
				{#each threads as thread (thread._id)}
					<Command.Item
						value="thread {thread._id} {formatThreadTitleForDisplay(thread.title)} {thread.title}"
						keywords={[
							formatThreadTitleForDisplay(thread.title),
							'thread',
							'chat',
							'inbox',
							'project',
							...(thread.projectId ? [String(thread.projectId)] : [])
						]}
						onSelect={nav(workspaceThreadHref(thread))}
					>
						<HugeiconsIcon icon={Chat01Icon} strokeWidth={2} class="size-4 text-muted-foreground" />
						<span class="min-w-0 flex-1 truncate"
							>{formatThreadTitleForDisplay(thread.title)}</span
						>
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}

		{#if artifacts && artifacts.length > 0}
			<Command.Separator class="-mx-1 h-px bg-border" />
			<Command.Group heading="Artifacts" value="artifacts">
				{#each artifacts as artifact (artifact._id)}
					<Command.Item
						value="artifact {artifact._id} {artifact.title} {artifact.type}"
						keywords={[
							artifact.title,
							artifactTypeLabel(artifact.type),
							artifact.type,
							'document',
							'doc'
						]}
						onSelect={nav(workspaceArtifactHref(artifact._id))}
					>
						<HugeiconsIcon icon={File01Icon} strokeWidth={2} class="size-4 text-muted-foreground" />
						<span class="min-w-0 flex-1 truncate">{artifact.title}</span>
						<span class="shrink-0 text-[10px] text-muted-foreground"
							>{artifactTypeLabel(artifact.type)}</span
						>
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}
	</Command.List>

	<div
		class="border-t border-border/80 bg-muted/30 px-2 py-2 text-[10px] leading-relaxed text-muted-foreground"
		data-workspace-command-footer
	>
		<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
			<span class="inline-flex items-center gap-1">
				<HugeiconsIcon icon={Search01Icon} strokeWidth={2} class="size-3 opacity-70" />
				Open
			</span>
			<Kbd.Group class="inline-flex items-center gap-0.5" aria-label="Command center shortcut">
				<Kbd.Kbd>⌘</Kbd.Kbd>
				<Kbd.Kbd>K</Kbd.Kbd>
			</Kbd.Group>
			<span class="text-border">·</span>
			<span>Lists show at most {projectsCap} projects, {threadsCap} chats, and {artifactsCap} documents (newest first). Older items are not in this search until full workspace search exists.</span>
		</div>
	</div>
</Command.CommandDialog>
