<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { LaunchpadLogo } from '$lib/components/brand';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import ThemeMenu from '$lib/components/ThemeMenu.svelte';
	import { auth, signIn } from '$lib/auth.svelte';
	import { getSafePostAuthRedirect } from '$lib/safeRedirect';

	type Flow = 'signIn' | 'signUp';
	type Status = 'idle' | 'loading' | 'error';

	let flow = $state<Flow>('signIn');
	let status = $state<Status>('idle');
	let errorMessage = $state('');

	const isSignUp = $derived(flow === 'signUp');
	const redirectTo = $derived.by(() =>
		getSafePostAuthRedirect(page.url.searchParams.get('redirectTo'))
	);

	const toggleFlow = () => {
		flow = isSignUp ? 'signIn' : 'signUp';
		errorMessage = '';
		status = 'idle';
	};

	const handleSubmit = async (event: SubmitEvent) => {
		event.preventDefault();
		status = 'loading';
		errorMessage = '';

		try {
			const form = event.currentTarget as HTMLFormElement;
			const formData = new FormData(form);
			const result = await signIn('password', formData);

			if (result.signingIn || auth.isAuthenticated) {
				const dest = redirectTo;
				if (dest === '/') {
					await goto(resolve('/'));
				} else {
					// getSafePostAuthRedirect restricts dest to /workspace**; query/hash preserved
					// eslint-disable-next-line svelte/no-navigation-without-resolve
					await goto(dest);
				}
				return;
			}

			status = 'idle';
		} catch (error) {
			console.error(error);
			status = 'error';
			errorMessage = isSignUp
				? 'Could not create that account. Check the email and use at least 8 characters for the password.'
				: 'Could not sign in. Check the email and password, then try again.';
		}
	};
</script>

<svelte:head>
	<title>{isSignUp ? 'Create account' : 'Sign in'} | Launchpad</title>
	<meta
		name="description"
		content="Sign in to Launchpad to continue shaping ideas, artifacts, and projects."
	/>
</svelte:head>

<main class="flex min-h-svh flex-col bg-background text-foreground">
	<header class="flex h-14 shrink-0 items-center border-b border-border/50 px-5 sm:px-8">
		<div class="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
			<a href={resolve('/')} aria-label="Launchpad home" class="shrink-0">
				<LaunchpadLogo />
			</a>
			<div class="flex items-center gap-1.5">
				<ThemeMenu variant="icon" />
				<Button href={resolve('/')} variant="ghost" size="sm">Home</Button>
			</div>
		</div>
	</header>

	<section class="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 sm:py-14">
		<div class="w-full max-w-[25rem]">
			<div class="mb-8 text-center">
				<h1 class="text-3xl font-semibold tracking-tight text-balance">
					{isSignUp ? 'Create your workspace.' : 'Welcome back.'}
				</h1>
				<p class="mx-auto mt-3 max-w-sm text-sm leading-6 text-pretty text-muted-foreground">
					{isSignUp
						? 'Use email and password to start a Launchpad workspace for your threads, artifacts, and projects.'
						: 'Sign in to continue from your saved threads, artifacts, and project context.'}
				</p>
			</div>

			<form
				class="rounded-xl border border-border/70 bg-card p-4 sm:p-5"
				onsubmit={handleSubmit}
				aria-busy={status === 'loading'}
			>
				<div class="flex items-start justify-between gap-4">
					<div>
						<h2 class="text-base font-semibold tracking-tight">
							{isSignUp ? 'Create account' : 'Sign in'}
						</h2>
						<p class="mt-1.5 text-xs leading-5 text-muted-foreground">
							{isSignUp
								? 'Already have an account? Sign in instead.'
								: 'New here? Create an account with this form.'}
						</p>
					</div>
				</div>

				<input type="hidden" name="flow" value={flow} />

				<div class="mt-5 flex flex-col gap-4">
					<div class="flex flex-col gap-2">
						<Label for="email">Email</Label>
						<Input id="email" name="email" type="email" autocomplete="email" required />
					</div>

					<div class="flex flex-col gap-2">
						<Label for="password">Password</Label>
						<Input
							id="password"
							name="password"
							type="password"
							autocomplete={isSignUp ? 'new-password' : 'current-password'}
							required
							minlength={8}
						/>
						{#if isSignUp}
							<p class="text-xs leading-5 text-muted-foreground">Use at least 8 characters.</p>
						{/if}
					</div>
				</div>

				<div class="min-h-6 pt-3">
					{#if status === 'error'}
						<p class="text-xs leading-5 text-destructive" role="status" aria-live="polite">
							{errorMessage}
						</p>
					{:else if status === 'loading'}
						<p class="text-xs leading-5 text-muted-foreground" role="status" aria-live="polite">
							{isSignUp ? 'Creating account...' : 'Signing in...'}
						</p>
					{/if}
				</div>

				<div
					class="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between"
				>
					<Button
						type="button"
						variant="ghost"
						onclick={toggleFlow}
						class="w-full sm:w-auto"
						disabled={status === 'loading'}
					>
						{isSignUp ? 'Sign in instead' : 'Create account'}
					</Button>
					<Button type="submit" class="w-full sm:w-auto" disabled={status === 'loading'}>
						{status === 'loading'
							? isSignUp
								? 'Creating...'
								: 'Signing in...'
							: isSignUp
								? 'Create account'
								: 'Sign in'}
					</Button>
				</div>
			</form>
		</div>
	</section>
</main>
