<script lang="ts">
	import type { Snippet } from 'svelte';
	import Sidebar from '$lib/components/ui/Sidebar.svelte';
	import { Menu, Droplets } from 'lucide-svelte';
	import { page } from '$app/stores';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
	let mobileMenuOpen = $state(false);

	// Close mobile menu on navigation
	$effect(() => {
		const _ = $page.url.pathname;
		mobileMenuOpen = false;
	});
</script>

<div>
	<Sidebar bind:mobileMenuOpen />

	<!-- Mobile Header -->
	<div class="sticky top-0 z-40 flex items-center gap-x-6 bg-white/85 backdrop-blur-sm px-4 py-4 shadow-sm sm:px-6 lg:hidden">
		<button type="button" class="-m-2.5 p-2.5 text-gray-700 lg:hidden cursor-pointer" onclick={() => mobileMenuOpen = true}>
			<span class="sr-only">Open sidebar</span>
			<Menu class="h-6 w-6" aria-hidden="true" />
		</button>
		<div class="flex flex-1 text-sm font-semibold leading-6 text-gray-900 items-center gap-x-2.5">
			<div class="rounded-lg bg-gray-900 p-1.5">
				<Droplets class="h-4 w-4 text-white" />
			</div>
			SyncShip
		</div>
	</div>

	<main class="lg:pl-64">
		<div class="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
			{@render children?.()}
		</div>
	</main>
</div>
