<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import AddSiteModal from '$lib/components/ui/AddSiteModal.svelte';
	import { Globe, Plus, ExternalLink, GitBranch, Clock, CheckCircle, XCircle, Loader } from 'lucide-svelte';
	import { currentUser } from '$lib/stores/auth';
	import { getSites } from '$lib/firebase/services/sites';
	import type { Site } from '$lib/types/models';

	let sites = $state<Site[]>([]);
	let loading = $state(true);
	let showAddSite = $state(false);

	$effect(() => {
		const user = $currentUser;
		if (user) { loadSites(user.uid); }
	});

	async function loadSites(uid: string) {
		loading = true;
		try { sites = await getSites(uid); }
		catch (err) { console.error('Failed to load sites:', err); }
		finally { loading = false; }
	}

	function handleSiteCreated() {
		const user = $currentUser;
		if (user) loadSites(user.uid);
	}

	function timeAgo(date: Date | null): string {
		if (!date) return 'Never';
		const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
		if (seconds < 60) return 'Just now';
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		return `${Math.floor(hours / 24)}d ago`;
	}

	const statusConfig: Record<string, { icon: any; classes: string; label: string }> = {
		live: { icon: CheckCircle, classes: 'bg-green-50 text-green-700', label: 'Live' },
		building: { icon: Loader, classes: 'bg-yellow-50 text-yellow-700', label: 'Building' },
		failed: { icon: XCircle, classes: 'bg-red-50 text-red-700', label: 'Failed' },
		pending: { icon: Clock, classes: 'bg-gray-100 text-gray-600', label: 'Pending' }
	};
</script>

<svelte:head><title>Sites | SyncShip</title></svelte:head>

<div class="mb-6 sm:flex sm:items-center sm:justify-between">
	<div>
		<h1 class="text-xl font-bold tracking-tight text-gray-900">Sites</h1>
		<p class="mt-1 text-sm text-gray-500">Manage all your deployed client websites.</p>
	</div>
	<div class="mt-4 sm:ml-4 sm:mt-0">
		<Button onclick={() => showAddSite = true}>
			<Plus class="-ml-0.5 mr-1.5 h-4 w-4" />
			Add Site
		</Button>
	</div>
</div>

{#if loading}
	<div class="grid gap-3">
		{#each [1, 2, 3] as _}
			<Card class="p-4 animate-pulse">
				<div class="flex items-center gap-3">
					<div class="rounded-lg bg-gray-100 h-10 w-10"></div>
					<div class="space-y-2"><div class="h-4 w-28 bg-gray-200 rounded"></div><div class="h-3 w-44 bg-gray-100 rounded"></div></div>
				</div>
			</Card>
		{/each}
	</div>
{:else if sites.length === 0}
	<Card class="p-8 text-center">
		<Globe class="mx-auto h-10 w-10 text-gray-300" />
		<h3 class="mt-2 text-sm font-semibold text-gray-900">No sites yet</h3>
		<p class="mt-1 text-sm text-gray-500">Connect a GitHub repo to deploy your first site.</p>
		<div class="mt-4">
			<Button variant="outline" onclick={() => showAddSite = true}>Add Your First Site</Button>
		</div>
	</Card>
{:else}
	<div class="grid gap-3">
		{#each sites as site}
			{@const config = statusConfig[site.status] ?? statusConfig['pending']}
			<Card class="flex items-center justify-between p-4 hover:border-gray-300 transition-colors">
				<div class="flex items-center gap-3">
					<div class="rounded-lg bg-gray-100 p-2.5">
						<Globe class="h-5 w-5 text-gray-600" />
					</div>
					<div>
						<div class="flex items-center gap-2">
							<h3 class="text-sm font-semibold text-gray-900">{site.name}</h3>
							<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium {config.classes}">
								<config.icon class="h-3 w-3 {site.status === 'building' ? 'animate-spin' : ''}" />
								{config.label}
							</span>
						</div>
						<div class="mt-0.5 flex items-center gap-3 text-xs text-gray-400">
							<span class="flex items-center gap-1"><ExternalLink class="h-3 w-3" />{site.domain}</span>
							<span class="flex items-center gap-1"><GitBranch class="h-3 w-3" />{site.repo} ({site.branch})</span>
							<span class="flex items-center gap-1"><Clock class="h-3 w-3" />{timeAgo(site.lastDeployAt)}</span>
						</div>
					</div>
				</div>
				<a href="/sites/{site.id}">
					<Button variant="ghost" size="sm">View</Button>
				</a>
			</Card>
		{/each}
	</div>
{/if}

<AddSiteModal bind:open={showAddSite} onclose={() => showAddSite = false} oncreated={handleSiteCreated} />
