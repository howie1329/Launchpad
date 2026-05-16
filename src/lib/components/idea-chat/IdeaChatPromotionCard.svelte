<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { PromotionProposalView } from '$lib/idea-chat-assistant-parts';
	import { Rocket01Icon } from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';

	let { proposal }: { proposal: PromotionProposalView } = $props();

	const artifactLabel = $derived(
		`${proposal.linkedArtifactCount} linked artifact${proposal.linkedArtifactCount === 1 ? '' : 's'}`
	);

	function reviewProjectPromotion() {
		window.dispatchEvent(
			new CustomEvent('launchpad:review-project-promotion', {
				detail: {
					name: proposal.name,
					summary: proposal.summary,
					strengths: proposal.strengths,
					missingInformation: proposal.missingInformation,
					linkedArtifactCount: proposal.linkedArtifactCount
				}
			})
		);
	}
</script>

<section class="rounded-xl border border-border/70 bg-card p-3 shadow-sm" aria-label="Project promotion proposal">
	<div class="flex items-start gap-3">
		<span class="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
			<HugeiconsIcon icon={Rocket01Icon} strokeWidth={2} class="size-4" aria-hidden="true" />
		</span>
		<div class="min-w-0 flex-1 space-y-2">
			<div class="space-y-1">
				<p class="text-xs font-semibold text-foreground">Ready to create project</p>
				<h3 class="truncate text-sm font-semibold tracking-tight text-foreground">{proposal.name}</h3>
				{#if proposal.summary}
					<p class="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{proposal.summary}</p>
				{/if}
			</div>

			<div class="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
				<span class="rounded-full bg-muted px-2 py-0.5">{artifactLabel}</span>
				<span class="rounded-full bg-muted px-2 py-0.5">{proposal.strengths.length} strength{proposal.strengths.length === 1 ? '' : 's'}</span>
				<span class="rounded-full bg-muted px-2 py-0.5">{proposal.missingInformation.length} gap{proposal.missingInformation.length === 1 ? '' : 's'}</span>
			</div>

			<Button type="button" size="sm" class="h-8 gap-1.5 px-3 text-xs" onclick={reviewProjectPromotion}>
				Review and create project
			</Button>
		</div>
	</div>
</section>
