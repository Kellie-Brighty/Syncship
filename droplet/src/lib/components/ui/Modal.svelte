<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { X } from 'lucide-svelte';

	interface Props {
		show: boolean;
		onClose: () => void;
		title?: string;
		children: any;
		maxWidth?: string;
	}

	let { show = $bindable(), onClose, title, children, maxWidth = 'max-w-md' }: Props = $props();

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && show) onClose();
	}

	onMount(() => {
		// Prevent scrolling when modal is open
		const originalOverflow = document.body.style.overflow;
		$effect(() => {
			if (show) {
				document.body.style.overflow = 'hidden';
			} else {
				document.body.style.overflow = originalOverflow;
			}
		});
		return () => {
			document.body.style.overflow = originalOverflow;
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if show}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div 
		class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm"
		transition:fade={{ duration: 200 }}
		onclick={handleBackdropClick}
	>
		<div 
			class="relative w-full {maxWidth} bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
			transition:scale={{ duration: 200, start: 0.95 }}
		>
			{#if title}
				<div class="flex items-center justify-between px-6 py-4 border-b border-gray-50 bg-gray-50/50">
					<h3 class="text-base font-bold text-gray-900">{title}</h3>
					<button 
						onclick={onClose}
						class="rounded-lg p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
					>
						<X class="h-5 w-5" />
					</button>
				</div>
			{:else}
				<button 
					onclick={onClose}
					class="absolute top-4 right-4 z-10 rounded-lg p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
				>
					<X class="h-5 w-5" />
				</button>
			{/if}

			<div class="p-6 sm:p-8">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
