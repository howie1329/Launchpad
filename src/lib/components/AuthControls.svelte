<script lang="ts">
	import { resolve } from '$app/paths';
	import { auth, signOut } from '$lib/auth.svelte';
	import { Button } from '$lib/components/ui/button';
	import { getSafePostAuthRedirect } from '$lib/safeRedirect';

	let {
		redirectTo = '/workspace',
		size = 'sm',
		signedInMode = 'signOut',
		signedInCta = 'Go to Launchpad',
		signedInHref
	} = $props<{
		redirectTo?: string;
		size?: 'sm' | 'lg';
		signedInMode?: 'signOut' | 'goToWorkspace';
		signedInCta?: string;
		/** When omitted, `redirectTo` is used (defaults to /workspace). */
		signedInHref?: string;
	}>();

	let isSigningOut = $state(false);
	const signInHref = $derived(
		`${resolve('/auth')}?redirectTo=${encodeURIComponent(getSafePostAuthRedirect(redirectTo))}`
	);

	const workspaceHref = $derived(
		resolve((signedInHref?.trim() || redirectTo) as '/workspace')
	);

	const handleSignOut = async () => {
		isSigningOut = true;

		try {
			await signOut();
		} finally {
			isSigningOut = false;
		}
	};
</script>

{#if auth.isLoading}
	<Button variant="ghost" {size} disabled>Checking...</Button>
{:else if auth.isAuthenticated}
	{#if signedInMode === 'goToWorkspace'}
		<Button href={workspaceHref} variant="ghost" {size}>{signedInCta}</Button>
	{:else}
		<Button variant="ghost" {size} disabled={isSigningOut} onclick={handleSignOut}>
			{isSigningOut ? 'Signing out...' : 'Sign out'}
		</Button>
	{/if}
{:else}
	<Button href={signInHref} variant="ghost" {size}>Sign in</Button>
{/if}
