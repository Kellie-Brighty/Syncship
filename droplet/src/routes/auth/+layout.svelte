<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Droplets } from 'lucide-svelte';
	import '../../app.css';

	let { children }: { children: Snippet } = $props();
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4">
	<div class="mb-6 flex items-center gap-x-2.5">
		<div class="rounded-lg bg-gray-900 p-2">
			<Droplets class="h-5 w-5 text-white" />
		</div>
		<span class="text-xl font-bold tracking-tight text-gray-900">SyncShip</span>
	</div>
	{@render children()}
</div>
