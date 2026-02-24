<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import { CodeSquare, ChevronDown, Loader } from 'lucide-svelte';
	import { currentUser } from '$lib/stores/auth';
	import type { Deployment } from '$lib/types/models';
	import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
	import { db } from '$lib/firebase/client';
	import { onDestroy } from 'svelte';

	let deployments = $state<Deployment[]>([]);
	let loading = $state(true);
	let expandedDeployId = $state<string | null>(null);
	let unsub: (() => void) | null = null;

	$effect(() => {
		const user = $currentUser;
		if (user) startListening(user.uid);
	});

	onDestroy(() => unsub?.());

	function startListening(uid: string) {
		unsub?.();
		const q = query(
			collection(db, 'deployments'),
			where('ownerId', '==', uid),
			orderBy('createdAt', 'desc')
		);
		unsub = onSnapshot(q, (snap) => {
			deployments = snap.docs.map(d => {
				const data = d.data();
				return {
					id: d.id,
					siteId: data.siteId,
					siteName: data.siteName,
					commit: data.commit,
					message: data.message,
					branch: data.branch,
					status: data.status,
					duration: data.duration || '—',
					triggeredBy: data.triggeredBy,
					ownerId: data.ownerId,
					buildLog: data.buildLog || '',
					createdAt: data.createdAt?.toDate() || new Date()
				} as Deployment;
			});
			loading = false;
		});
	}

	function timeAgo(date: Date): string {
		const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
		if (seconds < 60) return 'Just now';
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		return `${Math.floor(hours / 24)}d ago`;
	}
</script>

<svelte:head><title>Deployments | SyncShip</title></svelte:head>

<div class="mb-6">
	<h1 class="text-xl font-bold tracking-tight text-gray-900">Deployments</h1>
	<p class="mt-1 text-sm text-gray-500">Track all deployment activity across your sites.</p>
</div>

{#if loading}
	<Card class="animate-pulse p-4 space-y-3">
		{#each [1, 2, 3, 4] as _}
			<div class="flex items-center gap-3">
				<div class="h-4 w-4 bg-gray-200 rounded-full"></div>
				<div class="h-4 w-20 bg-gray-200 rounded"></div>
				<div class="h-4 w-36 bg-gray-100 rounded"></div>
			</div>
		{/each}
	</Card>
{:else if deployments.length === 0}
	<Card class="p-8 text-center">
		<CodeSquare class="mx-auto h-10 w-10 text-gray-300" />
		<h3 class="mt-2 text-sm font-semibold text-gray-900">No deployments yet</h3>
		<p class="mt-1 text-sm text-gray-500">Deployments will appear here when you push to a connected repo.</p>
	</Card>
{:else}
	<Card class="overflow-hidden">
		<div class="divide-y divide-gray-100">
			{#each deployments as deploy}
				{@const dStatus = deploy.status === 'success' ? 'bg-green-500' : deploy.status === 'failed' ? 'bg-red-500' : deploy.status === 'building' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}
				{@const isExpanded = expandedDeployId === deploy.id}
				<div>
					<button
						onclick={() => expandedDeployId = isExpanded ? null : deploy.id}
						class="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer text-left"
					>
						<div class="flex items-center gap-3">
							<span class="h-2 w-2 rounded-full {dStatus}"></span>
							<div>
								<div class="flex items-center gap-2">
									<span class="text-sm font-medium text-gray-900">{deploy.siteName}</span>
									<code class="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded font-mono">{deploy.commit.slice(0, 7)}</code>
									<span class="text-sm text-gray-500 truncate max-w-[200px]">{deploy.message}</span>
								</div>
								<p class="mt-0.5 text-xs text-gray-400">
									{deploy.triggeredBy} · {deploy.branch}
								</p>
							</div>
						</div>
						<div class="flex items-center gap-3">
							<div class="text-right">
								<p class="text-sm font-mono text-gray-500">{deploy.duration}</p>
								<p class="text-xs text-gray-400">{timeAgo(deploy.createdAt)}</p>
							</div>
							<ChevronDown class="h-4 w-4 text-gray-400 transition-transform {isExpanded ? 'rotate-180' : ''}" />
						</div>
					</button>

					{#if isExpanded}
						<div class="px-5 pb-4">
							{#if deploy.status === 'failed'}
								<div class="mb-2 rounded-md bg-red-50 border border-red-200 px-3 py-2">
									<p class="text-sm font-medium text-red-800">Deployment failed</p>
								</div>
							{:else if deploy.status === 'success'}
								<div class="mb-2 rounded-md bg-green-50 border border-green-200 px-3 py-2">
									<p class="text-sm font-medium text-green-800">Deployment succeeded</p>
								</div>
							{/if}
							{#if deploy.buildLog}
								<div class="rounded-md bg-gray-900 p-4 overflow-x-auto">
									<pre class="text-xs font-mono text-gray-300 whitespace-pre-wrap">{deploy.buildLog}</pre>
								</div>
							{:else if deploy.status === 'building' || deploy.status === 'queued'}
								<div class="flex items-center gap-2 text-sm text-gray-500">
									<Loader class="h-3.5 w-3.5 animate-spin" />
									Waiting for build output...
								</div>
							{:else}
								<p class="text-sm text-gray-400">No build log available.</p>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</Card>
{/if}
