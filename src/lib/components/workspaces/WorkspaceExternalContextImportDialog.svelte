<script lang="ts">
	import {
		startExternalContextImportDraftReviewMutation,
		type ExternalContextImportSourceToolHint
	} from '$lib/external-context-imports';
	import { getConvexClient } from '$lib/auth.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import { NativeSelect, NativeSelectOption } from '$lib/components/ui/native-select';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { Id } from '../../../convex/_generated/dataModel';

	type Props = {
		open: boolean;
		onReviewStarted: (draftId: Id<'externalContextImportDrafts'>) => Promise<void>;
	};

	let { open = $bindable(false), onReviewStarted }: Props = $props();

	let sourceMarkdown = $state('');
	let sourceToolHint = $state<ExternalContextImportSourceToolHint>('unknown');
	let error = $state('');
	let notice = $state('');
	let isStartingReview = $state(false);

	const externalContextPrompt = `I want to import this project context into LaunchPad, a project-focused AI workspace.

Please summarize the current conversation/project using the exact Markdown structure below.

Important rules:
- Do not invent details.
- If something is unclear or missing, write it under "Things Not Known" or "Open Questions".
- Prefer concise, practical bullets.
- Preserve important decisions, goals, constraints, and next steps.
- Write this so another AI assistant can help me continue the project later.

# Project Name

[Suggest a clear project name.]

## One-Sentence Summary

[Summarize the project in one sentence.]

## Background

[Explain the relevant context, history, problem, audience, and why this project matters.]

## Goals

- [Goal 1]
- [Goal 2]
- [Goal 3]

## Key Decisions

- [Decision 1 and why it was made]
- [Decision 2 and why it was made]

## Constraints and Requirements

- [Important constraint, requirement, platform, stack, timeline, style, or business rule]

## Open Questions

- [Question 1]
- [Question 2]

## Next Steps

- [Concrete next step 1]
- [Concrete next step 2]
- [Concrete next step 3]

## Useful Files, Artifacts, or References

- [Mention any documents, files, links, designs, notes, or artifacts that matter]

## Durable Project Context

[Write facts, preferences, definitions, or project-specific context that would help an AI assistant continue the work accurately.]

## Things Not Known

- [Anything important that is missing, uncertain, or should not be assumed]`;

	function close() {
		if (isStartingReview) return;
		open = false;
		error = '';
		notice = '';
	}

	async function copyPrompt() {
		notice = '';
		error = '';
		try {
			await navigator.clipboard.writeText(externalContextPrompt);
			notice = 'Prompt copied.';
		} catch (caught) {
			console.error(caught);
			error = 'Could not copy the prompt. Select and copy it manually.';
		}
	}

	async function startReview() {
		if (isStartingReview) return;
		const nextSourceMarkdown = sourceMarkdown.trim();
		if (!nextSourceMarkdown) {
			error = 'Paste the external AI summary before reviewing.';
			return;
		}

		isStartingReview = true;
		error = '';
		notice = '';
		try {
			const result = await getConvexClient().mutation(
				startExternalContextImportDraftReviewMutation,
				{
					sourceMarkdown: nextSourceMarkdown,
					sourceToolHint
				}
			);
			open = false;
			sourceMarkdown = '';
			sourceToolHint = 'unknown';
			await onReviewStarted(result.draftId);
		} catch (caught) {
			console.error(caught);
			error =
				caught instanceof Error && caught.message
					? caught.message
					: 'Could not start import review. Please try again.';
		} finally {
			isStartingReview = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="flex h-[min(44rem,calc(100vh-2rem))] flex-col p-0 sm:max-w-4xl"
		showCloseButton={!isStartingReview}
	>
		<form
			class="flex min-h-0 flex-1 flex-col"
			onsubmit={(event) => {
				event.preventDefault();
				void startReview();
			}}
		>
			<Dialog.Header class="border-b border-border/70 px-5 py-4 text-left">
				<Dialog.Title>Import external AI context</Dialog.Title>
				<Dialog.Description>
					Bring project context from another AI chat into a Launchpad review draft.
				</Dialog.Description>
			</Dialog.Header>

			<div
				class="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(17rem,0.78fr)_minmax(0,1.22fr)]"
			>
				<section
					class="flex min-h-0 flex-col border-b border-border/70 bg-muted/30 lg:border-r lg:border-b-0"
				>
					<div class="space-y-3 p-5">
						<div class="flex gap-3">
							<div
								class="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground"
							>
								1
							</div>
							<div class="min-w-0 space-y-1">
								<h2 class="text-sm font-semibold tracking-tight">Copy the prompt</h2>
								<p class="text-xs leading-5 text-pretty text-muted-foreground">
									Run this in ChatGPT, Claude, or another AI tool that already has the context you
									want to bring over.
								</p>
							</div>
						</div>
						<div class="flex items-center gap-2 pl-9">
							<Button
								type="button"
								variant="secondary"
								size="sm"
								disabled={isStartingReview}
								onclick={copyPrompt}
							>
								Copy prompt
							</Button>
							{#if notice && !error}
								<p class="text-xs text-muted-foreground" role="status">{notice}</p>
							{/if}
						</div>
					</div>

					<div class="flex min-h-0 flex-1 flex-col border-t border-border/70 p-5 pt-4">
						<div class="mb-2 flex items-center justify-between gap-3">
							<Label for="external-context-prompt">Prompt to run externally</Label>
							<span class="text-[11px] text-muted-foreground">Read only</span>
						</div>
						<Textarea
							id="external-context-prompt"
							value={externalContextPrompt}
							readonly
							class="min-h-40 flex-1 resize-none bg-background font-mono text-[11px] leading-5 lg:min-h-0"
						/>
					</div>
				</section>

				<section class="flex min-h-0 flex-col p-5">
					<div class="flex gap-3">
						<div
							class="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[11px] font-medium text-foreground"
						>
							2
						</div>
						<div class="min-w-0 flex-1 space-y-1">
							<h2 class="text-sm font-semibold tracking-tight">Paste the summary</h2>
							<p class="max-w-prose text-xs leading-5 text-pretty text-muted-foreground">
								Paste the Markdown response. You will review it before creating or changing any
								project.
							</p>
						</div>
					</div>

					<div class="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-end">
						<div class="space-y-1.5">
							<Label for="external-context-source">External summary</Label>
							<p class="text-xs leading-5 text-muted-foreground">
								Do not paste passwords, API keys, private keys, or sensitive personal data.
							</p>
						</div>
						<div class="space-y-1.5">
							<Label for="external-context-source-tool">Source</Label>
							<NativeSelect
								id="external-context-source-tool"
								bind:value={sourceToolHint}
								disabled={isStartingReview}
							>
								<NativeSelectOption value="unknown">Unknown</NativeSelectOption>
								<NativeSelectOption value="chatgpt">ChatGPT</NativeSelectOption>
								<NativeSelectOption value="claude">Claude</NativeSelectOption>
								<NativeSelectOption value="other">Other</NativeSelectOption>
							</NativeSelect>
						</div>
					</div>

					<Textarea
						id="external-context-source"
						bind:value={sourceMarkdown}
						placeholder="# Project Name&#10;&#10;Paste the structured Markdown summary here..."
						class="mt-3 min-h-56 flex-1 resize-none font-mono text-xs leading-5"
						disabled={isStartingReview}
					/>

					{#if error}
						<p class="mt-3 text-xs text-destructive" role="status">{error}</p>
					{:else}
						<p class="mt-3 text-xs leading-5 text-muted-foreground">
							Launchpad starts a review draft first. Nothing is added to a project until you approve
							it.
						</p>
					{/if}
				</section>
			</div>

			<Dialog.Footer class="border-t border-border/70 px-5 py-4">
				<Button type="button" variant="secondary" disabled={isStartingReview} onclick={close}>
					Cancel
				</Button>
				<Button type="submit" disabled={isStartingReview || !sourceMarkdown.trim()}>
					{isStartingReview ? 'Starting review...' : 'Start review'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
