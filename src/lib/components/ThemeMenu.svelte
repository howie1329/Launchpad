<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { setMode, userPrefersMode } from 'mode-watcher';
	import CheckIcon from '@lucide/svelte/icons/check';
	import MonitorIcon from '@lucide/svelte/icons/monitor';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import SunIcon from '@lucide/svelte/icons/sun';

	type Variant = 'default' | 'icon' | 'sidebar' | 'sidebar-label';

	let {
		variant = 'default' as Variant,
		align = 'end' as 'start' | 'end' | 'center'
	}: { variant?: Variant; align?: 'start' | 'end' | 'center' } = $props();

	const preference = $derived(userPrefersMode.current);

	const TriggerIcon = $derived(
		preference === 'system' ? MonitorIcon : preference === 'dark' ? MoonIcon : SunIcon
	);

	function select(next: 'light' | 'dark' | 'system') {
		setMode(next);
	}
</script>

{#snippet appearanceItems()}
	<DropdownMenu.Label class="text-[11px] font-normal text-muted-foreground"
		>Appearance</DropdownMenu.Label
	>
	<DropdownMenu.Separator />
	<DropdownMenu.Item class="gap-2" onclick={() => select('light')}>
		<SunIcon class="size-3.5" />
		<span class="flex-1">Light</span>
		{#if preference === 'light'}
			<CheckIcon class="size-3.5" />
		{/if}
	</DropdownMenu.Item>
	<DropdownMenu.Item class="gap-2" onclick={() => select('dark')}>
		<MoonIcon class="size-3.5" />
		<span class="flex-1">Dark</span>
		{#if preference === 'dark'}
			<CheckIcon class="size-3.5" />
		{/if}
	</DropdownMenu.Item>
	<DropdownMenu.Item class="gap-2" onclick={() => select('system')}>
		<MonitorIcon class="size-3.5" />
		<span class="flex-1">System</span>
		{#if preference === 'system'}
			<CheckIcon class="size-3.5" />
		{/if}
	</DropdownMenu.Item>
{/snippet}

{#if variant === 'sidebar' || variant === 'sidebar-label'}
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
							: 'h-7 min-w-0 gap-2 rounded-full px-2.5 text-xs [&>svg]:size-3'}
					>
						<TriggerIcon class={variant === 'sidebar' ? 'size-4' : 'size-3'} />
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
			<DropdownMenu.Content class="min-w-40" {align}>
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
						<TriggerIcon class="size-4" />
					</Button>
				{:else}
					<Button
						{...props}
						variant="ghost"
						size="sm"
						class="gap-1.5 text-muted-foreground hover:text-foreground"
						aria-label="Color theme"
					>
						<TriggerIcon class="size-3.5" />
						<span class="text-xs">Theme</span>
					</Button>
				{/if}
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content class="min-w-40" {align}>
			{@render appearanceItems()}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/if}
