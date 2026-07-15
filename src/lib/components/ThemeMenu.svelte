<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import {
		COLOR_THEMES,
		getColorTheme,
		isColorThemeId,
		setColorTheme,
		type ColorThemeId
	} from '$lib/color-theme.svelte';
	import { setMode, userPrefersMode } from 'mode-watcher';
	import { ComputerIcon, Moon01Icon, Sun01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
	import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/svelte';

	type Variant = 'default' | 'icon' | 'sidebar' | 'sidebar-label' | 'submenu';

	let {
		variant = 'default' as Variant,
		align = 'end' as 'start' | 'end' | 'center'
	}: { variant?: Variant; align?: 'start' | 'end' | 'center' } = $props();

	const preference = $derived(userPrefersMode.current);
	let colorTheme = $state<ColorThemeId>('standard');

	const triggerIcon = $derived<IconSvgElement>(
		preference === 'system' ? ComputerIcon : preference === 'dark' ? Moon01Icon : Sun01Icon
	);

	function select(next: 'light' | 'dark' | 'system') {
		setMode(next);
	}

	function selectColorTheme(next: ColorThemeId) {
		colorTheme = next;
		setColorTheme(next);
	}

	onMount(() => {
		colorTheme = getColorTheme();
		const handleColorThemeChange = (event: Event) => {
			const next = (event as CustomEvent<unknown>).detail;
			if (isColorThemeId(next)) colorTheme = next;
		};

		window.addEventListener('launchpad:color-theme-change', handleColorThemeChange);
		return () => window.removeEventListener('launchpad:color-theme-change', handleColorThemeChange);
	});
</script>

{#snippet appearanceItems()}
	<DropdownMenu.Label class="text-[11px] font-normal text-muted-foreground"
		>Appearance</DropdownMenu.Label
	>
	<DropdownMenu.Separator />
	<DropdownMenu.Item class="gap-2" onclick={() => select('light')}>
		<HugeiconsIcon icon={Sun01Icon} strokeWidth={2} class="size-3.5" />
		<span class="flex-1">Light</span>
		{#if preference === 'light'}
			<HugeiconsIcon icon={Tick02Icon} strokeWidth={2} class="size-3.5" />
		{/if}
	</DropdownMenu.Item>
	<DropdownMenu.Item class="gap-2" onclick={() => select('dark')}>
		<HugeiconsIcon icon={Moon01Icon} strokeWidth={2} class="size-3.5" />
		<span class="flex-1">Dark</span>
		{#if preference === 'dark'}
			<HugeiconsIcon icon={Tick02Icon} strokeWidth={2} class="size-3.5" />
		{/if}
	</DropdownMenu.Item>
	<DropdownMenu.Item class="gap-2" onclick={() => select('system')}>
		<HugeiconsIcon icon={ComputerIcon} strokeWidth={2} class="size-3.5" />
		<span class="flex-1">System</span>
		{#if preference === 'system'}
			<HugeiconsIcon icon={Tick02Icon} strokeWidth={2} class="size-3.5" />
		{/if}
	</DropdownMenu.Item>
	<DropdownMenu.Separator />
	<DropdownMenu.Label class="text-[11px] font-normal text-muted-foreground"
		>Color theme</DropdownMenu.Label
	>
	{#each COLOR_THEMES as theme (theme.id)}
		<DropdownMenu.Item class="gap-2" onclick={() => selectColorTheme(theme.id)}>
			<span
				class="size-3 shrink-0 rounded-full border border-foreground/15"
				style={`background-color: ${theme.swatches[0]};`}
				aria-hidden="true"
			></span>
			<span class="flex-1">{theme.name}</span>
			{#if colorTheme === theme.id}
				<HugeiconsIcon icon={Tick02Icon} strokeWidth={2} class="size-3.5" />
			{/if}
		</DropdownMenu.Item>
	{/each}
{/snippet}

{#if variant === 'submenu'}
	<DropdownMenu.Sub>
		<DropdownMenu.SubTrigger class="gap-2">
			<HugeiconsIcon icon={triggerIcon} strokeWidth={2} class="size-3.5" />
			<span class="flex-1">Theme</span>
		</DropdownMenu.SubTrigger>
		<DropdownMenu.SubContent class="min-w-48">
			{@render appearanceItems()}
		</DropdownMenu.SubContent>
	</DropdownMenu.Sub>
{:else if variant === 'sidebar' || variant === 'sidebar-label'}
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton
						size="sm"
						{...props}
						tooltipContent="Color theme"
						class={variant === 'sidebar'
							? 'justify-center px-0 md:size-8 md:p-0'
							: 'h-7 min-w-0 gap-2 rounded-md px-2 text-xs text-sidebar-foreground/68 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground [&>svg]:size-3'}
					>
						<HugeiconsIcon
							icon={triggerIcon}
							strokeWidth={2}
							class={variant === 'sidebar' ? 'size-4' : 'size-3'}
						/>
						<span
							class={variant === 'sidebar'
								? 'sr-only'
								: 'min-w-0 truncate group-data-[collapsible=icon]:sr-only'}
						>
							Theme
						</span>
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content class="min-w-48" {align}>
				{@render appearanceItems()}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
{:else}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				{#if variant === 'icon'}
					<Button
						{...props}
						variant="ghost"
						size="icon"
						class="size-8 text-muted-foreground hover:text-foreground"
						aria-label="Color theme"
					>
						<HugeiconsIcon icon={triggerIcon} strokeWidth={2} class="size-4" />
					</Button>
				{:else}
					<Button
						{...props}
						variant="ghost"
						size="sm"
						class="gap-1.5 text-muted-foreground hover:text-foreground"
						aria-label="Color theme"
					>
						<HugeiconsIcon icon={triggerIcon} strokeWidth={2} class="size-3.5" />
						<span class="text-xs">Theme</span>
					</Button>
				{/if}
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content class="min-w-48" {align}>
			{@render appearanceItems()}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/if}
