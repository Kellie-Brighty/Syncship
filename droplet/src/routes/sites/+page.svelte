<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import AddSiteModal from '$lib/components/ui/AddSiteModal.svelte';
	import { Globe, Plus, ExternalLink, GitBranch, Clock, CheckCircle, XCircle, Loader, Search } from 'lucide-svelte';
	import { currentUser } from '$lib/stores/auth';
	import { getSites } from '$lib/firebase/services/sites';
	import type { Site } from '$lib/types/models';

	let sites = $state<Site[]>([]);
	let loading = $state(true);
	let showAddSite = $state(false);
	
	let searchQuery = $state('');
	let filteredSites = $derived(
		sites.filter(s => 
			s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			s.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
			s.repo.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

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

<div class="mb-6 max-w-md">
	<div class="relative">
		<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
			<Search class="h-4 w-4 text-gray-400" />
		</div>
		<Input
			type="search"
			name="search"
			id="search"
			class="pl-10 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
			placeholder="Search by site name, domain, or repo..."
			bind:value={searchQuery}
		/>
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
{:else if filteredSites.length === 0}
	<Card class="p-8 text-center">
		<Search class="mx-auto h-10 w-10 text-gray-300" />
		<h3 class="mt-2 text-sm font-semibold text-gray-900">No matches found</h3>
		<p class="mt-1 text-sm text-gray-500">We couldn't find any sites matching "{searchQuery}".</p>
	</Card>
{:else}
	<div class="grid gap-3">
		{#each filteredSites as site}
			{@const config = statusConfig[site.status] ?? statusConfig['pending']}
			<Card class="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:border-gray-300 transition-colors gap-4 sm:gap-0">
				<div class="flex items-start sm:items-center gap-3">
					<div class="rounded-lg bg-gray-100 p-2.5 shrink-0 mt-1 sm:mt-0">
						<Globe class="h-5 w-5 text-gray-600" />
					</div>
					<div class="min-w-0">
						<div class="flex flex-wrap items-center gap-2">
							<h3 class="text-sm font-semibold text-gray-900 truncate">{site.name}</h3>
							<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium shrink-0 {config.classes}">
								<config.icon class="h-3 w-3 {site.status === 'building' ? 'animate-spin' : ''}" />
								{config.label}
							</span>
						</div>
						<div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
							<span class="flex items-center gap-1 truncate"><ExternalLink class="h-3 w-3 shrink-0" />{site.domain}</span>
							<span class="flex items-center gap-1 truncate"><GitBranch class="h-3 w-3 shrink-0" />{site.repo} ({site.branch})</span>
							<span class="flex items-center gap-1 shrink-0"><Clock class="h-3 w-3 shrink-0" />{timeAgo(site.lastDeployAt)}</span>
						</div>
					</div>
				</div>
				<div class="w-full sm:w-auto flex justify-end mt-2 sm:mt-0">
					<a href="/sites/{site.id}" class="w-full sm:w-auto">
						<Button variant="ghost" size="sm" class="w-full sm:w-auto bg-gray-50 sm:bg-transparent border sm:border-transparent border-gray-200">View Site</Button>
					</a>
				</div>
			</Card>
		{/each}
	</div>
{/if}

<AddSiteModal bind:open={showAddSite} onclose={() => showAddSite = false} oncreated={handleSiteCreated} />
