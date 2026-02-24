<script lang="ts">
	import type { Snippet } from 'svelte';
	import AppShell from '$lib/components/ui/AppShell.svelte';
	import { currentUser, authLoading } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import '../app.css';

	let { children }: { children: Snippet } = $props();

	$effect(() => {
		const user = $currentUser;
		const isLoading = $authLoading;
		const currentPath = $page.url.pathname;

		if (!isLoading && !user && !currentPath.startsWith('/auth')) {
			goto('/auth/login');
		}
	});
</script>

{#if $page.url.pathname.startsWith('/auth')}
	{@render children()}
{:else if $authLoading}
	<div class="flex min-h-screen items-center justify-center bg-gray-100">
		<div class="flex flex-col items-center gap-2">
			<div class="h-6 w-6 rounded-full border-2 border-gray-300 border-t-gray-900 animate-spin"></div>
			<p class="text-sm text-gray-500">Loading...</p>
		</div>
	</div>
{:else}
	<AppShell>
		{@render children()}
	</AppShell>
{/if}
