<script lang="ts">
	import { signOut } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { LogOut, X } from 'lucide-svelte';
	import Button from './Button.svelte';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open = $bindable(false), onclose }: Props = $props();

	let loading = $state(false);

	async function handleLogout() {
		loading = true;
		try {
			await signOut();
			open = false;
			goto('/auth/login');
		} catch (err) {
			console.error('Logout failed:', err);
		} finally {
			loading = false;
		}
	}

	function handleBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			open = false;
			onclose?.();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			open = false;
			onclose?.();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm"
		onclick={handleBackdrop}
	>
		<!-- Modal -->
		<div class="relative w-full max-w-sm mx-4 rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
			<!-- Close button -->
			<button
				onclick={() => { open = false; onclose?.(); }}
				class="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
			>
				<X class="h-4 w-4" />
			</button>

			<!-- Icon -->
			<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
				<LogOut class="h-5 w-5 text-gray-600" />
			</div>

			<h3 class="text-center text-base font-semibold text-gray-900">Log out?</h3>
			<p class="mt-1 text-center text-sm text-gray-500">
				You'll need to sign in again to access your dashboard.
			</p>

			<!-- Actions -->
			<div class="mt-5 flex gap-3">
				<Button
					variant="outline"
					class="flex-1"
					onclick={() => { open = false; onclose?.(); }}
				>
					Cancel
				</Button>
				<Button
					variant="danger"
					class="flex-1"
					onclick={handleLogout}
					disabled={loading}
				>
					{loading ? 'Logging out...' : 'Log out'}
				</Button>
			</div>
		</div>
	</div>
{/if}
