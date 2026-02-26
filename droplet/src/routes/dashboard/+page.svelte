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

	let sites = $state<Site[]>([]);
	let deployments = $state<Deployment[]>([]);
	let stats = $state<ServerStats | null>(null);
	let totalDeployments = $state(0);
	let loading = $state(true);

	$effect(() => {
		const user = $currentUser;
		if (user) {
			loadData(user.uid);
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
		return `${days}d ago`;
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
	<div class="mt-4 sm:ml-4 sm:mt-0">
		<a href="/sites">
			<Button>
				<Plus class="-ml-0.5 mr-1.5 h-4 w-4" />
				New Project
			</Button>
		</a>
	</div>
</div>

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
