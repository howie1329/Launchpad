<script lang="ts">
	import { resolve } from '$app/paths';
	import { auth, signOut } from '$lib/auth.svelte';
	import { Button } from '$lib/components/ui/button';

	let { redirectTo = '/workspace', size = 'sm' } =
		$props<{
			redirectTo?: string;
			size?: 'sm' | 'lg';
		}>();

	let isSigningOut = $state(false);
	const signInHref = $derived(`${resolve('/auth')}?redirectTo=${encodeURIComponent(redirectTo)}`);

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
	<Button variant="ghost" {size} disabled={isSigningOut} onclick={handleSignOut}>
		{isSigningOut ? 'Signing out...' : 'Sign out'}
	</Button>
{:else}
	<Button href={signInHref} variant="ghost" {size}>Sign in</Button>
{/if}
