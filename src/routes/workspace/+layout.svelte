<script lang="ts">
	import { afterNavigate, goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import WorkspaceCommandPalette from '$lib/components/workspaces/WorkspaceCommandPalette.svelte';
	import WorkspaceCreateArtifactDialog from '$lib/components/workspaces/WorkspaceCreateArtifactDialog.svelte';
	import WorkspaceDeleteConfirmDialog from '$lib/components/workspaces/WorkspaceDeleteConfirmDialog.svelte';
	import WorkspaceExternalContextImportDialog from '$lib/components/workspaces/WorkspaceExternalContextImportDialog.svelte';
	import WorkspaceTabPicker from '$lib/components/workspaces/WorkspaceTabPicker.svelte';
	import WorkspaceTabStrip from '$lib/components/workspaces/WorkspaceTabStrip.svelte';
	import { hrefForWorkspaceTarget, urlToWorkspaceTarget } from '$lib/workspace-route-contract';
	import {
		addOrActivateWorkspaceTabMutation,
		getWorkspaceTabStripQuery,
		removeWorkspaceTabMutation
	} from '$lib/workspaceTabs';
	import type { WorkspaceTabTarget } from '$lib/workspaceTabs';
	import {
		workspaceArtifactHref,
		workspaceProjectHref,
		workspaceRootHref,
		workspaceSettingsHref,
		workspaceThreadHref,
		workspaceThreadViewHref
	} from '$lib/workspace-route-contract';
	import { auth, getConvexClient, signOut } from '$lib/auth.svelte';
	import {
		createArtifactMutation,
		linkArtifactToThreadMutation,
		listArtifactsQuery,
		listThreadArtifactsQuery,
		type ArtifactContentFormat,
		type ArtifactLinkReason
	} from '$lib/artifacts';
	import { artifactTypeLabel, groupArtifacts } from '$lib/artifact-display';
	import { listThreadsQuery } from '$lib/chat';
	import { formatThreadTitleForDisplay, PLACEHOLDER_THREAD_TITLE } from '$lib/thread-title';
	import { getAiBudgetStatusQuery } from '$lib/usage';
	import {
		formatNotificationTime,
		missingNotificationTargetMessage,
		notificationHref,
		notificationStateClasses,
		notificationStateLabel,
		primaryNotificationActionLabel
	} from '$lib/workspace-notifications';
	import {
		countUnreadNotificationsQuery,
		deleteNotificationMutation,
		dismissNotificationMutation,
		listNotificationsQuery,
		markAllNotificationsReadMutation,
		markNotificationReadMutation,
		type NotificationState,
		type SavedNotification
	} from '$lib/notifications';
	import { LaunchpadMarkOutline } from '$lib/components/brand';
	import { Button } from '$lib/components/ui/button';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { cn } from '$lib/utils';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Kbd from '$lib/components/ui/kbd';
	import ThemeMenu from '$lib/components/ThemeMenu.svelte';
	import { createProjectFromThreadMutation, listProjectsQuery } from '$lib/projects';
	import { deleteProjectMutation, deleteThreadMutation } from '$lib/account-management';
	import { workspaceArtifactChrome } from '$lib/workspace-artifact-chrome.svelte';
	import {
		isWorkspaceHomePath,
		isWorkspaceSettingsPath,
		workspacePathIds
	} from '$lib/workspace-shell-route-state';
	import {
		ArrowLeft01Icon,
		ArrowRight01Icon,
		BellDotIcon,
		ChatAdd01Icon,
		CheckmarkCircle01Icon,
		Clock01Icon,
		Delete02Icon,
		DollarCircleIcon,
		File01Icon,
		Folder01Icon,
		InboxIcon,
		Logout01Icon,
		PanelRightCloseIcon,
		PanelRightOpenIcon,
		Rocket01Icon,
		Search01Icon,
		MoreHorizontalCircle01Icon,
		Settings01Icon
	} from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { useQuery } from 'convex-svelte';
	import type { Id } from '../../convex/_generated/dataModel';

	let { children } = $props();

	let sidebarOpen = $state(false);
	let isSigningOut = $state(false);
	let promoteDialogOpen = $state(false);
	let promoteName = $state('');
	let promoteSummary = $state('');
	let promoteError = $state('');
	let hasPromotionProposalPrefill = $state(false);
	let isPromoting = $state(false);
	let isLoadingReadiness = $state(false);
	let readinessWarning = $state('');
	let readinessStrengths = $state<string[]>([]);
	let readinessMissingInformation = $state<string[]>([]);
	let readinessKeyArtifacts = $state<string[]>([]);
	let readinessIncludedArtifacts = $state<PromotionReadinessArtifact[]>([]);
	let createArtifactDialogOpen = $state(false);
	let importDialogOpen = $state(false);
	let importingArtifactId = $state('');
	let artifactActionError = $state('');
	let workspaceNotice = $state('');
	let openSections = $state({
		Projects: false,
		Chats: false,
		Artifacts: false
	});
	let openProjectIds = $state<Record<string, boolean>>({});
	let commandCenterOpen = $state(false);
	let tabPickerOpen = $state(false);
	let projectDeleteDialogOpen = $state(false);
	let projectToDelete: { id: Id<'projects'>; name: string } | null = $state(null);
	let threadDeleteDialogOpen = $state(false);
	let threadToDelete: {
		id: Id<'chatThreads'>;
		title: string;
		projectId: Id<'projects'> | null;
	} | null = $state(null);
	let isDeletingProject = $state(false);
	let isDeletingThread = $state(false);
	let deleteNavError = $state('');
	let notificationActionId = $state('');

	const pathname = $derived($page.url.pathname);
	const pathIds = $derived(workspacePathIds(pathname));
	const isSettingsActive = $derived(isWorkspaceSettingsPath(pathname));
	const routeProjectId = $derived(pathIds.projectId);
	const activeThreadId = $derived(pathIds.threadId);
	const activeArtifactId = $derived(pathIds.artifactId);
	const contextPanelOpen = $derived($page.url.searchParams.get('context') === '1');
	const isNewChatActive = $derived(isWorkspaceHomePath(pathname));
	const projects = useQuery(listProjectsQuery, () => (auth.isAuthenticated ? {} : 'skip'));
	const threads = useQuery(listThreadsQuery, () => (auth.isAuthenticated ? {} : 'skip'));
	const artifacts = useQuery(listArtifactsQuery, () => (auth.isAuthenticated ? {} : 'skip'));
	const tabStrip = useQuery(getWorkspaceTabStripQuery, () => (auth.isAuthenticated ? {} : 'skip'));
	const notifications = useQuery(listNotificationsQuery, () =>
		auth.isAuthenticated ? { limit: 20 } : 'skip'
	);
	const unreadNotifications = useQuery(countUnreadNotificationsQuery, () =>
		auth.isAuthenticated ? {} : 'skip'
	);
	const threadArtifacts = useQuery(listThreadArtifactsQuery, () =>
		auth.isAuthenticated && activeThreadId
			? { threadId: activeThreadId as Id<'chatThreads'> }
			: 'skip'
	);
	const budget = useQuery(getAiBudgetStatusQuery, () => (auth.isAuthenticated ? {} : 'skip'));
	const workspaceListError = $derived(
		projects.error ?? threads.error ?? artifacts.error ?? budget.error
	);
	const notificationError = $derived(notifications.error ?? unreadNotifications.error);
	const selectedThread = $derived(
		threads.data?.find((thread) => thread._id === activeThreadId) ?? null
	);
	const activeProjectId = $derived(routeProjectId || selectedThread?.projectId || '');
	const selectedProject = $derived(
		projects.data?.find((project) => project._id === activeProjectId) ?? null
	);
	const canPromoteThreadToProject = $derived(
		Boolean(
			activeThreadId &&
			selectedThread &&
			!selectedThread.projectId &&
			!isSettingsActive &&
			!activeArtifactId
		)
	);
	const activeThreadArtifactIds = $derived(
		new Set(threadArtifacts.data?.map((item) => item.artifact._id) ?? [])
	);
	const selectedArtifact = $derived(
		artifacts.data?.find((artifact) => artifact._id === activeArtifactId) ?? null
	);
	const notificationRows = $derived(notifications.data ?? []);
	const unreadNotificationCount = $derived(unreadNotifications.data?.count ?? 0);
	const unreadNotificationLabel = $derived(
		unreadNotificationCount > 99 ? '99+' : String(unreadNotificationCount)
	);
	const generalThreads = $derived(
		threads.data?.filter((thread) => thread.scopeType === 'general') ?? []
	);
	const artifactGroups = $derived(groupArtifacts(artifacts.data ?? [], (artifact) => artifact));
	const activeWorkspaceTarget = $derived.by(() => {
		const t = urlToWorkspaceTarget($page.url);
		return t ?? { kind: 'home' as const };
	});

	function syncWorkspaceTabsFromUrl() {
		if (!auth.isAuthenticated) return;
		const url = get(page).url;
		if (!url.pathname.startsWith('/workspace')) return;
		const t = urlToWorkspaceTarget(url);
		if (!t) return;
		void getConvexClient()
			.mutation(addOrActivateWorkspaceTabMutation, { target: t })
			.catch((e) => console.error(e));
	}

	afterNavigate(syncWorkspaceTabsFromUrl);

	onMount(() => {
		window.addEventListener('launchpad:review-project-promotion', openPromoteDialog);
		window.addEventListener('launchpad:create-artifact', openCreateArtifactDialog);
		return () => {
			window.removeEventListener('launchpad:review-project-promotion', openPromoteDialog);
			window.removeEventListener('launchpad:create-artifact', openCreateArtifactDialog);
		};
	});

	const selectWorkspaceTab = async (target: WorkspaceTabTarget) => {
		const href = resolve(hrefForWorkspaceTarget(target) as '/workspace');
		const u = get(page).url;
		const next = new URL(href, u.origin);
		if (u.pathname === next.pathname && u.search === next.search) return;
		await goto(href, { noScroll: true, keepFocus: true });
	};

	const closeWorkspaceTab = async (tabId: string) => {
		const result = await getConvexClient().mutation(removeWorkspaceTabMutation, { tabId });
		if (!result.removed) return;
		if (result.activeTarget) {
			await goto(resolve(hrefForWorkspaceTarget(result.activeTarget) as '/workspace'), {
				noScroll: true,
				keepFocus: true
			});
		}
	};

	/** Outline Launchpad mark + contextual copy; a11y name comes from the link. */
	const SIDEBAR_HOME_LABEL_MAX = 24;
	const ellipsizeSidebarLabel = (text: string, max: number) => {
		const t = text.trim();
		if (t.length <= max) return t;
		if (max <= 1) return '…';
		return `${t.slice(0, max - 1)}…`;
	};

	const sidebarHomeTitleFull = $derived.by(() => {
		if (isSettingsActive) return 'Settings';
		if (activeThreadId) {
			return formatThreadTitleForDisplay(selectedThread?.title ?? '');
		}
		if (activeArtifactId) {
			const at = selectedArtifact?.title?.trim();
			return at || 'Artifact';
		}
		if (activeProjectId) {
			const pn = selectedProject?.name?.trim();
			return pn || 'Project';
		}
		return 'Launchpad';
	});

	const sidebarHomeDisplayLabel = $derived(
		ellipsizeSidebarLabel(sidebarHomeTitleFull, SIDEBAR_HOME_LABEL_MAX)
	);
	const sidebarHomeLinkAria = $derived(`Go to workspace home — ${sidebarHomeTitleFull}`);

	const projectThreads = (projectId: string) =>
		threads.data?.filter((thread) => thread.projectId === projectId) ?? [];
	const isProjectOpen = (projectId: string) => openProjectIds[projectId] ?? false;
	const setProjectOpen = (projectId: string, open: boolean) => {
		openProjectIds = { ...openProjectIds, [projectId]: open };
	};

	const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
	type PromotionReadinessArtifact = {
		artifactId: string;
		title: string;
		type: string;
		reason: ArtifactLinkReason;
		preview?: string;
	};

	type PromotionReadinessResponse = {
		suggestedName: string;
		suggestedSummary: string;
		strengths: string[];
		missingInformation: string[];
		keyArtifacts: string[];
		includedArtifacts: PromotionReadinessArtifact[];
		warning?: string;
	};

	type PromotionProposalDetail = {
		name?: string;
		summary?: string;
		strengths?: string[];
		missingInformation?: string[];
		linkedArtifactCount?: number;
	};

	/** Sidebar row vocabulary: compact, distinct roles, no new tokens. */
	const navPill =
		'h-7 min-w-0 gap-2 rounded-md px-2 text-xs text-sidebar-foreground/72 transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground [&>svg]:size-3 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[active=true]:ring-1 data-[active=true]:ring-sidebar-border/70';
	const actionPill =
		'h-7 min-w-0 gap-2 rounded-md px-2 text-xs font-medium text-sidebar-foreground/82 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&>svg]:size-3 data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground';
	const sectionTrigger =
		'group/section flex h-7 w-full items-center gap-1.5 rounded-md px-2 text-left text-[11px] font-semibold text-sidebar-foreground/62 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none group-data-[collapsible=icon]:hidden';
	const subNavPill =
		'h-7 min-w-0 gap-2 rounded-md px-2 text-xs text-sidebar-foreground/68 transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground [&>svg]:size-3 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[active=true]:ring-1 data-[active=true]:ring-sidebar-border/70';
	const footerPill =
		'h-7 min-w-0 gap-2 rounded-md px-2 text-xs text-sidebar-foreground/68 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground [&>svg]:size-3 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground';

	const usageBarPct = $derived(
		budget.data && budget.data.capUsd > 0
			? Math.min(100, (budget.data.spentUsd / budget.data.capUsd) * 100)
			: 0
	);
	const usageTooltip = $derived(
		budget.data
			? `AI usage today: ${money.format(budget.data.spentUsd)} / ${money.format(budget.data.capUsd)} · ${budget.data.dateKey}`
			: 'Usage'
	);
	const readinessCreatedArtifacts = $derived(
		readinessIncludedArtifacts.filter((artifact) => artifact.reason === 'created')
	);
	const readinessReferencedArtifacts = $derived(
		readinessIncludedArtifacts.filter((artifact) => artifact.reason !== 'created')
	);

	const openPromoteDialog = (event?: Event) => {
		if (!selectedThread || selectedThread.projectId) return;
		const detail = event instanceof CustomEvent ? (event.detail as PromotionProposalDetail) : null;
		const rawTitle = selectedThread.title?.trim() ?? '';
		const proposalName = typeof detail?.name === 'string' ? detail.name.trim() : '';
		const proposalSummary = typeof detail?.summary === 'string' ? detail.summary.trim() : '';
		hasPromotionProposalPrefill = Boolean(proposalName || proposalSummary);
		promoteName = proposalName
			? proposalName
			: !rawTitle || rawTitle === PLACEHOLDER_THREAD_TITLE
				? 'New project'
				: formatThreadTitleForDisplay(selectedThread.title ?? '');
		promoteSummary = proposalSummary;
		promoteError = '';
		readinessWarning = '';
		readinessStrengths = Array.isArray(detail?.strengths) ? detail.strengths : [];
		readinessMissingInformation = Array.isArray(detail?.missingInformation)
			? detail.missingInformation
			: [];
		readinessKeyArtifacts = [];
		readinessIncludedArtifacts = [];
		promoteDialogOpen = true;
		void loadPromotionReadiness();
	};

	const loadPromotionReadiness = async () => {
		if (!activeThreadId || !auth.token || isLoadingReadiness) return;

		isLoadingReadiness = true;
		readinessWarning = '';

		try {
			const response = await fetch('/api/workspace/promotion-readiness', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${auth.token}`
				},
				body: JSON.stringify({ threadId: activeThreadId })
			});
			const data = (await response.json()) as PromotionReadinessResponse & { error?: string };
			if (!response.ok) throw new Error(data.error || 'Could not review project readiness.');

			if (!hasPromotionProposalPrefill && data.suggestedName?.trim()) {
				promoteName = data.suggestedName.trim();
			}
			if (!hasPromotionProposalPrefill && data.suggestedSummary?.trim()) {
				promoteSummary = data.suggestedSummary.trim();
			}
			readinessStrengths = data.strengths ?? [];
			readinessMissingInformation = data.missingInformation ?? [];
			readinessKeyArtifacts = data.keyArtifacts ?? [];
			readinessIncludedArtifacts = data.includedArtifacts ?? [];
			readinessWarning = data.warning ?? '';
		} catch (error) {
			console.error(error);
			readinessWarning =
				error instanceof Error && error.message
					? error.message
					: 'AI readiness is unavailable. Review the included context before creating the project.';
			readinessStrengths = ['This chat can be preserved as the starting project thread.'];
			readinessMissingInformation = ['Review the name and summary before creating the project.'];
			readinessIncludedArtifacts =
				threadArtifacts.data?.map(({ link, artifact }) => ({
					artifactId: artifact._id,
					title: artifact.title,
					type: artifact.type,
					reason: link.reason,
					preview: artifact.content.slice(0, 140)
				})) ?? [];
		} finally {
			isLoadingReadiness = false;
		}
	};

	const closePromoteDialog = () => {
		if (isPromoting || isLoadingReadiness) return;
		promoteDialogOpen = false;
		promoteName = '';
		promoteSummary = '';
		promoteError = '';
		hasPromotionProposalPrefill = false;
		readinessWarning = '';
		readinessStrengths = [];
		readinessMissingInformation = [];
		readinessKeyArtifacts = [];
		readinessIncludedArtifacts = [];
	};

	const createArtifactDestination = $derived(
		activeThreadId
			? 'This will save to the workspace and link to the active chat.'
			: activeProjectId
				? 'This will save to the current project.'
				: 'This will save to the workspace artifacts library.'
	);

	const openCreateArtifactDialog = () => {
		createArtifactDialogOpen = true;
	};

	const openImportDialog = () => {
		importDialogOpen = true;
	};

	const openImportReview = async (draftId: Id<'externalContextImportDrafts'>) => {
		workspaceNotice = 'Import review started. You can leave this page.';
		await goto(resolve(`/workspace/imports/external-context/${draftId}`));
	};

	const createArtifact = async (draft: {
		title: string;
		type: string;
		content: string;
		contentFormat: ArtifactContentFormat;
	}) => {
		const result = await getConvexClient().mutation(createArtifactMutation, {
			type: draft.type,
			title: draft.title,
			content: draft.content,
			contentFormat: draft.contentFormat,
			metadata: { source: 'manual-workspace-create' },
			...(activeThreadId ? { sourceThreadId: activeThreadId as Id<'chatThreads'> } : {}),
			...(!activeThreadId && activeProjectId
				? { projectId: activeProjectId as Id<'projects'> }
				: {})
		});
		queueArtifactMemorySync(result.artifactId);
		workspaceNotice = 'Artifact created.';
		await goto(resolve(workspaceArtifactHref(result.artifactId) as '/workspace'));
	};

	const promoteThreadToProject = async () => {
		if (isPromoting || !activeThreadId) return;

		const name = promoteName.trim();
		if (!name) {
			promoteError = 'Project name is required.';
			return;
		}

		isPromoting = true;
		promoteError = '';

		try {
			const summary = promoteSummary.trim();
			await getConvexClient().mutation(createProjectFromThreadMutation, {
				threadId: activeThreadId as Id<'chatThreads'>,
				name,
				...(summary ? { summary } : {})
			});
			promoteDialogOpen = false;
			promoteName = '';
			promoteSummary = '';
			hasPromotionProposalPrefill = false;
			workspaceNotice = 'Project created. This chat and its artifacts now live in the project.';
			await goto(
				resolve(
					workspaceThreadHref({
						_id: activeThreadId as Id<'chatThreads'>
					}) as `/workspace/thread/${string}`
				)
			);
		} catch (error) {
			console.error(error);
			promoteError =
				error instanceof Error && error.message
					? error.message
					: 'Could not create a project from this chat. Please try again.';
		} finally {
			isPromoting = false;
		}
	};

	const useArtifactInThread = async (artifactId: Id<'artifacts'>) => {
		if (!activeThreadId || importingArtifactId) return;

		importingArtifactId = artifactId;
		artifactActionError = '';

		try {
			await getConvexClient().mutation(linkArtifactToThreadMutation, {
				threadId: activeThreadId as Id<'chatThreads'>,
				artifactId,
				reason: 'imported'
			});
			workspaceNotice = 'Artifact added to this chat context.';
		} catch (error) {
			console.error(error);
			artifactActionError = 'Could not add that artifact to this chat. Please try again.';
		} finally {
			importingArtifactId = '';
		}
	};

	function queueArtifactMemorySync(artifactId: Id<'artifacts'>) {
		if (!auth.token) return;

		void fetch('/api/workspace/memory/artifact', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${auth.token}`
			},
			body: JSON.stringify({ artifactId })
		}).catch((error) => {
			console.info('Artifact memory sync skipped', error);
		});
	}

	const toggleThreadContext = async () => {
		if (!activeThreadId) return;
		await goto(
			resolve(
				workspaceThreadViewHref({
					threadId: activeThreadId,
					withContext: !contextPanelOpen
				}) as `/workspace/thread/${string}${string}`
			),
			{
				noScroll: true,
				keepFocus: true
			}
		);
	};

	const markNotificationRead = async (notification: SavedNotification) => {
		if (notification.status !== 'unread') return;
		await getConvexClient().mutation(markNotificationReadMutation, {
			notificationId: notification._id
		});
	};

	const markAllNotificationsRead = async () => {
		if (notificationActionId || unreadNotificationCount === 0) return;
		notificationActionId = 'mark-all';
		try {
			await getConvexClient().mutation(markAllNotificationsReadMutation, {});
		} catch (error) {
			console.error(error);
			workspaceNotice = 'Could not mark notifications read. Please try again.';
		} finally {
			notificationActionId = '';
		}
	};

	const dismissNotification = async (notification: SavedNotification) => {
		if (notificationActionId) return;
		notificationActionId = `dismiss:${notification._id}`;
		try {
			await getConvexClient().mutation(dismissNotificationMutation, {
				notificationId: notification._id
			});
		} catch (error) {
			console.error(error);
			workspaceNotice = 'Could not dismiss that notification. Please try again.';
		} finally {
			notificationActionId = '';
		}
	};

	const deleteNotification = async (notification: SavedNotification) => {
		if (notificationActionId) return;
		notificationActionId = `delete:${notification._id}`;
		try {
			await getConvexClient().mutation(deleteNotificationMutation, {
				notificationId: notification._id
			});
		} catch (error) {
			console.error(error);
			workspaceNotice = 'Could not delete that notification. Please try again.';
		} finally {
			notificationActionId = '';
		}
	};

	const openNotification = async (notification: SavedNotification) => {
		if (notificationActionId) return;
		notificationActionId = `open:${notification._id}`;
		try {
			await markNotificationRead(notification);
			const href = notificationHref(notification, {
				threadIds: threads.data ? new Set(threads.data.map((thread) => thread._id)) : undefined,
				projectIds: projects.data
					? new Set(projects.data.map((project) => project._id))
					: undefined,
				artifactIds: artifacts.data
					? new Set(artifacts.data.map((artifact) => artifact._id))
					: undefined
			});
			if (!href) {
				workspaceNotice = missingNotificationTargetMessage(notification);
				return;
			}
			await goto(resolve(href as '/workspace'), { noScroll: true, keepFocus: true });
		} catch (error) {
			console.error(error);
			workspaceNotice = 'Could not open that notification. Please try again.';
		} finally {
			notificationActionId = '';
		}
	};

	function notificationStateIcon(state: NotificationState) {
		switch (state) {
			case 'success':
				return CheckmarkCircle01Icon;
			case 'failed':
				return Delete02Icon;
			case 'in_progress':
				return Clock01Icon;
			case 'activity':
				return InboxIcon;
		}
	}

	function isWorkspaceTypableTarget(target: EventTarget | null) {
		return (
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			target instanceof HTMLSelectElement ||
			(target instanceof HTMLElement && target.isContentEditable)
		);
	}

	function handleWorkspaceKeydown(e: KeyboardEvent) {
		if (auth.isLoading || !auth.isAuthenticated) return;
		if (e.defaultPrevented) return;
		const mod = e.metaKey || e.ctrlKey;
		if (mod && (e.key === 'k' || e.key === 'K') && !e.shiftKey) {
			e.preventDefault();
			if (e.repeat) return;
			commandCenterOpen = !commandCenterOpen;
			return;
		}
		if (mod && e.shiftKey && (e.key === 'l' || e.key === 'L')) {
			if (e.repeat || commandCenterOpen) return;
			if (isWorkspaceTypableTarget(e.target)) return;
			e.preventDefault();
			document
				.querySelector<HTMLElement>('#workspace-sidebar-nav [data-workspace-nav-item]')
				?.focus();
		}
		trySidebarRovingKeydown(e);
	}

	function trySidebarRovingKeydown(e: KeyboardEvent) {
		if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') {
			return;
		}
		if (isWorkspaceTypableTarget(e.target)) return;

		const nav = document.getElementById('workspace-sidebar-nav');
		if (!nav) return;
		if (!(e.target instanceof Node) || !nav.contains(e.target)) return;

		const items = [...nav.querySelectorAll<HTMLElement>('[data-workspace-nav-item]')];
		if (items.length === 0) return;
		const active = document.activeElement;
		if (!active || !nav.contains(active)) return;

		const isNavItem = active.hasAttribute('data-workspace-nav-item');
		const idx = isNavItem ? items.indexOf(active as HTMLElement) : -1;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (idx < 0) items[0]?.focus();
			else items[Math.min(idx + 1, items.length - 1)]?.focus();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (idx < 0) items[items.length - 1]?.focus();
			else items[Math.max(idx - 1, 0)]?.focus();
		} else if (e.key === 'Home' && !e.metaKey && !e.ctrlKey) {
			e.preventDefault();
			items[0]?.focus();
		} else if (e.key === 'End' && !e.metaKey && !e.ctrlKey) {
			e.preventDefault();
			items[items.length - 1]?.focus();
		}
	}

	const handleSignOut = async () => {
		if (isSigningOut) return;

		isSigningOut = true;

		try {
			await signOut();
			await goto(resolve('/'));
		} finally {
			isSigningOut = false;
		}
	};

	const openDeleteProjectDialog = (id: Id<'projects'>, name: string) => {
		deleteNavError = '';
		projectToDelete = { id, name };
		projectDeleteDialogOpen = true;
	};

	const closeDeleteProjectDialog = () => {
		projectDeleteDialogOpen = false;
		projectToDelete = null;
	};

	const confirmDeleteProject = async () => {
		if (isDeletingProject || !projectToDelete) return;
		isDeletingProject = true;
		deleteNavError = '';
		const { id, name: deletedName } = projectToDelete;
		try {
			await getConvexClient().mutation(deleteProjectMutation, { projectId: id });
			projectDeleteDialogOpen = false;
			projectToDelete = null;
			void invalidateAll();
			if (activeProjectId === id) {
				await goto(resolve('/workspace'));
			}
			workspaceNotice = `Deleted project “${deletedName}”.`;
		} catch (error) {
			console.error(error);
			deleteNavError =
				error instanceof Error && error.message
					? error.message
					: 'Could not delete this project. Please try again.';
		} finally {
			isDeletingProject = false;
		}
	};

	const openDeleteThreadDialog = (
		id: Id<'chatThreads'>,
		title: string,
		projectId: Id<'projects'> | null
	) => {
		deleteNavError = '';
		threadToDelete = { id, title, projectId };
		threadDeleteDialogOpen = true;
	};

	const closeDeleteThreadDialog = () => {
		threadDeleteDialogOpen = false;
		threadToDelete = null;
	};

	const confirmDeleteThread = async () => {
		if (isDeletingThread || !threadToDelete) return;
		isDeletingThread = true;
		deleteNavError = '';
		const { id, title, projectId: tidProject } = threadToDelete;
		try {
			await getConvexClient().mutation(deleteThreadMutation, { threadId: id });
			threadDeleteDialogOpen = false;
			threadToDelete = null;
			void invalidateAll();
			if (activeThreadId === id) {
				if (tidProject) {
					await goto(resolve(workspaceProjectHref(tidProject) as `/workspace/project/${string}`));
				} else {
					await goto(resolve('/workspace'));
				}
			}
			workspaceNotice = `Deleted chat “${formatThreadTitleForDisplay(title)}”.`;
		} catch (error) {
			console.error(error);
			deleteNavError =
				error instanceof Error && error.message
					? error.message
					: 'Could not delete this chat. Please try again.';
		} finally {
			isDeletingThread = false;
		}
	};

	$effect(() => {
		if (!auth.isLoading && !auth.isAuthenticated) {
			const u = $page.url;
			const nextPath = u.pathname.startsWith('/workspace')
				? `${u.pathname}${u.search}${u.hash}`
				: '/workspace';
			void goto(resolve(`/auth?redirectTo=${encodeURIComponent(nextPath)}`));
		}
	});
</script>

<svelte:window onkeydown={handleWorkspaceKeydown} />

{#if auth.isLoading || !auth.isAuthenticated}
	<main class="flex min-h-svh items-center justify-center bg-background px-5 text-foreground">
		<div class="text-center">
			<p class="text-sm font-semibold tracking-tight">Checking workspace access.</p>
			<p class="mt-2 text-xs leading-5 text-muted-foreground">You will be redirected if needed.</p>
		</div>
	</main>
{:else}
	<Sidebar.Provider
		bind:open={sidebarOpen}
		class="h-svh overflow-hidden"
		style="--sidebar-width: 15rem;"
	>
		<Sidebar.Root class="overflow-hidden" collapsible="icon">
			<nav id="workspace-sidebar-nav" class="flex min-h-0 flex-1 flex-col" aria-label="Workspace">
				<Sidebar.Header class="flex h-10 items-center border-b border-sidebar-border/60 px-2 py-1">
					<Sidebar.Menu class="flex flex-row items-center gap-1">
						<Sidebar.MenuItem class="min-w-0 flex-1 group-data-[collapsible=icon]:flex-none">
							<Sidebar.MenuButton
								size="sm"
								class="h-8 min-w-0 gap-2 rounded-md px-1.5 text-sidebar-foreground group-data-[collapsible=icon]:px-0 hover:bg-sidebar-accent/55 hover:text-sidebar-accent-foreground"
							>
								{#snippet child({ props })}
									<a
										href={resolve(workspaceRootHref() as '/workspace')}
										data-workspace-nav-item
										aria-label={sidebarHomeLinkAria}
										title={sidebarHomeTitleFull}
										{...props}
									>
										<div
											class="flex aspect-square size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground group-data-[collapsible=icon]:size-8"
										>
											<LaunchpadMarkOutline class="size-3.5" aria-hidden="true" />
										</div>
										<span class="min-w-0 flex-1 group-data-[collapsible=icon]:sr-only">
											<span
												class="block text-[10px] leading-3 font-medium text-sidebar-foreground/60"
											>
												Current
											</span>
											<span class="block truncate text-xs leading-4 font-semibold">
												{sidebarHomeDisplayLabel}
											</span>
										</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					</Sidebar.Menu>
				</Sidebar.Header>

				<Sidebar.Content class="gap-1 py-1.5">
					{#if workspaceListError}
						<div
							class="border-b border-destructive/25 bg-destructive/10 px-3 py-2.5 text-[11px] text-destructive"
							role="status"
						>
							<p class="font-medium">Could not load part of the workspace</p>
							<p class="mt-1 leading-snug opacity-90">{workspaceListError.message}</p>
							<Button
								type="button"
								variant="secondary"
								size="sm"
								class="mt-2 h-7 text-xs"
								onclick={() => {
									void invalidateAll();
								}}
							>
								Try again
							</Button>
						</div>
					{/if}
					<Sidebar.Group class="px-2 py-1 group-data-[collapsible=icon]:px-2">
						<Sidebar.Menu
							class="gap-1 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/25 p-1 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0"
						>
							<Sidebar.MenuItem>
								<Sidebar.MenuButton
									size="sm"
									isActive={isNewChatActive}
									class={cn(actionPill, 'min-w-0')}
									tooltipContent="New chat"
								>
									{#snippet child({ props })}
										<a
											href={resolve(workspaceRootHref() as '/workspace')}
											data-workspace-nav-item
											aria-label="New chat"
											{...props}
										>
											<HugeiconsIcon icon={ChatAdd01Icon} strokeWidth={2} />
											<span class="min-w-0 truncate group-data-[collapsible=icon]:sr-only"
												>New chat</span
											>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
							<Sidebar.MenuItem>
								<Sidebar.MenuButton
									size="sm"
									class={cn(actionPill, 'min-w-0')}
									tooltipContent="Create artifact"
									onclick={openCreateArtifactDialog}
								>
									<HugeiconsIcon icon={File01Icon} strokeWidth={2} />
									<span class="min-w-0 truncate group-data-[collapsible=icon]:sr-only"
										>Create artifact</span
									>
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						</Sidebar.Menu>
					</Sidebar.Group>

					<Collapsible.Root bind:open={openSections.Projects} class="border-0 shadow-none ring-0">
						<Sidebar.Group class="border-0 shadow-none ring-0">
							<Collapsible.Trigger class={sectionTrigger}>
								<HugeiconsIcon
									icon={ArrowRight01Icon}
									strokeWidth={2}
									class="size-3 shrink-0 transition-transform group-data-[state=open]/section:rotate-90"
								/>
								<span class="min-w-0 truncate">Projects</span>
								{#if projects.data && projects.data.length > 0}
									<span class="ml-auto text-[10px] font-medium text-sidebar-foreground/55">
										{projects.data.length}
									</span>
								{/if}
							</Collapsible.Trigger>
							<Collapsible.Content
								class="overflow-hidden group-data-[collapsible=icon]:hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
							>
								<Sidebar.GroupContent>
									<Sidebar.Menu>
										{#if projects.data === undefined}
											<Sidebar.MenuItem>
												<Sidebar.MenuButton size="sm" aria-disabled class={cn(navPill, 'min-w-0')}>
													<span class="min-w-0 truncate">Loading projects…</span>
												</Sidebar.MenuButton>
											</Sidebar.MenuItem>
										{:else if projects.data.length === 0}
											<Sidebar.MenuItem>
												<div class="space-y-2 px-2 py-1.5">
													<p class="text-[11px] leading-snug text-sidebar-foreground/65">
														Promoted chats land here when an idea becomes focused work.
													</p>
												</div>
											</Sidebar.MenuItem>
										{:else}
											{#each projects.data as project (project._id)}
												<Sidebar.MenuItem class="mb-0.5 min-w-0 last:mb-0">
													<Collapsible.Root
														open={isProjectOpen(project._id)}
														onOpenChange={(open) => setProjectOpen(project._id, open)}
													>
														<div class="flex w-full min-w-0 items-center gap-0.5">
															<Collapsible.Trigger class="min-h-0 min-w-0 flex-1">
																{#snippet child({ props })}
																	<Sidebar.MenuButton
																		size="sm"
																		isActive={activeProjectId === project._id && !activeThreadId}
																		class={cn(navPill, 'w-full min-w-0')}
																		{...props}
																	>
																		<HugeiconsIcon
																			icon={ArrowRight01Icon}
																			strokeWidth={2}
																			class="size-3 shrink-0 transition-transform data-[state=open]:rotate-90"
																			data-state={isProjectOpen(project._id) ? 'open' : 'closed'}
																		/>
																		<HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />
																		<span class="min-w-0 truncate" title={project.name}
																			>{project.name}</span
																		>
																	</Sidebar.MenuButton>
																{/snippet}
															</Collapsible.Trigger>
															<div
																class="flex shrink-0 items-center gap-0.5 group-data-[collapsible=icon]:hidden"
															>
																<DropdownMenu.Root>
																	<DropdownMenu.Trigger
																		type="button"
																		class="inline-flex size-7 items-center justify-center rounded-md text-sidebar-foreground/60 ring-sidebar-ring transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:outline-hidden [&>svg]:size-3"
																		onclick={(e) => e.stopPropagation()}
																		onpointerdown={(e) => e.stopPropagation()}
																		aria-label={`Project actions: ${project.name}`}
																	>
																		<HugeiconsIcon
																			icon={MoreHorizontalCircle01Icon}
																			strokeWidth={2}
																		/>
																	</DropdownMenu.Trigger>
																	<DropdownMenu.Content class="min-w-40" align="end">
																		<DropdownMenu.Item
																			variant="destructive"
																			onclick={() =>
																				openDeleteProjectDialog(project._id, project.name)}
																		>
																			Delete project
																		</DropdownMenu.Item>
																	</DropdownMenu.Content>
																</DropdownMenu.Root>
																<a
																	href={resolve(workspaceProjectHref(project._id) as '/workspace')}
																	data-workspace-nav-item
																	class="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/60 ring-sidebar-ring transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:outline-hidden [&>svg]:size-3"
																	aria-label={`New chat in ${project.name}`}
																>
																	<HugeiconsIcon icon={ChatAdd01Icon} strokeWidth={2} />
																</a>
															</div>
														</div>
														<Collapsible.Content
															class="overflow-hidden pt-0.5 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
														>
															<Sidebar.MenuSub>
																{@const threadsForProject = projectThreads(project._id)}
																{#if threads.data === undefined}
																	<Sidebar.MenuSubItem>
																		<Sidebar.MenuSubButton aria-disabled class={subNavPill}>
																			<span>Loading chats…</span>
																		</Sidebar.MenuSubButton>
																	</Sidebar.MenuSubItem>
																{:else if threadsForProject.length === 0}
																	<Sidebar.MenuSubItem>
																		<Sidebar.MenuSubButton class={subNavPill}>
																			{#snippet child({ props })}
																				<a
																					href={resolve(
																						workspaceProjectHref(project._id) as '/workspace'
																					)}
																					data-workspace-nav-item
																					{...props}
																				>
																					<span class="text-sidebar-foreground/65">Start chat</span>
																				</a>
																			{/snippet}
																		</Sidebar.MenuSubButton>
																	</Sidebar.MenuSubItem>
																{:else}
																	{#each threadsForProject as thread (thread._id)}
																		<Sidebar.MenuSubItem class="min-w-0">
																			<div
																				class="group/subthread flex w-full min-w-0 items-center gap-0.5"
																			>
																				<Sidebar.MenuSubButton
																					size="sm"
																					isActive={activeThreadId === thread._id}
																					class={cn(subNavPill, 'min-h-0 min-w-0 flex-1')}
																				>
																					{#snippet child({ props })}
																						<a
																							href={resolve(
																								workspaceThreadHref(thread) as '/workspace'
																							)}
																							data-workspace-nav-item
																							title={formatThreadTitleForDisplay(thread.title)}
																							{...props}
																						>
																							<span class="min-w-0 truncate"
																								>{formatThreadTitleForDisplay(thread.title)}</span
																							>
																						</a>
																					{/snippet}
																				</Sidebar.MenuSubButton>
																				<DropdownMenu.Root>
																					<DropdownMenu.Trigger
																						type="button"
																						class="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/60 opacity-0 ring-sidebar-ring transition-colors group-focus-within/subthread:opacity-100 group-hover/subthread:opacity-100 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-hidden [&>svg]:size-3"
																						onclick={(e) => e.stopPropagation()}
																						onpointerdown={(e) => e.stopPropagation()}
																						aria-label={`Chat actions: ${formatThreadTitleForDisplay(thread.title)}`}
																					>
																						<HugeiconsIcon
																							icon={MoreHorizontalCircle01Icon}
																							strokeWidth={2}
																						/>
																					</DropdownMenu.Trigger>
																					<DropdownMenu.Content class="min-w-40" align="end">
																						<DropdownMenu.Item
																							variant="destructive"
																							onclick={() =>
																								openDeleteThreadDialog(
																									thread._id,
																									thread.title,
																									project._id
																								)}
																						>
																							Delete thread
																						</DropdownMenu.Item>
																					</DropdownMenu.Content>
																				</DropdownMenu.Root>
																			</div>
																		</Sidebar.MenuSubItem>
																	{/each}
																{/if}
															</Sidebar.MenuSub>
														</Collapsible.Content>
													</Collapsible.Root>
												</Sidebar.MenuItem>
											{/each}
										{/if}
									</Sidebar.Menu>
								</Sidebar.GroupContent>
							</Collapsible.Content>
						</Sidebar.Group>
					</Collapsible.Root>

					<Collapsible.Root bind:open={openSections.Chats} class="border-0 shadow-none ring-0">
						<Sidebar.Group class="border-0 shadow-none ring-0">
							<Collapsible.Trigger class={sectionTrigger}>
								<HugeiconsIcon
									icon={ArrowRight01Icon}
									strokeWidth={2}
									class="size-3 shrink-0 transition-transform group-data-[state=open]/section:rotate-90"
								/>
								<span class="min-w-0 truncate">Inbox</span>
								{#if threads.data && generalThreads.length > 0}
									<span class="ml-auto text-[10px] font-medium text-sidebar-foreground/55">
										{generalThreads.length}
									</span>
								{/if}
							</Collapsible.Trigger>
							<Collapsible.Content
								class="overflow-hidden group-data-[collapsible=icon]:hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
							>
								<Sidebar.GroupContent>
									<Sidebar.Menu>
										{#if threads.data === undefined}
											<Sidebar.MenuItem>
												<Sidebar.MenuButton size="sm" aria-disabled class={cn(navPill, 'min-w-0')}>
													<span class="min-w-0 truncate">Loading chats…</span>
												</Sidebar.MenuButton>
											</Sidebar.MenuItem>
										{:else if generalThreads.length === 0}
											<Sidebar.MenuItem>
												<div class="space-y-2 px-2 py-1.5">
													<p class="text-[11px] leading-snug text-sidebar-foreground/65">
														Start with a messy note, then promote it when it has shape.
													</p>
													<Sidebar.MenuButton size="sm" class={cn(navPill, 'min-w-0')}>
														{#snippet child({ props })}
															<a
																href={resolve(workspaceRootHref() as '/workspace')}
																data-workspace-nav-item
																{...props}
															>
																<HugeiconsIcon icon={ChatAdd01Icon} strokeWidth={2} />
																<span class="min-w-0 truncate">Start first chat</span>
															</a>
														{/snippet}
													</Sidebar.MenuButton>
												</div>
											</Sidebar.MenuItem>
										{:else}
											{#each generalThreads as thread (thread._id)}
												<Sidebar.MenuItem class="min-w-0">
													<div class="group/inbox-thread flex w-full min-w-0 items-center gap-0.5">
														<Sidebar.MenuButton
															size="sm"
															isActive={activeThreadId === thread._id}
															class={cn(navPill, 'min-h-0 min-w-0 flex-1')}
														>
															{#snippet child({ props })}
																<a
																	href={resolve(workspaceThreadHref(thread) as '/workspace')}
																	data-workspace-nav-item
																	title={formatThreadTitleForDisplay(thread.title)}
																	{...props}
																>
																	<span class="min-w-0 truncate"
																		>{formatThreadTitleForDisplay(thread.title)}</span
																	>
																</a>
															{/snippet}
														</Sidebar.MenuButton>
														<DropdownMenu.Root>
															<DropdownMenu.Trigger
																type="button"
																class="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/60 opacity-0 ring-sidebar-ring transition-colors group-focus-within/inbox-thread:opacity-100 group-hover/inbox-thread:opacity-100 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-hidden [&>svg]:size-3"
																onclick={(e) => e.stopPropagation()}
																onpointerdown={(e) => e.stopPropagation()}
																aria-label={`Chat actions: ${formatThreadTitleForDisplay(thread.title)}`}
															>
																<HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} />
															</DropdownMenu.Trigger>
															<DropdownMenu.Content class="min-w-40" align="end">
																<DropdownMenu.Item
																	variant="destructive"
																	onclick={() =>
																		openDeleteThreadDialog(thread._id, thread.title, null)}
																>
																	Delete thread
																</DropdownMenu.Item>
															</DropdownMenu.Content>
														</DropdownMenu.Root>
													</div>
												</Sidebar.MenuItem>
											{/each}
										{/if}
									</Sidebar.Menu>
								</Sidebar.GroupContent>
							</Collapsible.Content>
						</Sidebar.Group>
					</Collapsible.Root>

					<Collapsible.Root bind:open={openSections.Artifacts} class="border-0 shadow-none ring-0">
						<Sidebar.Group class="border-0 shadow-none ring-0">
							<Collapsible.Trigger class={sectionTrigger}>
								<HugeiconsIcon
									icon={ArrowRight01Icon}
									strokeWidth={2}
									class="size-3 shrink-0 transition-transform group-data-[state=open]/section:rotate-90"
								/>
								<span class="min-w-0 truncate">Artifacts</span>
								{#if artifacts.data && artifacts.data.length > 0}
									<span class="ml-auto text-[10px] font-medium text-sidebar-foreground/55">
										{artifacts.data.length}
									</span>
								{/if}
							</Collapsible.Trigger>
							<Collapsible.Content
								class="overflow-hidden group-data-[collapsible=icon]:hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
							>
								<Sidebar.GroupContent>
									<Sidebar.Menu>
										{#if artifacts.data === undefined}
											<Sidebar.MenuItem>
												<Sidebar.MenuButton size="sm" aria-disabled class={cn(navPill, 'min-w-0')}>
													<span class="min-w-0 truncate">Loading artifacts…</span>
												</Sidebar.MenuButton>
											</Sidebar.MenuItem>
										{:else if artifacts.data.length === 0}
											<Sidebar.MenuItem>
												<p class="px-2 py-1.5 text-[11px] leading-snug text-sidebar-foreground/65">
													Saved ideas, PRDs, notes, and research appear here.
												</p>
											</Sidebar.MenuItem>
										{:else}
											{#each artifactGroups as group (group.key)}
												{#if group.artifacts.length > 0}
													<li class="list-none px-2 pt-2 pb-0.5 first:pt-0" role="presentation">
														<p class="text-[10px] font-semibold text-sidebar-foreground/55">
															{group.label}
														</p>
													</li>
													{#each group.artifacts as artifact (artifact._id)}
														{@const canUseArtifactInThread =
															Boolean(activeThreadId) &&
															(activeProjectId
																? artifact.projectId === activeProjectId
																: !artifact.projectId) &&
															!activeThreadArtifactIds.has(artifact._id)}
														<Sidebar.MenuItem>
															<Sidebar.MenuButton
																size="sm"
																isActive={activeArtifactId === artifact._id && !activeThreadId}
																class={cn(navPill, 'min-w-0 gap-2')}
																tooltipContent={artifact.title}
															>
																{#snippet child({ props })}
																	<a
																		href={resolve(
																			workspaceArtifactHref(artifact._id) as '/workspace'
																		)}
																		data-workspace-nav-item
																		{...props}
																	>
																		<span class="min-w-0 flex-1 truncate">{artifact.title}</span>
																		<span class="shrink-0 text-[10px] text-sidebar-foreground/55">
																			{artifactTypeLabel(artifact.type)}
																		</span>
																	</a>
																{/snippet}
															</Sidebar.MenuButton>
															{#if canUseArtifactInThread}
																<Sidebar.MenuAction
																	showOnHover
																	aria-label="Use artifact in this chat"
																	aria-disabled={Boolean(importingArtifactId)}
																	onclick={() => useArtifactInThread(artifact._id)}
																>
																	{importingArtifactId === artifact._id ? '…' : '+'}
																</Sidebar.MenuAction>
															{/if}
														</Sidebar.MenuItem>
													{/each}
												{/if}
											{/each}
										{/if}
									</Sidebar.Menu>
								</Sidebar.GroupContent>
							</Collapsible.Content>
						</Sidebar.Group>
					</Collapsible.Root>
				</Sidebar.Content>

				<Sidebar.Footer class="border-t border-sidebar-border/60 p-2">
					<div class="group-data-[collapsible=icon]:hidden">
						{#if budget.data}
							<a
								href={resolve(workspaceSettingsHref() as '/workspace/settings')}
								data-workspace-nav-item
								class="mb-2 block rounded-lg border border-sidebar-border/60 bg-sidebar-accent/20 px-2.5 py-2 transition-colors outline-none hover:bg-sidebar-accent/40 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
								aria-label={usageTooltip}
							>
								<div
									class="mb-1.5 flex items-center justify-between gap-2 text-[10px] text-sidebar-foreground/65"
								>
									<span class="font-semibold">AI today</span>
									<span class="text-sidebar-foreground/75 tabular-nums">
										{money.format(budget.data.spentUsd)} / {money.format(budget.data.capUsd)}
									</span>
								</div>
								<div class="h-1 w-full overflow-hidden rounded-full bg-sidebar-border/70">
									<div
										class="h-full rounded-full bg-sidebar-foreground/75 transition-[width]"
										style="width: {usageBarPct}%"
									></div>
								</div>
							</a>
						{:else if budget.error}
							<div class="mb-2 space-y-1.5 px-1.5">
								<p class="text-[10px] leading-snug text-destructive">Could not load usage.</p>
								<Button
									type="button"
									variant="secondary"
									size="sm"
									class="h-7 w-full text-[10px]"
									onclick={() => {
										void invalidateAll();
									}}
								>
									Retry
								</Button>
							</div>
						{:else}
							<p class="mb-2 px-1.5 text-[10px] text-sidebar-foreground/60">Loading usage…</p>
						{/if}
					</div>

					<div class="mb-1 hidden justify-center group-data-[collapsible=icon]:flex">
						{#snippet collapsedUsageTooltip()}
							{#if budget.data}
								<div class="w-44 space-y-1">
									<div class="flex items-center justify-between gap-2">
										<span
											class="text-[10px] font-medium tracking-wide text-muted-foreground uppercase"
										>
											AI today
										</span>
										<span class="text-xs text-foreground tabular-nums">
											{money.format(budget.data.spentUsd)} / {money.format(budget.data.capUsd)}
										</span>
									</div>
									<div class="h-1 w-full overflow-hidden rounded-full bg-muted">
										<div
											class="h-full rounded-full bg-primary transition-[width]"
											style="width: {usageBarPct}%"
										></div>
									</div>
									<p class="text-[10px] text-muted-foreground">{budget.data.dateKey}</p>
								</div>
							{:else}
								<span class="text-xs text-muted-foreground">Usage</span>
							{/if}
						{/snippet}
						<Sidebar.Menu>
							<Sidebar.MenuItem>
								<Sidebar.MenuButton
									size="sm"
									class={footerPill}
									tooltipContent={collapsedUsageTooltip}
									tooltipContentProps={{
										class:
											'rounded-lg border border-border/70 bg-popover px-2.5 py-2 text-xs text-foreground'
									}}
								>
									{#snippet child({ props })}
										<a
											href={resolve(workspaceSettingsHref() as '/workspace/settings')}
											data-workspace-nav-item
											aria-label={usageTooltip}
											{...props}
										>
											<HugeiconsIcon icon={DollarCircleIcon} strokeWidth={2} />
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						</Sidebar.Menu>
					</div>

					<Sidebar.Menu class="gap-0.5 border-t border-sidebar-border/45 pt-1.5">
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								size="sm"
								isActive={isSettingsActive}
								tooltipContent="Settings"
								class={cn(footerPill, 'min-w-0')}
							>
								{#snippet child({ props })}
									<a
										href={resolve(workspaceSettingsHref() as '/workspace/settings')}
										data-workspace-nav-item
										aria-label="Settings"
										{...props}
									>
										<HugeiconsIcon icon={Settings01Icon} strokeWidth={2} />
										<span class="min-w-0 truncate group-data-[collapsible=icon]:sr-only"
											>Settings</span
										>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
						<ThemeMenu variant="sidebar-label" />
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								size="sm"
								tooltipContent="Sign out"
								class={cn(footerPill, 'min-w-0')}
								aria-disabled={isSigningOut}
								onclick={handleSignOut}
							>
								<HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
								<span class="group-data-[collapsible=icon]:sr-only">
									{isSigningOut ? 'Signing out…' : 'Sign out'}
								</span>
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					</Sidebar.Menu>
				</Sidebar.Footer>
			</nav>
		</Sidebar.Root>

		<Sidebar.Inset class="min-h-0 min-w-0 overflow-hidden">
			<header
				class="flex h-10 shrink-0 items-center gap-1.5 border-b border-border/50 bg-background px-2 py-1"
			>
				<Sidebar.Trigger class="shrink-0" />
				<Button
					type="button"
					variant="ghost"
					size="sm"
					class="h-7 shrink-0 gap-1.5 px-2 text-[11px] text-muted-foreground"
					aria-label="Open command center"
					onclick={() => {
						commandCenterOpen = true;
					}}
				>
					<HugeiconsIcon icon={Search01Icon} strokeWidth={2} class="size-3.5 opacity-80" />
					<span class="hidden min-[400px]:inline">Search</span>
					<Kbd.KbdGroup class="hidden gap-0.5 opacity-80 min-[400px]:inline-flex">
						<Kbd.Kbd>⌘</Kbd.Kbd>
						<Kbd.Kbd>K</Kbd.Kbd>
					</Kbd.KbdGroup>
				</Button>
				<div class="flex min-w-0 flex-1 items-center gap-0.5">
					<WorkspaceTabStrip
						tabs={tabStrip.data?.tabs ?? []}
						activeTarget={activeWorkspaceTarget}
						projects={projects.data}
						threads={threads.data}
						artifacts={artifacts.data}
						onSelectTab={(t) => {
							void selectWorkspaceTab(t);
						}}
						onCloseTab={(id) => {
							void closeWorkspaceTab(id);
						}}
					/>
					<WorkspaceTabPicker
						bind:open={tabPickerOpen}
						projects={projects.data}
						threads={threads.data}
						artifacts={artifacts.data}
					/>
				</div>

				{#if workspaceArtifactChrome.value}
					<div
						class="flex max-w-[min(100%,20rem)] shrink-[2] flex-wrap items-center justify-end gap-1 sm:max-w-none"
					>
						{#if workspaceArtifactChrome.value.onBack}
							<Button
								type="button"
								variant="ghost"
								size="icon"
								class="size-8 shrink-0"
								aria-label="Back to thread artifacts"
								onclick={() => workspaceArtifactChrome.value?.onBack?.()}
							>
								<HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} class="size-4" />
							</Button>
						{/if}
						<div class="inline-flex shrink-0 items-center rounded-md border border-border/70 p-0.5">
							<Button
								type="button"
								size="sm"
								variant={workspaceArtifactChrome.value.surfaceMode === 'read'
									? 'secondary'
									: 'ghost'}
								class="h-7 rounded-sm px-2 text-xs font-medium"
								onclick={() => workspaceArtifactChrome.value?.setRead()}
							>
								Read
							</Button>
							<Button
								type="button"
								size="sm"
								variant={workspaceArtifactChrome.value.surfaceMode === 'history'
									? 'secondary'
									: 'ghost'}
								class="h-7 rounded-sm px-2 text-xs font-medium"
								disabled={!workspaceArtifactChrome.value.canHistory}
								title={!workspaceArtifactChrome.value.canHistory
									? 'No saved versions to inspect yet'
									: undefined}
								onclick={() => workspaceArtifactChrome.value?.setHistory()}
							>
								History
							</Button>
						</div>
					</div>
				{/if}
				{#if canPromoteThreadToProject}
					<Button
						type="button"
						variant="outline"
						size="sm"
						class="h-8 shrink-0 gap-1.5 px-2 text-xs font-medium"
						onclick={openPromoteDialog}
					>
						<HugeiconsIcon icon={Rocket01Icon} strokeWidth={2} class="size-3.5 shrink-0" />
						<span class="hidden min-[420px]:inline">Create project from chat</span>
						<span class="min-[420px]:hidden">Project</span>
					</Button>
				{/if}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						type="button"
						class="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-input bg-background px-2 text-xs font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
					>
						<HugeiconsIcon icon={Folder01Icon} strokeWidth={2} class="size-3.5 shrink-0" />
						<span class="hidden min-[460px]:inline">New project</span>
						<span class="min-[460px]:hidden">New</span>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="min-w-56">
						<DropdownMenu.Item
							onclick={() => {
								void goto(resolve(workspaceRootHref() as '/workspace'));
							}}
						>
							Start from scratch
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={openImportDialog}>
							Import external AI context
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						type="button"
						class="relative inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground ring-ring hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:outline-hidden"
						aria-label={unreadNotificationCount > 0
							? `${unreadNotificationCount} unread notifications`
							: 'Open notifications'}
					>
						<HugeiconsIcon icon={BellDotIcon} strokeWidth={2} class="size-4" />
						{#if unreadNotificationCount > 0}
							<span
								class="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground"
							>
								{unreadNotificationLabel}
							</span>
						{/if}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-[22rem] max-w-[calc(100vw-1rem)] p-0">
						<div class="flex h-10 items-center justify-between border-b border-border/50 px-3">
							<div>
								<p class="text-xs font-semibold tracking-tight">Notifications</p>
								<p class="text-[11px] text-muted-foreground">
									{unreadNotificationCount === 0
										? 'All caught up'
										: `${unreadNotificationCount} unread`}
								</p>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								class="h-7 px-2 text-[11px]"
								disabled={unreadNotificationCount === 0 || notificationActionId === 'mark-all'}
								onclick={markAllNotificationsRead}
							>
								Mark all read
							</Button>
						</div>

						{#if notificationError}
							<div class="px-3 py-4 text-xs text-destructive" role="status">
								Could not load notifications.
							</div>
						{:else if notifications.data === undefined}
							<div class="space-y-2 px-3 py-3">
								<div class="h-10 rounded-md bg-muted/70"></div>
								<div class="h-10 rounded-md bg-muted/50"></div>
							</div>
						{:else if notificationRows.length === 0}
							<div class="px-3 py-6 text-center">
								<div
									class="mx-auto flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
								>
									<HugeiconsIcon icon={InboxIcon} strokeWidth={2} class="size-4" />
								</div>
								<p class="mt-2 text-xs font-medium">No notifications</p>
								<p class="mt-1 text-[11px] text-muted-foreground">
									New workspace updates will appear here.
								</p>
							</div>
						{:else}
							<div class="max-h-[min(30rem,70vh)] overflow-y-auto p-1">
								{#each notificationRows as notification (notification._id)}
									<div
										class="group/notification rounded-md px-2 py-2 hover:bg-accent/70"
										data-unread={notification.status === 'unread'}
									>
										<div class="flex items-start gap-2">
											<div
												class={cn(
													'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border [&>svg]:size-3',
													notificationStateClasses(notification.state)
												)}
											>
												<HugeiconsIcon
													icon={notificationStateIcon(notification.state)}
													strokeWidth={2}
												/>
											</div>
											<div class="min-w-0 flex-1">
												<div class="flex min-w-0 items-start justify-between gap-2">
													<button
														type="button"
														class="min-w-0 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
														onclick={() => openNotification(notification)}
													>
														<span class="flex min-w-0 items-center gap-1.5">
															{#if notification.status === 'unread'}
																<span
																	class="size-1.5 shrink-0 rounded-full bg-primary"
																	aria-hidden="true"
																></span>
															{/if}
															<span class="truncate text-xs font-medium">{notification.title}</span>
														</span>
														{#if notification.body}
															<span
																class="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-muted-foreground"
															>
																{notification.body}
															</span>
														{/if}
													</button>
													<span
														class="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] leading-none {notificationStateClasses(
															notification.state
														)}"
													>
														{notificationStateLabel(notification.state)}
													</span>
												</div>
												<div class="mt-2 flex flex-wrap items-center gap-1.5">
													<Button
														type="button"
														variant="secondary"
														size="sm"
														class="h-6 px-2 text-[11px]"
														disabled={notificationActionId === `open:${notification._id}`}
														onclick={() => openNotification(notification)}
													>
														{primaryNotificationActionLabel(notification)}
													</Button>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														class="h-6 px-2 text-[11px]"
														disabled={notificationActionId === `dismiss:${notification._id}`}
														onclick={() => dismissNotification(notification)}
													>
														Dismiss
													</Button>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														class="h-6 px-2 text-[11px] text-destructive hover:text-destructive"
														disabled={notificationActionId === `delete:${notification._id}`}
														onclick={() => deleteNotification(notification)}
													>
														Delete
													</Button>
													<span class="ml-auto text-[10px] text-muted-foreground">
														{formatNotificationTime(notification.createdAt)}
													</span>
												</div>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
				{#if activeThreadId}
					<Button
						type="button"
						variant={contextPanelOpen ? 'secondary' : 'ghost'}
						size="icon"
						class="size-8 shrink-0"
						aria-label={contextPanelOpen ? 'Close thread context' : 'Open thread context'}
						onclick={toggleThreadContext}
					>
						{#if contextPanelOpen}
							<HugeiconsIcon icon={PanelRightCloseIcon} strokeWidth={2} class="size-3.5" />
						{:else}
							<HugeiconsIcon icon={PanelRightOpenIcon} strokeWidth={2} class="size-3.5" />
						{/if}
					</Button>
				{/if}
			</header>

			<main class="min-h-0 flex-1 overflow-hidden bg-background text-foreground">
				{#if workspaceNotice || artifactActionError}
					<div
						class="border-b border-border/50 px-4 py-2 text-xs {artifactActionError
							? 'text-destructive'
							: 'text-muted-foreground'}"
						role="status"
					>
						{artifactActionError || workspaceNotice}
					</div>
				{/if}
				{@render children()}
			</main>
		</Sidebar.Inset>

		<WorkspaceCommandPalette
			bind:open={commandCenterOpen}
			projects={projects.data}
			threads={threads.data}
			artifacts={artifacts.data}
			{activeThreadId}
			{activeThreadArtifactIds}
			{contextPanelOpen}
			{canPromoteThreadToProject}
			onRequestPromote={openPromoteDialog}
			onRequestCreateArtifact={openCreateArtifactDialog}
			onUseArtifactInThread={useArtifactInThread}
			onToggleThreadContext={toggleThreadContext}
		/>

		<WorkspaceExternalContextImportDialog
			bind:open={importDialogOpen}
			onReviewStarted={openImportReview}
		/>

		<WorkspaceDeleteConfirmDialog
			bind:open={projectDeleteDialogOpen}
			title="Delete project"
			description={projectToDelete
				? `This removes “${projectToDelete.name}” and all of its chats and saved artifacts. This cannot be undone.`
				: ''}
			confirmLabel="Delete project"
			pendingLabel="Deleting…"
			isDeleting={isDeletingProject}
			confirmDisabled={!projectToDelete}
			error={deleteNavError}
			onCancel={closeDeleteProjectDialog}
			onConfirm={confirmDeleteProject}
		/>

		<WorkspaceDeleteConfirmDialog
			bind:open={threadDeleteDialogOpen}
			title="Delete thread"
			description={threadToDelete
				? `This removes “${formatThreadTitleForDisplay(threadToDelete.title)}” and its messages and saved artifacts. This cannot be undone.`
				: ''}
			confirmLabel="Delete thread"
			pendingLabel="Deleting…"
			isDeleting={isDeletingThread}
			confirmDisabled={!threadToDelete}
			error={deleteNavError}
			onCancel={closeDeleteThreadDialog}
			onConfirm={confirmDeleteThread}
		/>

		<Dialog.Root bind:open={promoteDialogOpen}>
			<Dialog.Content class="sm:max-w-2xl" showCloseButton={!isPromoting && !isLoadingReadiness}>
				<form
					class="space-y-4"
					onsubmit={(event) => {
						event.preventDefault();
						void promoteThreadToProject();
					}}
				>
					<Dialog.Header>
						<Dialog.Title>Review project readiness</Dialog.Title>
						<Dialog.Description>
							Confirm what is strong, what is missing, and what will move before creating the
							project.
						</Dialog.Description>
					</Dialog.Header>

					<div class="grid gap-3 sm:grid-cols-[1fr_1fr]">
						<div class="space-y-1.5">
							<Label for="promote-project-name">Project name</Label>
							<Input
								id="promote-project-name"
								bind:value={promoteName}
								placeholder="Project name"
								aria-invalid={promoteError ? 'true' : undefined}
								disabled={isPromoting}
							/>
						</div>
						<div class="space-y-1.5 sm:row-span-2">
							<Label for="promote-project-summary">Summary</Label>
							<Textarea
								id="promote-project-summary"
								bind:value={promoteSummary}
								placeholder="Context for future chats in this project"
								class="min-h-28"
								disabled={isPromoting}
							/>
						</div>
						<div class="space-y-1.5 text-xs text-muted-foreground">
							<p class="font-medium text-foreground">Included context</p>
							<p>
								This chat and {readinessIncludedArtifacts.length} linked artifact{readinessIncludedArtifacts.length ===
								1
									? ''
									: 's'} will move into the project.
							</p>
						</div>
					</div>

					{#if isLoadingReadiness}
						<p class="text-xs text-muted-foreground" role="status">Reviewing readiness…</p>
					{/if}
					{#if readinessWarning}
						<p class="text-xs text-muted-foreground">{readinessWarning}</p>
					{/if}

					<div class="grid gap-4 sm:grid-cols-2">
						<section class="space-y-2">
							<h3 class="text-xs font-medium text-foreground">Strong signals</h3>
							{#if readinessStrengths.length > 0}
								<ul class="space-y-1.5 text-xs leading-snug text-muted-foreground">
									{#each readinessStrengths as item (item)}
										<li>• {item}</li>
									{/each}
								</ul>
							{:else}
								<p class="text-xs text-muted-foreground">No readiness signals yet.</p>
							{/if}
						</section>
						<section class="space-y-2">
							<h3 class="text-xs font-medium text-foreground">Missing information</h3>
							{#if readinessMissingInformation.length > 0}
								<ul class="space-y-1.5 text-xs leading-snug text-muted-foreground">
									{#each readinessMissingInformation as item (item)}
										<li>• {item}</li>
									{/each}
								</ul>
							{:else}
								<p class="text-xs text-muted-foreground">No major gaps found.</p>
							{/if}
						</section>
					</div>

					<section class="space-y-2">
						<h3 class="text-xs font-medium text-foreground">Included artifacts</h3>
						{#if readinessIncludedArtifacts.length === 0}
							<p class="text-xs text-muted-foreground">
								No linked artifacts will move with this chat.
							</p>
						{:else}
							<div class="grid gap-3 sm:grid-cols-2">
								<div class="space-y-1.5">
									<p class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
										Created in this chat
									</p>
									{#if readinessCreatedArtifacts.length > 0}
										<ul class="space-y-1 text-xs text-muted-foreground">
											{#each readinessCreatedArtifacts as artifact (artifact.artifactId)}
												<li
													class="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-accent/50"
												>
													<span class="min-w-0 truncate text-foreground">{artifact.title}</span>
													<span class="shrink-0 text-[11px]"
														>{artifactTypeLabel(artifact.type)}</span
													>
												</li>
											{/each}
										</ul>
									{:else}
										<p class="text-xs text-muted-foreground">None.</p>
									{/if}
								</div>
								<div class="space-y-1.5">
									<p class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
										Referenced/imported
									</p>
									{#if readinessReferencedArtifacts.length > 0}
										<ul class="space-y-1 text-xs text-muted-foreground">
											{#each readinessReferencedArtifacts as artifact (artifact.artifactId)}
												<li
													class="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-accent/50"
												>
													<span class="min-w-0 truncate text-foreground">{artifact.title}</span>
													<span class="shrink-0 text-[11px]"
														>{artifactTypeLabel(artifact.type)}</span
													>
												</li>
											{/each}
										</ul>
									{:else}
										<p class="text-xs text-muted-foreground">None.</p>
									{/if}
								</div>
							</div>
						{/if}
					</section>

					{#if readinessKeyArtifacts.length > 0}
						<p class="text-[11px] leading-snug text-muted-foreground">
							Key artifacts: {readinessKeyArtifacts.join(', ')}
						</p>
					{/if}
					{#if promoteError}
						<p class="text-xs text-destructive">{promoteError}</p>
					{/if}

					<Dialog.Footer>
						<Button
							type="button"
							variant="secondary"
							disabled={isPromoting || isLoadingReadiness}
							onclick={closePromoteDialog}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isPromoting || isLoadingReadiness || !promoteName.trim()}
						>
							{isPromoting ? 'Creating…' : 'Create project'}
						</Button>
					</Dialog.Footer>
				</form>
			</Dialog.Content>
		</Dialog.Root>

		<WorkspaceCreateArtifactDialog
			bind:open={createArtifactDialogOpen}
			destination={createArtifactDestination}
			onCreate={createArtifact}
		/>
	</Sidebar.Provider>
{/if}
