<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';

	type Props = {
		open: boolean;
		title: string;
		description: string;
		confirmLabel: string;
		pendingLabel: string;
		isDeleting: boolean;
		confirmDisabled?: boolean;
		error?: string;
		onCancel: () => void;
		onConfirm: () => void;
	};

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel,
		pendingLabel,
		isDeleting,
		confirmDisabled = false,
		error = '',
		onCancel,
		onConfirm
	}: Props = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md" showCloseButton={!isDeleting}>
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>{description}</Dialog.Description>
		</Dialog.Header>
		{#if error}
			<p class="text-xs text-destructive">{error}</p>
		{/if}
		<Dialog.Footer>
			<Button type="button" variant="secondary" disabled={isDeleting} onclick={onCancel}>
				Cancel
			</Button>
			<Button
				type="button"
				variant="destructive"
				disabled={isDeleting || confirmDisabled}
				onclick={onConfirm}
			>
				{isDeleting ? pendingLabel : confirmLabel}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
