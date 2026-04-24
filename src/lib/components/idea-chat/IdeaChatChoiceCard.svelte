<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { ChoiceCardView } from '$lib/idea-chat-assistant-parts';
	import { cn } from '$lib/utils';
	import { ArrowUp01Icon, Loading03Icon } from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';

	let {
		choice,
		disabled = false,
		onAnswer
	}: {
		choice: ChoiceCardView;
		disabled?: boolean;
		onAnswer: (answer: string) => void | Promise<void>;
	} = $props();

	let customAnswer = $state('');
	let sendingAnswer = $state('');

	const canSendCustom = $derived(Boolean(customAnswer.trim() && !disabled && !sendingAnswer));

	async function submitAnswer(answer: string) {
		const text = answer.trim();
		if (!text || disabled || sendingAnswer) return;
		sendingAnswer = text;
		try {
			await onAnswer(text);
			customAnswer = '';
		} finally {
			sendingAnswer = '';
		}
	}
</script>

<div
	class="w-full rounded-lg border border-border/70 bg-card/80 p-3 text-card-foreground"
	role="group"
	aria-label="Assistant choice"
>
	<div class="space-y-1">
		<p class="text-xs leading-5 font-semibold text-foreground">{choice.question}</p>
		{#if choice.context}
			<p class="text-[11px] leading-4 text-muted-foreground">{choice.context}</p>
		{/if}
	</div>

	<div class="mt-3 grid gap-2">
		{#each choice.options as option (option.label)}
			<button
				type="button"
				class={cn(
					'flex min-h-11 w-full min-w-0 flex-col rounded-md border border-border/70 px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
					disabled || sendingAnswer
						? 'cursor-not-allowed opacity-60'
						: 'hover:border-primary/40 hover:bg-muted/40'
				)}
				disabled={disabled || Boolean(sendingAnswer)}
				onclick={() => void submitAnswer(option.answer)}
			>
				<span class="text-xs leading-4 font-medium text-foreground">{option.label}</span>
				{#if option.description}
					<span class="mt-0.5 text-[11px] leading-4 text-muted-foreground">
						{option.description}
					</span>
				{/if}
			</button>
		{/each}
	</div>

	<div class="mt-3 flex gap-2">
		<Textarea
			bind:value={customAnswer}
			class="min-h-9 flex-1 resize-none px-3 py-2 text-xs leading-4"
			placeholder={choice.customPlaceholder}
			disabled={disabled || Boolean(sendingAnswer)}
			onkeydown={(event) => {
				if (event.key === 'Enter' && !event.shiftKey) {
					event.preventDefault();
					void submitAnswer(customAnswer);
				}
			}}
		/>
		<Button
			type="button"
			size="icon"
			class="size-9 shrink-0"
			disabled={!canSendCustom}
			onclick={() => void submitAnswer(customAnswer)}
			aria-label="Send custom answer"
		>
			{#if sendingAnswer}
				<HugeiconsIcon icon={Loading03Icon} strokeWidth={2} class="size-4 animate-spin" />
			{:else}
				<HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} class="size-4" />
			{/if}
		</Button>
	</div>
</div>
