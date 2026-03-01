<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { Activity, Globe, Server, Plus, CodeSquare } from 'lucide-svelte';
	import { currentUser, authLoading } from '$lib/stores/auth';
	import { getSites } from '$lib/firebase/services/sites';
	import { getDeployments, getTotalDeploymentCount } from '$lib/firebase/services/deployments';
	import { listenToServerStats } from '$lib/firebase/services/serverStats';
	import type { Site } from '$lib/types/models';
	import type { Deployment } from '$lib/types/models';
	import type { ServerStats } from '$lib/types/models';
	import { db } from '$lib/firebase/client';
	import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
	import ConfirmationModal from '$lib/components/ui/ConfirmationModal.svelte';

	const LATEST_DAEMON_VERSION = '0.1.0'; // Hardcoded for now

	let sites = $state<Site[]>([]);
	let deployments = $state<Deployment[]>([]);
	let stats = $state<ServerStats | null>(null);
	let totalDeployments = $state(0);
	let loading = $state(true);
	let checkingUpdate = $state(false);
	let daemonInfo = $state<any>(null);
	let updateAvailable = $derived(daemonInfo?.version && daemonInfo.version !== LATEST_DAEMON_VERSION);

	// Modal States
	let showUpdateModal = $state(false);
	let showUpToDateModal = $state(false);
	let selfUpdateStarted = $state(false);

	$effect(() => {
		const user = $currentUser;
		if (user) {
			loadData(user.uid);
			
			// Listen to daemon info for version/status
			const unsub = onSnapshot(doc(db, 'daemon', user.uid), (snap) => {
				if (snap.exists()) {
					daemonInfo = snap.data();
				}
			});
			return unsub;
		}
	});

	import { onDestroy } from 'svelte';
	let unsubscribeStats: (() => void) | null = null;

	async function loadData(uid: string) {
		loading = true;
		try {
			const [s, d, total] = await Promise.all([
				getSites(uid),
				getDeployments(uid, 5),
				getTotalDeploymentCount(uid)
			]);
			sites = s;
			deployments = d;
			totalDeployments = total;
			
			// Setup realtime listener for stats for this specific user
			unsubscribeStats = listenToServerStats((incomingStats) => {
				stats = incomingStats;
			}, uid);
		} catch (err) {
			console.error('Failed to load dashboard data:', err);
		} finally {
			loading = false;
		}
	}

	onDestroy(() => {
		if (unsubscribeStats) unsubscribeStats();
	});

	function timeAgo(date: Date): string {
		const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
		if (seconds < 60) return 'Just now';
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${seconds / 86400 < 1 ? 'Today' : (days + 'd ago')}`;
	}

	async function checkForUpdates() {
		if (!$currentUser) return;
		checkingUpdate = true;
		
		try {
			// Trigger a fresh heartbeat to get current version
			await updateDoc(doc(db, 'daemon', $currentUser.uid), {
				action: 'refresh_stats'
			});
			
			// Wait a bit for the daemon to respond
			setTimeout(() => {
				checkingUpdate = false;
				if (!updateAvailable) {
					showUpToDateModal = true;
				}
			}, 2000);
		} catch (err) {
			console.error('Update check failed:', err);
			checkingUpdate = false;
		}
	}

	async function confirmSelfUpdate() {
		if (!$currentUser) return;
		showUpdateModal = true;
	}

	async function startSelfUpdate() {
		if (!$currentUser) return;
		
		selfUpdateStarted = true;
		try {
			await updateDoc(doc(db, 'daemon', $currentUser.uid), {
				action: 'self_update'
			});
			showUpdateModal = false;
		} catch (err) {
			console.error('Failed to trigger self-update:', err);
		} finally {
			selfUpdateStarted = false;
		}
	}
</script>

<svelte:head>
	<title>Dashboard | SyncShip</title>
</svelte:head>

<div class="mb-6 sm:flex sm:items-center sm:justify-between">
	<div>
		<h1 class="text-xl font-bold tracking-tight text-gray-900">Dashboard</h1>
		<p class="mt-1 text-sm text-gray-500">Overview of your hosted sites and server health.</p>
	</div>
	<div class="mt-4 flex flex-shrink-0 items-center gap-2 sm:ml-4 sm:mt-0">
		<Button variant="outline" onclick={checkForUpdates} disabled={checkingUpdate || daemonInfo?.action === 'updating'}>
			{#if checkingUpdate}
				<Activity class="-ml-0.5 mr-1.5 h-4 w-4 animate-spin" />
				Checking...
			{:else}
				<Server class="-ml-0.5 mr-1.5 h-4 w-4" />
				Check for Updates
			{/if}
		</Button>
		<a href="/sites">
			<Button>
				<Plus class="-ml-0.5 mr-1.5 h-4 w-4" />
				New Project
			</Button>
		</a>
	</div>
</div>

{#if updateAvailable || daemonInfo?.action === 'updating'}
	<div class="mb-6 rounded-lg border border-indigo-100 bg-indigo-50 p-4">
		<div class="flex items-start gap-3">
			<div class="rounded-full bg-indigo-100 p-1.5">
				<Activity class="h-4 w-4 text-indigo-600 {daemonInfo?.action === 'updating' ? 'animate-spin' : ''}" />
			</div>
			<div class="flex-1">
				{#if daemonInfo?.action === 'updating'}
					<h3 class="text-sm font-semibold text-indigo-900">SyncShip is Updating...</h3>
					<p class="mt-1 text-xs text-indigo-700 uppercase tracking-wider font-bold">
						Current Step: {daemonInfo.updateStatus || 'Initializing'}
					</p>
					<div class="mt-2 h-1.5 w-full rounded-full bg-indigo-100 overflow-hidden">
						<div class="h-full bg-indigo-500 transition-all duration-500 {daemonInfo.updateStatus === 'pulling' ? 'w-1/4' : daemonInfo.updateStatus === 'installing' ? 'w-2/4' : daemonInfo.updateStatus === 'building' ? 'w-3/4' : 'w-full'}"></div>
					</div>
				{:else}
					<h3 class="text-sm font-semibold text-indigo-900">SyncShip Update Available (v{LATEST_DAEMON_VERSION})</h3>
					<p class="mt-1 text-sm text-indigo-700">A new version of the SyncShip daemon is available. Update now to get the latest features and fixes.</p>
					<div class="mt-3 flex gap-3">
						<Button size="sm" class="bg-indigo-600 hover:bg-indigo-700" onclick={confirmSelfUpdate}>
							One-Click Update
						</Button>
						<a href="/settings" class="text-sm font-medium text-indigo-600 hover:text-indigo-500 self-center">
							View manual instructions
						</a>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Confirmation Modals -->
<ConfirmationModal 
	bind:show={showUpdateModal}
	title="Update SyncShip?"
	message="Are you sure you want to update the SyncShip daemon? The server might be briefly unavailable during the restart process (usually < 10 seconds)."
	confirmText="Start Update"
	type="warning"
	loading={selfUpdateStarted}
	onConfirm={startSelfUpdate}
	onCancel={() => showUpdateModal = false}
/>

<ConfirmationModal 
	bind:show={showUpToDateModal}
	title="You're all set!"
	message="SyncShip is running the latest version (v{daemonInfo?.version || 'unknown'}). No updates needed."
	confirmText="Awesome"
	type="success"
	onConfirm={() => showUpToDateModal = false}
	onCancel={() => showUpToDateModal = false}
/>

{#if daemonInfo?.action === 'error'}
	<div class="mb-6 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
		<p class="font-bold">Update Failed: {daemonInfo.updateError}</p>
		<p class="mt-1">Please SSH into your VPS and run `git -C /opt/syncship-daemon pull && cd /opt/syncship-daemon/daemon && npm install && npm run build && pm2 restart syncship-daemon` manually.</p>
	</div>
{/if}

{#if loading}
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each [1, 2, 3] as _}
			<Card class="p-5 animate-pulse">
				<div class="flex items-center gap-3">
					<div class="rounded-lg bg-gray-100 h-10 w-10"></div>
					<div class="space-y-2">
						<div class="h-3 w-16 bg-gray-200 rounded"></div>
						<div class="h-5 w-10 bg-gray-200 rounded"></div>
					</div>
				</div>
			</Card>
		{/each}
	</div>
{:else}
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
		<Card class="p-5">
			<div class="flex items-center gap-3">
				<div class="rounded-lg bg-gray-100 p-2.5">
					<Globe class="h-5 w-5 text-gray-600" />
				</div>
				<div>
					<p class="text-sm text-gray-500">Active Sites</p>
					<p class="text-xl font-bold text-gray-900">{sites.filter(s => s.status === 'live').length}</p>
				</div>
			</div>
		</Card>

		<Card class="p-5">
			<div class="flex items-center gap-3">
				<div class="rounded-lg bg-gray-100 p-2.5">
					<Activity class="h-5 w-5 text-gray-600" />
				</div>
				<div>
					<p class="text-sm text-gray-500">Total Deployments</p>
					<p class="text-xl font-bold text-gray-900">{totalDeployments}</p>
				</div>
			</div>
		</Card>

		<Card class="p-5">
			<div class="flex items-center gap-3">
				<div class="rounded-lg bg-gray-100 p-2.5">
					<Server class="h-5 w-5 text-gray-600" />
				</div>
				<div class="flex-1">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-1.5">
							<p class="text-sm text-gray-500">Server Load</p>
							<div class="group relative flex items-center justify-center">
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400 hover:text-gray-600 cursor-help transition-colors"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
								<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded bg-gray-900 px-2 py-1.5 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
									Real-time RAM usage of your Ubuntu droplet
									{#if stats?.dropletIp}
										<div class="mt-1 pt-1 border-t border-gray-700 font-mono text-[10px]">IP: {stats.dropletIp}</div>
									{/if}
									<div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 px-1 py-1"></div>
								</div>
							</div>
						</div>
						{#if stats}
							<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
								{stats.ramUsage < 70
									? 'bg-green-50 text-green-700'
									: stats.ramUsage < 90
										? 'bg-yellow-50 text-yellow-700'
										: 'bg-red-50 text-red-700'}">
								{stats.ramUsage < 70 ? 'Healthy' : stats.ramUsage < 90 ? 'Moderate' : 'Critical'}
							</span>
						{/if}
					</div>
					<p class="text-xl font-bold text-gray-900 tracking-tight">
						{stats ? Math.round(stats.ramUsage) : 0}<span class="text-sm font-medium text-gray-400 ml-0.5">% RAM</span>
					</p>
					{#if stats?.dropletIp}
						<div class="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
							<span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
							<span class="font-mono">{stats.dropletIp}</span>
						</div>
					{/if}
				</div>
			</div>
		</Card>
	</div>

	<div class="mt-8">
		<h2 class="text-base font-semibold text-gray-900 mb-3">Recent Deployments</h2>
		{#if deployments.length === 0}
			<Card class="p-8 text-center">
				<CodeSquare class="mx-auto h-10 w-10 text-gray-300" />
				<h3 class="mt-2 text-sm font-semibold text-gray-900">No deployments yet</h3>
				<p class="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
				<div class="mt-4">
					<a href="/sites"><Button variant="outline">Create Project</Button></a>
				</div>
			</Card>
		{:else}
			<Card class="overflow-hidden">
				<div class="divide-y divide-gray-100">
					{#each deployments as deploy}
						<div class="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
							<div class="flex items-center gap-3">
								<span class="h-2 w-2 rounded-full {deploy.status === 'success' ? 'bg-green-500' : deploy.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}"></span>
								<span class="text-sm font-medium text-gray-900">{deploy.siteName}</span>
								<code class="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-mono">{deploy.commit.slice(0, 7)}</code>
								<span class="text-sm text-gray-500 truncate max-w-[200px]">{deploy.message}</span>
							</div>
							<span class="text-xs text-gray-400">{timeAgo(deploy.createdAt)}</span>
						</div>
					{/each}
				</div>
			</Card>
		{/if}
	</div>
{/if}
