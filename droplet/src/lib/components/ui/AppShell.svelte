<script lang="ts">
	import type { Snippet } from 'svelte';
	import Sidebar from '$lib/components/ui/Sidebar.svelte';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
</script>

<div>
	<Sidebar />

	<main class="lg:pl-64">
		<div class="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
			{@render children?.()}
		</div>
	</main>
</div>
