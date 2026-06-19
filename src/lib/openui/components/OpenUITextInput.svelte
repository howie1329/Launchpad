<script lang="ts">
	import type { ComponentRenderProps } from '@openuidev/svelte-lang';
	import {
		getFormName,
		getGetFieldValue,
		getIsStreaming,
		getSetFieldValue,
		useSetDefaultValue
	} from '@openuidev/svelte-lang';

	let {
		props
	}: ComponentRenderProps<{
		label: string;
		name: string;
		placeholder?: string;
		value?: string;
		multiline?: boolean;
	}> = $props();

	const formName = getFormName();
	const getFieldValue = getGetFieldValue();
	const setFieldValue = getSetFieldValue();
	const isStreaming = getIsStreaming();
	const inputName = $derived(props.name);
	const defaultValue = $derived(props.value ?? '');
	let localValue = $state('');

	// OpenUI registers the initial field identity; rendered instances are replaced when their schema changes.
	// svelte-ignore state_referenced_locally
	useSetDefaultValue({
		formName,
		componentType: 'TextInput',
		name: inputName,
		defaultValue,
		shouldTriggerSaveCallback: false
	});

	$effect(() => {
		const stored = getFieldValue(formName, inputName);
		const nextValue = typeof stored === 'string' ? stored : defaultValue;
		if (nextValue !== localValue) localValue = nextValue;
	});

	function update(value: string, persist: boolean) {
		localValue = value;
		setFieldValue(formName, 'TextInput', inputName, value, persist);
	}
</script>

<label class="grid gap-1.5 text-[11px] font-medium">
	<span>{props.label}</span>
	{#if props.multiline}
		<textarea
			class="min-h-20 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-xs leading-5 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
			placeholder={props.placeholder}
			disabled={isStreaming()}
			value={localValue}
			oninput={(event) => update(event.currentTarget.value, false)}
			onblur={(event) => update(event.currentTarget.value, true)}
		></textarea>
	{:else}
		<input
			type="text"
			class="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
			placeholder={props.placeholder}
			disabled={isStreaming()}
			value={localValue}
			oninput={(event) => update(event.currentTarget.value, false)}
			onblur={(event) => update(event.currentTarget.value, true)}
		/>
	{/if}
</label>
