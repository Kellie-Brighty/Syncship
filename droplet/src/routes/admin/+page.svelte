<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { ShieldCheck, UserPlus, Users, Search, Check, X } from 'lucide-svelte';
	import { currentUser } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	import Switch from '$lib/components/ui/Switch.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';

	let targetEmail = $state('');
	let processing = $state(false);
	let message = $state('');
	let isError = $state(false);

	// User List & Stats
	let users = $state<any[]>([]);
	let stats = $state({ totalUsers: 0, activeLicenses: 0 });
	let loadingUsers = $state(true);
	let currentPage = $state(1);
	let lastIds = $state<string[]>([]); // To support back/forward pagination with cursors
	let hasMore = $state(false);
	const PAGE_SIZE = 10;

	// Security: Only Kellie can stay here
	$effect(() => {
		const user = $currentUser;
		if (user && user.email !== 'kelliebrighty@gmail.com') {
			goto('/dashboard');
		}
	});

	onMount(() => {
		loadUsers();
	});

	async function loadUsers(direction: 'next' | 'prev' | 'initial' = 'initial') {
		loadingUsers = true;
		try {
			const user = $currentUser;
			if (!user) return;
			const idToken = await user.getIdToken();
			
			let url = `/api/admin/users?pageSize=${PAGE_SIZE}`;
			if (direction === 'next' && lastIds.length > 0) {
				url += `&lastId=${lastIds[lastIds.length - 1]}`;
			} else if (direction === 'prev' && lastIds.length > 1) {
				// To go back, we actually need the ID from 2 pages ago
				url += `&lastId=${lastIds[lastIds.length - 3] || ''}`;
			}

			const res = await fetch(url, {
				headers: { 'Authorization': `Bearer ${idToken}` }
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);

			users = data.users;
			stats = data.stats;
			hasMore = data.hasMore;
			
			if (direction === 'next') {
				lastIds.push(data.lastId);
			} else if (direction === 'prev') {
				lastIds.pop();
			} else {
				lastIds = [data.lastId];
			}
		} catch (err) {
			console.error('Failed to load users:', err);
		} finally {
			loadingUsers = false;
		}
	}

	async function toggleWhitelist(u: any, status: boolean) {
		try {
			const user = $currentUser;
			if (!user) return;
			const idToken = await user.getIdToken();
			
			const res = await fetch('/api/admin/whitelist', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${idToken}`
				},
				body: JSON.stringify({ uid: u.uid, isWhitelisted: status })
			});
			
			if (!res.ok) throw new Error('Toggle failed');
			u.isWhitelisted = status;
			u.plan = status ? 'lifetime' : 'free';
			
			// Refresh stats
			loadUsers();
		} catch (err) {
			console.error('Toggle error:', err);
		}
	}

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
			
			message = data.message;
			targetEmail = '';
			loadUsers(); // Refresh list
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

<div class="space-y-8">
	<!-- Stats Top Bar -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<Card class="p-6 bg-white border-gray-100">
			<div class="flex items-center justify-between">
				<div class="p-2 bg-indigo-50 rounded-lg"><Users class="h-5 w-5 text-indigo-600" /></div>
				<span class="text-2xl font-black text-gray-900">{loadingUsers ? '...' : stats.totalUsers}</span>
			</div>
			<p class="mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Total Users</p>
		</Card>
		<Card class="p-6 bg-white border-gray-100">
			<div class="flex items-center justify-between">
				<div class="p-2 bg-green-50 rounded-lg"><Check class="h-5 w-5 text-green-600" /></div>
				<span class="text-2xl font-black text-gray-900">{loadingUsers ? '...' : stats.activeLicenses}</span>
			</div>
			<p class="mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Active Licenses</p>
		</Card>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
		<!-- User Management -->
		<div class="lg:col-span-2 space-y-6">
			<!-- User Table Card -->
			<Card class="overflow-hidden border-gray-100 shadow-sm">
				<div class="p-6 border-b border-gray-50 flex items-center justify-between bg-white">
					<h3 class="font-bold text-gray-900">Registered Users</h3>
					<div class="flex items-center gap-2">
						<button 
							onclick={() => loadUsers()} 
							class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
							title="Refresh list"
						>
							<Users class="h-4 w-4 {loadingUsers ? 'animate-pulse' : ''}" />
						</button>
					</div>
				</div>

				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm">
						<thead class="bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500">
							<tr>
								<th class="px-6 py-4">User</th>
								<th class="px-6 py-4 text-center">Plan</th>
								<th class="px-6 py-4 text-center">Whitelisted</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-100">
							{#if loadingUsers && users.length === 0}
								{#each Array(5) as _}
									<tr class="animate-pulse">
										<td class="px-6 py-4"><div class="h-4 w-32 bg-gray-100 rounded"></div></td>
										<td class="px-6 py-4"><div class="mx-auto h-4 w-16 bg-gray-100 rounded"></div></td>
										<td class="px-6 py-4"><div class="mx-auto h-5 w-9 bg-gray-100 rounded-full"></div></td>
									</tr>
								{/each}
							{:else if users.length === 0}
								<tr>
									<td colspan="3" class="px-6 py-12 text-center text-gray-500">
										No users found matching criteria.
									</td>
								</tr>
							{:else}
								{#each users as u (u.uid)}
									<tr class="hover:bg-gray-50/50 transition-colors">
										<td class="px-6 py-4">
											<div class="flex flex-col">
												<span class="font-bold text-gray-900">{u.displayName}</span>
												<span class="text-xs text-gray-500">{u.email}</span>
											</div>
										</td>
										<td class="px-6 py-4 text-center">
											<span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize
												{u.plan === 'lifetime' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}">
												{u.plan}
											</span>
										</td>
										<td class="px-6 py-4 text-center">
											<div class="flex justify-center">
												<Switch 
													checked={u.isWhitelisted} 
													disabled={u.email === 'kelliebrighty@gmail.com'}
													onchange={(status) => toggleWhitelist(u, status)} 
												/>
											</div>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>

				<!-- Pagination -->
				<div class="border-t border-gray-50 p-4 bg-gray-50/30 flex items-center justify-between">
					<button 
						onclick={() => { currentPage--; loadUsers('prev'); }}
						disabled={currentPage === 1 || loadingUsers}
						class="text-xs font-bold text-gray-600 disabled:opacity-30 hover:text-indigo-600 transition-colors"
					>
						← Previous
					</button>
					<span class="text-xs font-bold text-gray-400 uppercase tracking-widest">Page {currentPage}</span>
					<button 
						onclick={() => { currentPage++; loadUsers('next'); }}
						disabled={!hasMore || loadingUsers}
						class="text-xs font-bold text-gray-600 disabled:opacity-30 hover:text-indigo-600 transition-colors"
					>
						Next →
					</button>
				</div>
			</Card>
		</div>

		<!-- Whitelist Quick Action -->
		<div class="space-y-6">
			<Card class="p-8 border-indigo-100 bg-indigo-50/20 shadow-xl shadow-indigo-500/5">
				<div class="flex items-center gap-3 mb-6">
					<div class="rounded-lg bg-indigo-100 p-2">
						<UserPlus class="h-5 w-5 text-indigo-600" />
					</div>
					<h3 class="text-lg font-bold text-gray-900">Quick Whitelist</h3>
				</div>
				
				<p class="text-sm text-gray-500 mb-6 font-medium">
					Grant lifetime access to a user before they register or by email.
				</p>

				<div class="space-y-3">
					<Input 
						placeholder="user@example.com" 
						bind:value={targetEmail} 
						disabled={processing}
					/>
					<Button 
						onclick={handleWhitelist} 
						disabled={processing || !targetEmail}
						class="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
					>
						{processing ? 'Processing...' : 'Grant Access'}
					</Button>
				</div>

				{#if message}
					<div class="mt-4 flex items-center gap-2 p-3 rounded-lg text-sm {isError ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}">
						{#if isError} <X class="h-4 w-4" /> {:else} <Check class="h-4 w-4" /> {/if}
						<span class="font-medium">{message}</span>
					</div>
				{/if}
			</Card>

			<Card class="p-6 bg-gray-900 text-white overflow-hidden relative">
				<div class="relative z-10">
					<h4 class="text-xs font-black uppercase tracking-widest text-indigo-400 mb-2">Admin Notice</h4>
					<p class="text-sm text-gray-300 leading-relaxed">
						Whitelisted users bypass billing checks. Removing a whitelist will reset the user to the "Free" plan unless they have an active Polar subscription.
					</p>
				</div>
				<div class="absolute inset-0 opacity-10 pointer-events-none">
					<div class="h-full w-full" style="background-image: radial-gradient(white 1px, transparent 0); background-size: 20px 20px;"></div>
				</div>
			</Card>
		</div>
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
