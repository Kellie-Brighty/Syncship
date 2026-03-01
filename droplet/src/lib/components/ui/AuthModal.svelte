<script lang="ts">
	import Modal from './Modal.svelte';
	import Button from './Button.svelte';
	import Input from './Input.svelte';
	import { signIn, signUp, signInWithGoogle } from '$lib/stores/auth';
	import { goto } from '$app/navigation';

	interface Props {
		show: boolean;
		mode?: 'login' | 'register';
	}

	let { show = $bindable(false), mode = 'login' }: Props = $props();

	let currentMode = $state<'login' | 'register'>('login');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let error = $state('');
	let showEmailForm = $state(false);

	$effect(() => {
		if (show) {
			currentMode = mode;
			error = '';
			// Reset fields only if necessary, or keep them for convenience
		}
	});

	async function handleGoogle() {
		loading = true; error = '';
		try { 
			await signInWithGoogle(); 
			show = false;
			goto('/dashboard'); 
		} catch (err: any) { 
			error = err.message?.replace('Firebase: ', '') || 'Something went wronggg'; 
		} finally { 
			loading = false; 
		}
	}

	async function handleEmail(e: Event) {
		e.preventDefault();
		loading = true; error = '';
		try {
			if (currentMode === 'login') {
				await signIn(email, password);
			} else {
				if (password !== confirmPassword) {
					error = 'Passwords do not match';
					loading = false;
					return;
				}
				if (password.length < 6) {
					error = 'Password must be at least 6 characters';
					loading = false;
					return;
				}
				await signUp(email, password);
			}
			show = false;
			goto('/dashboard');
		} catch (err: any) {
			error = err.message?.replace('Firebase: ', '') || 'Something went wrong';
		} finally {
			loading = false;
		}
	}

	function toggleMode() {
		currentMode = currentMode === 'login' ? 'register' : 'login';
		error = '';
	}
</script>

<Modal bind:show onClose={() => show = false}>
	<div class="text-center mb-8">
		<h2 class="text-2xl font-bold font-display text-gray-900 leading-tight">
			{currentMode === 'login' ? 'Welcome Back' : 'Get Started Free'}
		</h2>
		<p class="mt-2 text-sm text-gray-500">
			{currentMode === 'login' ? 'Sign in to continue to your dashboard' : 'Join SyncShip and ship faster today'}
		</p>
	</div>

	{#if error}
		<div class="mb-6 rounded-xl bg-red-50 border border-red-100 p-4 animate-in fade-in slide-in-from-top-2">
			<p class="text-sm font-medium text-red-600 leading-relaxed text-center">{error}</p>
		</div>
	{/if}

	<div class="space-y-4">
		<!-- Google Auth -->
		<Button 
			variant="outline" 
			class="w-full h-12 text-gray-700 hover:bg-gray-50/80 border-gray-200 shadow-sm transition-all" 
			onclick={handleGoogle} 
			disabled={loading}
		>
			<svg class="h-5 w-5 mr-3" viewBox="0 0 24 24">
				<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
				<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
				<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
				<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
			</svg>
			Continue with Google
		</Button>

		<div class="relative py-2">
			<div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-100"></div></div>
			<div class="relative flex justify-center text-xs uppercase tracking-widest font-bold">
				<span class="bg-white px-4 text-gray-400">or</span>
			</div>
		</div>

		{#if showEmailForm}
			<form onsubmit={handleEmail} class="space-y-4 animate-in fade-in slide-in-from-bottom-2">
				<Input label="Email address" type="email" placeholder="you@agency.com" required bind:value={email} />
				<Input label="Password" type="password" placeholder="••••••••" required bind:value={password} />
				
				{#if currentMode === 'register'}
					<Input label="Confirm password" type="password" placeholder="••••••••" required bind:value={confirmPassword} />
				{/if}

				{#if currentMode === 'login'}
					<div class="flex items-center justify-end">
						<a href="/auth/reset-password" class="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-wide">Forgot Password?</a>
					</div>
				{/if}

				<Button type="submit" class="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white shadow-lg transition-all" disabled={loading}>
					{loading ? 'Processing...' : currentMode === 'login' ? 'Sign In' : 'Create Account'}
				</Button>
			</form>
		{:else}
			<button
				onclick={() => showEmailForm = true}
				class="w-full py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 transition-all cursor-pointer underline decoration-gray-200 underline-offset-4"
			>
				Continue with email and password
			</button>
		{/if}

		<p class="mt-8 text-center text-sm text-gray-500">
			{currentMode === 'login' ? "Don't have an account?" : "Already have an account?"}
			<button 
				onclick={toggleMode}
				class="font-bold text-gray-900 hover:text-indigo-600 transition-colors ml-1 cursor-pointer underline decoration-gray-200 underline-offset-4"
			>
				{currentMode === 'login' ? 'Create one' : 'Sign in'}
			</button>
		</p>
	</div>
</Modal>
