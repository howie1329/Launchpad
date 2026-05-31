<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<footer class="border-t border-border/50 px-5 py-5 sm:px-8">
	<div
		class="mx-auto flex w-full max-w-7xl flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
	>
		<p>Launchpad keeps early product thinking close to buildable work.</p>
		<nav class="flex flex-wrap gap-x-4 gap-y-2">
			<a class="transition-colors hover:text-foreground" href={resolve('/')}>Home</a>
			<a class="transition-colors hover:text-foreground" href={resolve('/support')}>Support</a>
			<a class="transition-colors hover:text-foreground" href={resolve('/privacy')}>Privacy</a>
			<a class="transition-colors hover:text-foreground" href={resolve('/terms')}>Terms</a>
		</nav>
	</div>
</footer>
