<script lang="ts">
	import type { ArtifactContentFormat } from '$lib/artifacts';
	import { artifactTypeLabel } from '$lib/artifact-display';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { NativeSelect, NativeSelectOption } from '$lib/components/ui/native-select';
	import { Textarea } from '$lib/components/ui/textarea';

	type CreateArtifactDraft = {
		title: string;
		type: string;
		content: string;
		contentFormat: ArtifactContentFormat;
	};

	type Props = {
		open: boolean;
		destination: string;
		onCreate: (draft: CreateArtifactDraft) => Promise<void>;
	};

	let { open = $bindable(false), destination, onCreate }: Props = $props();

	let title = $state('');
	let typePreset = $state('notes');
	let customType = $state('');
	let formatPreset = $state<ArtifactContentFormat>('markdown');
	let body = $state('');
	let error = $state('');
	let isCreating = $state(false);
	let wasOpen = $state(open);

	const formatPresets = [
		{ value: 'markdown', label: 'Markdown' },
		{ value: 'html', label: 'HTML' },
		{ value: 'svg', label: 'SVG' }
	] as const;

	const typePresets = [
		{ value: 'idea', label: 'Idea' },
		{ value: 'prd', label: 'PRD' },
		{ value: 'research', label: 'Research' },
		{ value: 'notes', label: 'Notes' },
		{ value: 'custom', label: 'Custom' }
	] as const;

	const selectedTypeLabel = $derived(
		typePreset === 'custom'
			? customType.trim() || 'Custom type'
			: (typePresets.find((preset) => preset.value === typePreset)?.label ?? 'Artifact')
	);
	const isDirty = $derived(
		Boolean(title.trim() || body.trim() || customType.trim() || typePreset !== 'notes')
	);
	const canCreate = $derived(
		Boolean(title.trim() && body.trim() && (typePreset !== 'custom' || customType.trim()))
	);

	function resetDraft() {
		title = '';
		typePreset = 'notes';
		customType = '';
		formatPreset = 'markdown';
		body = '';
		error = '';
	}

	function close() {
		if (isCreating) return;
		if (isDirty && !window.confirm('Discard this artifact draft?')) return;
		open = false;
		error = '';
	}

	function handleDismiss(event: Event) {
		event.preventDefault();
		close();
	}

	function handleKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && canCreate) {
			event.preventDefault();
			void createArtifact();
		}
	}

	async function createArtifact() {
		if (isCreating) return;

		const nextTitle = title.trim();
		const nextType = typePreset === 'custom' ? customType.trim().toLowerCase() : typePreset;
		const nextContent = body.trim();

		if (!nextTitle) {
			error = 'Artifact title is required.';
			return;
		}
		if (!nextType) {
			error = 'Artifact type is required.';
			return;
		}
		if (!nextContent) {
			error = 'Artifact body is required.';
			return;
		}

		isCreating = true;
		error = '';

		try {
			await onCreate({
				title: nextTitle,
				type: nextType,
				content: nextContent,
				contentFormat: formatPreset
			});
			open = false;
			resetDraft();
		} catch (caught) {
			console.error(caught);
			error =
				caught instanceof Error && caught.message
					? caught.message
					: 'Could not create this artifact. Please try again.';
		} finally {
			isCreating = false;
		}
	}

	$effect(() => {
		if (open && !wasOpen) resetDraft();
		wasOpen = open;
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="overflow-hidden p-0 sm:max-w-2xl"
		showCloseButton={false}
		onEscapeKeydown={handleDismiss}
		onInteractOutside={handleDismiss}
	>
		<form
			class="grid max-h-[min(44rem,calc(100vh-2rem))] grid-rows-[auto_minmax(0,1fr)_auto]"
			onsubmit={(event) => {
				event.preventDefault();
				void createArtifact();
			}}
		>
			<Dialog.Header class="border-b border-border/70 px-5 py-4 text-left">
				<div class="flex items-start justify-between gap-4">
					<div class="min-w-0 space-y-1">
						<Dialog.Title>Create artifact</Dialog.Title>
						<Dialog.Description class="max-w-prose text-pretty">
							Save a durable document to this workspace. {destination}
						</Dialog.Description>
					</div>
					<div
						class="hidden shrink-0 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground sm:block"
					>
						{selectedTypeLabel}
					</div>
				</div>
			</Dialog.Header>

			<div class="min-h-0 overflow-y-auto px-5 py-4">
				<div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_9rem]">
					<div class="space-y-1.5">
						<Label for="create-artifact-title">Title</Label>
						<Input
							id="create-artifact-title"
							bind:value={title}
							placeholder="Artifact title"
							autofocus
							aria-invalid={error && !title.trim() ? 'true' : undefined}
							disabled={isCreating}
						/>
						<p class="text-[11px] leading-4 text-muted-foreground">
							Use the name you will scan for later in the artifacts list.
						</p>
					</div>
					<div class="space-y-1.5">
						<Label for="create-artifact-type">Type</Label>
						<NativeSelect
							id="create-artifact-type"
							bind:value={typePreset}
							class="w-full"
							disabled={isCreating}
						>
							{#each typePresets as preset (preset.value)}
								<NativeSelectOption value={preset.value}>{preset.label}</NativeSelectOption>
							{/each}
						</NativeSelect>
					</div>
					<div class="space-y-1.5">
						<Label for="create-artifact-format">Format</Label>
						<NativeSelect
							id="create-artifact-format"
							bind:value={formatPreset}
							class="w-full"
							disabled={isCreating}
						>
							{#each formatPresets as preset (preset.value)}
								<NativeSelectOption value={preset.value}>{preset.label}</NativeSelectOption>
							{/each}
						</NativeSelect>
					</div>
				</div>

				{#if typePreset === 'custom'}
					<div class="mt-3 space-y-1.5">
						<Label for="create-artifact-custom-type">Custom type</Label>
						<Input
							id="create-artifact-custom-type"
							bind:value={customType}
							placeholder="decision, spec, notes"
							aria-invalid={error && !customType.trim() ? 'true' : undefined}
							disabled={isCreating}
						/>
						<p class="text-[11px] leading-4 text-muted-foreground">
							Keep it short. This becomes the artifact category.
						</p>
					</div>
				{/if}

				<div class="mt-4 space-y-1.5">
					<div class="flex items-end justify-between gap-3">
						<div class="space-y-1.5">
							<Label for="create-artifact-body">
								{formatPreset === 'markdown' ? 'Markdown' : artifactTypeLabel(formatPreset)}
							</Label>
							<p class="max-w-prose text-xs leading-5 text-muted-foreground">
								Write the durable version here. You can edit it after creation.
							</p>
						</div>
						<span class="hidden text-[11px] text-muted-foreground sm:inline">
							⌘/Ctrl Enter creates
						</span>
					</div>
					<Textarea
						id="create-artifact-body"
						bind:value={body}
						placeholder={formatPreset === 'markdown'
							? '# Decision\n\nCapture the useful details, constraints, and next step.'
							: formatPreset === 'html'
								? '<!DOCTYPE html>\n<html>\n  <body>\n    <h1>Title</h1>\n  </body>\n</html>'
								: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">\n  <!-- diagram -->\n</svg>'}
						class="min-h-72 resize-y bg-background font-mono text-xs leading-5 sm:min-h-80"
						onkeydown={handleKeydown}
						aria-invalid={error && !body.trim() ? 'true' : undefined}
						disabled={isCreating}
					/>
				</div>

				<div class="mt-3 min-h-5">
					{#if error}
						<p class="text-xs leading-5 text-destructive" role="status">
							{error}
						</p>
					{:else}
						<p class="text-xs leading-5 text-muted-foreground">
							Artifacts stay editable from the artifact page after creation.
						</p>
					{/if}
				</div>
			</div>

			<Dialog.Footer class="border-t border-border/70 bg-muted/35 px-5 py-4">
				<Button type="button" variant="secondary" disabled={isCreating} onclick={close}>
					Cancel
				</Button>
				<Button type="submit" disabled={isCreating || !canCreate}>
					{isCreating ? 'Creating...' : 'Create artifact'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
