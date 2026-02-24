<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { resetPassword } from '$lib/stores/auth';

	let email = $state('');
	let loading = $state(false);
	let error = $state('');
	let sent = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true; error = '';
		try { await resetPassword(email); sent = true; }
		catch (err: any) { error = err.message?.replace('Firebase: ', '') || 'Something went wrong'; }
		finally { loading = false; }
	}
</script>

<svelte:head><title>Reset Password | SyncShip</title></svelte:head>

<Card class="w-full max-w-md">
	<div class="px-6 py-8 sm:px-8">
		<h2 class="mb-1 text-center text-lg font-semibold text-gray-900">Reset your password</h2>
		<p class="mb-6 text-center text-sm text-gray-500">We'll send you a link to reset it</p>

		{#if sent}
			<div class="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
				<p class="text-sm font-medium text-green-800">Check your email!</p>
				<p class="mt-1 text-sm text-green-700">We've sent a reset link to <strong>{email}</strong></p>
			</div>
			<p class="mt-6 text-center text-sm text-gray-500">
				<a href="/auth/login" class="font-medium text-gray-900 hover:text-gray-700">Back to sign in</a>
			</p>
		{:else}
			{#if error}
				<div class="mb-4 rounded-lg bg-red-50 border border-red-200 p-3"><p class="text-sm text-red-700">{error}</p></div>
			{/if}
			<form onsubmit={handleSubmit} class="space-y-4">
				<Input label="Email address" type="email" placeholder="you@agency.com" required bind:value={email} />
				<Button type="submit" class="w-full" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link'}</Button>
			</form>
			<p class="mt-6 text-center text-sm text-gray-500">
				Remember your password? <a href="/auth/login" class="font-medium text-gray-900 hover:text-gray-700">Sign in</a>
			</p>
		{/if}
	</div>
</Card>
