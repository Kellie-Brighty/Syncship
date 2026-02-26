<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { ShieldCheck, UserPlus, Users, Search, Check, X } from 'lucide-svelte';
	import { currentUser } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let targetEmail = $state('');
	let processing = $state(false);
	let message = $state('');
	let isError = $state(false);

	// Security: Only Kellie can stay here
	$effect(() => {
		const user = $currentUser;
		if (user && user.email !== 'kelliebrighty@gmail.com') {
			goto('/dashboard');
		}
	});

	async function handleWhitelist() {
		if (!targetEmail || !targetEmail.includes('@')) return;
		processing = true; message = ''; isError = false;
		
		try {
			const user = $currentUser;
			if (!user) throw new Error('Not logged in');
			const idToken = await user.getIdToken();
			
			const res = await fetch('/api/admin/whitelist', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${idToken}`
				},
				body: JSON.stringify({ email: targetEmail.trim().toLowerCase() })
			});
			
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to whitelist');
			
			message = `Successfully whitelisted ${targetEmail}`;
			targetEmail = '';
		} catch (err: any) {
			message = err.message;
			isError = true;
		} finally {
			processing = false;
		}
	}
</script>

<svelte:head><title>Super Admin | SyncShip</title></svelte:head>

<div class="mb-10">
	<div class="flex items-center gap-3">
		<div class="rounded-xl bg-indigo-600 p-2.5">
			<ShieldCheck class="h-6 w-6 text-white" />
		</div>
		<div>
			<h1 class="text-2xl font-black tracking-tight text-gray-900">Super Admin</h1>
			<p class="text-sm text-gray-500 font-medium">Platform management for SyncShip.</p>
		</div>
	</div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
	<!-- Whitelist User Card -->
	<div class="lg:col-span-2 space-y-6">
		<Card class="p-8 border-indigo-100 shadow-xl shadow-indigo-500/5">
			<div class="flex items-center gap-3 mb-6">
				<div class="rounded-lg bg-indigo-50 p-2">
					<UserPlus class="h-5 w-5 text-indigo-600" />
				</div>
				<h3 class="text-lg font-bold text-gray-900">Whitelist User</h3>
			</div>
			
			<p class="text-sm text-gray-500 mb-6">
				Whitelisting a user gives them permanent **Lifetime Access** bypassing all payment requirements.
			</p>

			<div class="flex flex-col sm:flex-row gap-3">
				<div class="flex-1">
					<Input 
						placeholder="user@example.com" 
						bind:value={targetEmail} 
						disabled={processing}
					/>
				</div>
				<Button 
					onclick={handleWhitelist} 
					disabled={processing || !targetEmail}
					class="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
				>
					{processing ? 'Processing...' : 'Grant Access'}
				</Button>
			</div>

			{#if message}
				<div class="mt-4 flex items-center gap-2 p-3 rounded-lg text-sm {isError ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}">
					{#if isError} <X class="h-4 w-4" /> {:else} <Check class="h-4 w-4" /> {/if}
					{message}
				</div>
			{/if}
		</Card>

		<!-- Platform Stats (Placeholder) -->
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<Card class="p-6 bg-white border-gray-100">
				<div class="flex items-center justify-between">
					<div class="p-2 bg-gray-50 rounded-lg"><Users class="h-5 w-5 text-gray-400" /></div>
					<span class="text-2xl font-black text-gray-900">—</span>
				</div>
				<p class="mt-4 text-sm font-bold text-gray-500 uppercase tracking-widest">Total Users</p>
			</Card>
			<Card class="p-6 bg-white border-gray-100">
				<div class="flex items-center justify-between">
					<div class="p-2 bg-gray-50 rounded-lg"><Check class="h-5 w-5 text-gray-400" /></div>
					<span class="text-2xl font-black text-gray-900">—</span>
				</div>
				<p class="mt-4 text-sm font-bold text-gray-500 uppercase tracking-widest">Active Licenses</p>
			</Card>
		</div>
	</div>

	<!-- Sidebar / Info -->
	<div class="space-y-6">
		<Card class="p-6 bg-gray-900 text-white overflow-hidden relative">
			<div class="relative z-10">
				<h4 class="text-xs font-black uppercase tracking-widest text-indigo-400 mb-2">Admin Notice</h4>
				<p class="text-sm text-gray-300">
					Changes made here directly affect Firestore production data. Whitelisted users will bypass the monthly payment checks that will be implemented soon.
				</p>
			</div>
			<!-- Subtle pattern bg -->
			<div class="absolute inset-0 opacity-10 pointer-events-none">
				<div class="h-full w-full" style="background-image: radial-gradient(white 1px, transparent 0); background-size: 20px 20px;"></div>
			</div>
		</Card>
	</div>
</div>
