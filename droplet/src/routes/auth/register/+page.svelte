<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { signUp, signInWithGoogle } from '$lib/stores/auth';
	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let error = $state('');
	let showEmailForm = $state(false);

	$effect(() => { email; password; confirmPassword; error = ''; });

	async function handleGoogle() {
		loading = true; error = '';
		try { await signInWithGoogle(); goto('/'); }
		catch (err: any) { error = err.message?.replace('Firebase: ', '') || 'Something went wrong'; }
		finally { loading = false; }
	}

	async function handleEmail(e: Event) {
		e.preventDefault();
		error = '';
		if (password !== confirmPassword) { error = 'Passwords do not match'; return; }
		if (password.length < 6) { error = 'Password must be at least 6 characters'; return; }
		loading = true;
		try { await signUp(email, password); goto('/'); }
		catch (err: any) { error = err.message?.replace('Firebase: ', '') || 'Something went wrong'; }
		finally { loading = false; }
	}
</script>

<svelte:head><title>Create Account | SyncShip</title></svelte:head>

<Card class="w-full max-w-md">
	<div class="px-6 py-8 sm:px-8">
		<h2 class="mb-1 text-center text-lg font-semibold text-gray-900">Create your account</h2>
		<p class="mb-6 text-center text-sm text-gray-500">Start deploying in minutes</p>

		{#if error}
			<div class="mb-4 rounded-lg bg-red-50 border border-red-200 p-3"><p class="text-sm text-red-700">{error}</p></div>
		{/if}

		<!-- Google Sign-Up (Primary) -->
		<Button variant="outline" class="w-full" onclick={handleGoogle} disabled={loading}>
			<svg class="h-4 w-4 mr-2" viewBox="0 0 24 24">
				<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
				<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
				<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
				<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
			</svg>
			Continue with Google
		</Button>

		<!-- Divider -->
		<div class="relative my-6">
			<div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-200"></div></div>
			<div class="relative flex justify-center text-xs uppercase">
				<span class="bg-white px-2 text-gray-400">or</span>
			</div>
		</div>

		{#if showEmailForm}
			<form onsubmit={handleEmail} class="space-y-4">
				<Input label="Email address" type="email" placeholder="you@agency.com" required bind:value={email} />
				<Input label="Password" type="password" placeholder="Minimum 6 characters" required bind:value={password} />
				<Input label="Confirm password" type="password" placeholder="••••••••" required bind:value={confirmPassword} />
				<Button type="submit" class="w-full" disabled={loading}>{loading ? 'Creating account...' : 'Create Account'}</Button>
			</form>
		{:else}
			<button
				onclick={() => showEmailForm = true}
				class="w-full text-center text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
			>
				Sign up with email and password
			</button>
		{/if}

		<p class="mt-6 text-center text-sm text-gray-500">
			Already have an account? <a href="/auth/login" class="font-medium text-gray-900 hover:text-gray-700">Sign in</a>
		</p>
	</div>
</Card>
