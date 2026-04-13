<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { LaunchpadLogo } from '$lib/components/brand';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { auth, signIn } from '$lib/auth.svelte';

	type Flow = 'signIn' | 'signUp';
	type Status = 'idle' | 'loading' | 'error';
	type RedirectRoute = '/' | '/dashboard' | '/ideas' | '/scope' | '/settings';

	let flow = $state<Flow>('signIn');
	let status = $state<Status>('idle');
	let errorMessage = $state('');

	const isSignUp = $derived(flow === 'signUp');
	const redirectTo = $derived.by<RedirectRoute>(() => {
		const value = page.url.searchParams.get('redirectTo');
		return value === '/' ||
			value === '/dashboard' ||
			value === '/ideas' ||
			value === '/scope' ||
			value === '/settings'
			? value
			: '/dashboard';
	});

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
				await goto(resolve(redirectTo));
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
	<meta name="description" content="Sign in to Launchpad." />
</svelte:head>

<main class="flex min-h-svh flex-col bg-background text-foreground">
	<header
		class="flex h-12 shrink-0 items-center justify-between border-b border-border/50 px-4 sm:px-5"
	>
		<a href={resolve('/')} aria-label="Launchpad home">
			<LaunchpadLogo />
		</a>
		<Button href={resolve('/')} variant="ghost" size="sm">Home</Button>
	</header>

	<section class="flex flex-1 items-center px-5 py-12 sm:px-8">
		<div class="mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[0.85fr_1fr] lg:items-center">
			<div class="max-w-lg">
				<p class="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
					Launchpad account
				</p>
				<h1 class="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
					{isSignUp ? 'Create your workspace.' : 'Welcome back.'}
				</h1>
				<p class="mt-5 max-w-md text-sm leading-6 text-muted-foreground">
					{isSignUp
						? 'Use an email and password to start a local Launchpad account.'
						: 'Sign in to keep your Launchpad session active on this device.'}
				</p>
			</div>

			<div class="w-full border-y border-border/70 py-6">
				<form class="mx-auto flex max-w-sm flex-col gap-4" onsubmit={handleSubmit}>
					<div>
						<h2 class="text-xl font-semibold tracking-tight">
							{isSignUp ? 'Create account' : 'Sign in'}
						</h2>
						<p class="mt-2 text-xs leading-5 text-muted-foreground">
							{isSignUp
								? 'Already have an account? Switch to sign in below.'
								: 'New here? Create an account with the same form.'}
						</p>
					</div>

					<Separator />

					<input type="hidden" name="flow" value={flow} />

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
					</div>

					{#if status === 'error'}
						<p class="text-xs leading-5 text-destructive">{errorMessage}</p>
					{/if}

					<div class="flex items-center justify-between gap-3 pt-1">
						<Button type="button" variant="ghost" onclick={toggleFlow}>
							{isSignUp ? 'Sign in instead' : 'Create account'}
						</Button>
						<Button type="submit" disabled={status === 'loading'}>
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
		</div>
	</section>
</main>
