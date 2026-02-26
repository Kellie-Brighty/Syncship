<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import {
		Globe, ArrowLeft, ExternalLink, GitBranch, Clock, CheckCircle,
		XCircle, Loader, Settings, Trash2, Rocket, Copy, Check, ChevronDown,
		FileText, Upload, X
	} from 'lucide-svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { currentUser } from '$lib/stores/auth';
	import { getSiteById, updateSite, deleteSite } from '$lib/firebase/services/sites';
	import { getDeploymentsBySite, createDeployment, cancelDeployment } from '$lib/firebase/services/deployments';
	import type { Site, Deployment } from '$lib/types/models';
	import { get } from 'svelte/store';
	import { doc, collection, query, where, orderBy, onSnapshot, getDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase/client';
	import { onDestroy } from 'svelte';
	import confetti from 'canvas-confetti';

	let site = $state<Site | null>(null);
	let deployments = $state<Deployment[]>([]);
	let loading = $state(true);
	let activeTab = $state<'overview' | 'deployments' | 'settings'>('overview');

	// DNS State
	let dropletIp = $state<string | null>(null);
	let dnsStatus = $state<'checking' | 'verified' | 'unverified' | null>(null);
	let dnsError = $state<string | null>(null);

	// Edit state
	let editing = $state(false);
	let editName = $state('');
	let editDomain = $state('');
	let editRepo = $state('');
	let editBranch = $state('');
	let editBuildCommand = $state('');
	let editOutputDir = $state('');
	let saving = $state(false);

	// Delete state
	let showDeleteConfirm = $state(false);
	let deleting = $state(false);
	let deleteConfirmText = $state('');

	// Copy state
	let copied = $state(false);

	// Deploy state
	let deploying = $state(false);
	let saveState = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	
	let logContainer = $state<HTMLElement | null>(null);

	// Expand state for deployment logs
	let expandedDeployId = $state<string | null>(null);

	// Simulated Loading Terminal State
	const simulatedBuildSteps = [
		'Cloning repository...',
		'Resolving packages...',
		'Fetching dependencies...',
		'Linking node_modules...',
		'Building application...',
		'Compiling assets...',
		'Optimizing chunks...',
		'Generating static HTML...',
		'Finalizing deployment...'
	];
	let simulatedStepIndex = $state(0);
	
	$effect(() => {
		// Only run the interval if we actually have active deployments expanding the placeholder
		const needsSimulation = expandedDeployId && deployments.some(d => d.id === expandedDeployId && !d.buildLog && (d.status === 'building' || d.status === 'queued'));
		
		if (needsSimulation) {
			const interval = setInterval(() => {
				if (simulatedStepIndex < simulatedBuildSteps.length - 1) {
					simulatedStepIndex++;
				}
			}, 3500); // Change simulated text every 3.5 seconds
			return () => clearInterval(interval);
		} else {
			simulatedStepIndex = 0; // Reset when closed or finished
		}
	});

	// Real-time listeners
	let unsubSite: (() => void) | null = null;
	let unsubDeploys: (() => void) | null = null;

	// Toast & celebration state
	let showSuccessToast = $state(false);
	let prevDeployStatuses = new Map<string, string>();

	function celebrateDeployment() {
		showSuccessToast = true;
		const duration = 3000;
		const end = Date.now() + duration;
		const colors = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#ffffff'];
		(function frame() {
			confetti({
				particleCount: 6,
				angle: 60,
				spread: 55,
				origin: { x: 0 },
				colors,
				shapes: ['square', 'circle']
			});
			confetti({
				particleCount: 6,
				angle: 120,
				spread: 55,
				origin: { x: 1 },
				colors,
				shapes: ['square', 'circle']
			});
			if (Date.now() < end) requestAnimationFrame(frame);
		})();
		setTimeout(() => { showSuccessToast = false; }, 4000);
	}

	$effect(() => {
		const user = $currentUser;
		const id = $page.params.id;
		if (user && id) {
			startListening(id, user.uid);
			fetchDropletIp(user.uid);
		}
	});

	async function fetchDropletIp(userId: string) {
		try {
			const snap = await getDoc(doc(db, 'serverStats', userId));
			if (snap.exists() && snap.data().dropletIp) {
				dropletIp = snap.data().dropletIp;
			}
		} catch (e) {
			console.error('Failed to fetch droplet IP:', e);
		}
	}

	async function checkDns(domain: string) {
		if (!dropletIp || !domain) return;
		dnsStatus = 'checking';
		dnsError = null;
		try {
			const res = await fetch(`/api/dns?domain=${encodeURIComponent(domain)}`);
			if (!res.ok) throw new Error('DNS check failed');
			const data = await res.json();
			if (data.records && data.records.includes(dropletIp)) {
				dnsStatus = 'verified';
			} else {
				dnsStatus = 'unverified';
			}
		} catch (e: any) {
			console.error(e);
			dnsStatus = 'unverified';
			dnsError = e.message;
		}
	}

	$effect(() => {
		if (site && site.domain && dropletIp && dnsStatus === null) {
			checkDns(site.domain);
		}
	});

	// Auto-expand the currently building deployment row
	$effect(() => {
		const activeDeploy = deployments.find(
			(d) => d.status === 'building' || d.status === 'queued'
		);
		if (activeDeploy) {
			expandedDeployId = activeDeploy.id;
		}
	});

	// Detect building → success transition and celebrate!
	$effect(() => {
		for (const deploy of deployments) {
			const prev = prevDeployStatuses.get(deploy.id);
			if (prev === 'building' && deploy.status === 'success') {
				celebrateDeployment();
			}
			prevDeployStatuses.set(deploy.id, deploy.status);
		}
	});

	// Auto-scroll the terminal logs to the bottom as new logs stream in
	$effect(() => {
		if (deployments.length > 0 && deployments[0].buildLog && logContainer) {
			// Small delay to let the DOM paint first
			setTimeout(() => {
				if (logContainer) {
					logContainer.scrollTop = logContainer.scrollHeight;
				}
			}, 10);
		}
	});

	onDestroy(() => {
		unsubSite?.();
		unsubDeploys?.();
	});

	function startListening(id: string, userId: string) {
		// Clean up old listeners
		unsubSite?.();
		unsubDeploys?.();

		// Real-time site listener
		unsubSite = onSnapshot(doc(db, 'sites', id), (snap) => {
			if (snap.exists()) {
				const data = snap.data();
				site = {
					id: snap.id,
					name: data.name,
					domain: data.domain,
					repo: data.repo,
					branch: data.branch,
					buildCommand: data.buildCommand || '',
					outputDir: data.outputDir || '.',
					status: data.status,
					ownerId: data.ownerId,
					envVars: data.envVars,
					createdAt: data.createdAt?.toDate() || new Date(),
					updatedAt: data.updatedAt?.toDate() || new Date(),
					lastDeployAt: data.lastDeployAt?.toDate() || null
				} as Site;
			}
			loading = false;
		});

		// Real-time deployments listener
		const deploymentsQuery = query(
			collection(db, 'deployments'),
			where('siteId', '==', id),
			where('ownerId', '==', userId),
			orderBy('createdAt', 'desc')
		);
		unsubDeploys = onSnapshot(deploymentsQuery, (snap) => {
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
		});
	}

	function startEditing() {
		if (!site) return;
		editName = site.name;
		editDomain = site.domain;
		editRepo = site.repo;
		editBranch = site.branch;
		editBuildCommand = site.buildCommand;
		editOutputDir = site.outputDir;
		editing = true;
	}

	async function saveEdits() {
		if (!site) return;
		saving = true;
		try {
			await updateSite(site.id, {
				name: editName.trim(),
				domain: editDomain.trim(),
				repo: editRepo.trim(),
				branch: editBranch.trim(),
				buildCommand: editBuildCommand.trim(),
				outputDir: editOutputDir.trim()
			});
			editing = false;
		} catch (err) {
			console.error('Failed to update site:', err);
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!site || deleteConfirmText !== site.name) return;
		deleting = true;
		try {
			await deleteSite(site.id);
			goto('/sites');
		} catch (err) {
			console.error('Failed to delete site:', err);
		} finally {
			deleting = false;
		}
	}

	let uploadingEnv = $state(false);
	let envFileInput = $state<HTMLInputElement | null>(null);
	let dragOver = $state(false);

	async function processEnvFile(file: File) {
		uploadingEnv = true;
		try {
			const text = await file.text();
			if (!text.trim()) throw new Error("Empty file");
			await updateSite(site!.id, { envVars: text });
		} catch (err) {
			console.error('Failed to upload .env:', err);
			alert('Failed to read or upload the .env file. Please ensure it is a valid text file.');
		} finally {
			uploadingEnv = false;
			dragOver = false;
			if (envFileInput) envFileInput.value = ''; // Reset input
		}
	}

	function handleEnvUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		if (!input.files || input.files.length === 0 || !site) return;
		processEnvFile(input.files[0]);
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		if (!event.dataTransfer?.files || event.dataTransfer.files.length === 0 || !site) return;
		processEnvFile(event.dataTransfer.files[0]);
	}

	function copyDomain() {
		if (!site) return;
		navigator.clipboard.writeText(site.domain);
		copied = true;
		setTimeout(() => copied = false, 2000);
	}

	async function triggerDeploy() {
		if (!site || deploying) return;
		const user = get(currentUser);
		if (!user) return;

		deploying = true;
		try {
			const newDeployId = await createDeployment({
				siteId: site.id,
				siteName: site.name,
				commit: 'manual',
				message: 'Manual deployment',
				branch: site.branch,
				status: 'queued',
				duration: '—',
				triggeredBy: 'dashboard',
				ownerId: user.uid
			});

			// Immediately expand the new deployment row — don't wait for onSnapshot
			expandedDeployId = newDeployId;

			await updateSite(site.id, { status: 'building' });
			activeTab = 'deployments';
		} catch (err) {
			console.error('Failed to trigger deploy:', err);
		} finally {
			deploying = false;
		}
	}

	let canceling = $state(false);
	async function cancelBuild(deployId: string) {
		if (canceling) return;
		canceling = true;
		try {
			await cancelDeployment(deployId);
		} catch (err) {
			console.error('Failed to cancel deployment:', err);
		} finally {
			canceling = false;
		}
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

	function formatDate(date: Date): string {
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	// Simple terminal color parser for keywords
	function parseLogColors(log: string): string {
		if (!log) return '';
		
		// Escape HTML first to prevent injection
		let safeLog = log
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');

		// Then apply color spans based on keywords
		return safeLog
			.replace(/^(.*?(?:ERR|ERROR|failed|Failed).*)$/gm, '<span class="text-red-400">$1</span>')
			.replace(/^(.*?(?:WARN|Warning).*)$/gm, '<span class="text-yellow-400">$1</span>')
			.replace(/^(.*?(?:success|Success|✅).*)$/gm, '<span class="text-green-400">$1</span>')
			.replace(/([0-9]+\.[0-9]+\s*(?:kB|MB|ms|s))/g, '<span class="text-blue-300">$1</span>')
			.replace(/(npm install|bun run build|npm run build|vite|npm audit|npm fund)/g, '<span class="text-purple-400">$1</span>');
	}

	const statusConfig: Record<string, { icon: any; classes: string; dotColor: string; label: string }> = {
		live: { icon: CheckCircle, classes: 'bg-green-50 text-green-700', dotColor: 'bg-green-500', label: 'Live' },
		building: { icon: Loader, classes: 'bg-yellow-50 text-yellow-700', dotColor: 'bg-yellow-500', label: 'Building' },
		failed: { icon: XCircle, classes: 'bg-red-50 text-red-700', dotColor: 'bg-red-500', label: 'Failed' },
		pending: { icon: Clock, classes: 'bg-gray-100 text-gray-600', dotColor: 'bg-gray-400', label: 'Pending' }
	};
</script>

<style>
	/* Custom Terminal Scrollbar */
	.custom-scrollbar::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.2);
	}
	.toast-enter {
		animation: toast-slide-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}
	@keyframes toast-slide-in {
		from { opacity: 0; transform: translateY(1rem) scale(0.95); }
		to   { opacity: 1; transform: translateY(0) scale(1); }
	}
	/* Infinite scanning progress bar animation for the simulated terminal */
	@keyframes progress {
		0% { transform: translateX(-100%); }
		100% { transform: translateX(200%); }
	}
</style>

<svelte:head>
	<title>{site?.name ?? 'Site'} | SyncShip</title>
</svelte:head>

{#if loading}
	<div class="animate-pulse space-y-4">
		<div class="h-6 w-40 bg-gray-200 rounded"></div>
		<div class="h-4 w-64 bg-gray-100 rounded"></div>
		<Card class="p-6 mt-6"><div class="h-32 bg-gray-50 rounded"></div></Card>
	</div>
{:else if !site}
	<div class="text-center py-16">
		<Globe class="mx-auto h-10 w-10 text-gray-300" />
		<h3 class="mt-2 text-sm font-semibold text-gray-900">Site not found</h3>
		<div class="mt-4"><a href="/sites"><Button variant="outline">Back to Sites</Button></a></div>
	</div>
{:else}
	{@const status = statusConfig[site.status] ?? statusConfig['pending']}

	<!-- Header -->
	<div class="mb-6">
		<a href="/sites" class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-3">
			<ArrowLeft class="h-3.5 w-3.5" />
			Back to Sites
		</a>
		<div class="sm:flex sm:items-center sm:justify-between">
			<div class="flex items-center gap-3">
				<div class="rounded-lg bg-gray-100 p-2.5">
					<Globe class="h-5 w-5 text-gray-600" />
				</div>
				<div>
					<div class="flex items-center gap-2">
						<h1 class="text-xl font-bold tracking-tight text-gray-900">{site.name}</h1>
						<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium {status.classes}">
							<status.icon class="h-3 w-3 {site.status === 'building' ? 'animate-spin' : ''}" />
							{status.label}
						</span>
					</div>
					<div class="mt-0.5 flex flex-wrap items-center gap-3 text-sm text-gray-500">
						<button onclick={copyDomain} class="flex items-center gap-1 hover:text-gray-900 transition-colors cursor-pointer">
							{site.domain}
							{#if copied}
								<Check class="h-3 w-3 text-green-600" />
							{:else}
								<Copy class="h-3 w-3" />
							{/if}
						</button>
						
						<!-- DNS Status Indicator -->
						{#if dnsStatus === 'checking'}
							<span class="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">
								<Loader class="h-3 w-3 animate-spin"/> Checking DNS...
							</span>
						{:else if dnsStatus === 'verified'}
							<div class="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200" title="Domain is correctly pointed to your Droplet">
								<CheckCircle class="h-3 w-3" /> DNS Propagated
							</div>
						{:else if dnsStatus === 'unverified'}
							<div class="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200" title={`Domain A Record does not point to ${dropletIp || 'your server'}`}>
								<XCircle class="h-3 w-3" /> DNS Not Propagated
							</div>
						{/if}
					</div>
				</div>
			</div>
			<div class="mt-4 sm:mt-0 flex gap-2">
				<Button variant="outline" onclick={triggerDeploy} disabled={site.status === 'building' || deploying}>
					{#if site.status === 'building' || deploying}
						<Loader class="-ml-0.5 mr-1.5 h-4 w-4 animate-spin" />
						Building...
					{:else if site.status === 'live'}
						<Check class="-ml-0.5 mr-1.5 h-4 w-4 text-green-600" />
						Re-deploy
					{:else}
						<Rocket class="-ml-0.5 mr-1.5 h-4 w-4" />
						Deploy
					{/if}
				</Button>
				<a href={site.domain.startsWith('http') ? site.domain : `https://${site.domain}`} target="_blank" rel="noopener">
					<Button variant="ghost">
						<ExternalLink class="h-4 w-4" />
					</Button>
				</a>
			</div>
		</div>
	</div>

	<!-- Tabs -->
	<div class="border-b border-gray-200 mb-6">
		<nav class="-mb-px flex gap-6">
			{#each [
				{ id: 'overview', label: 'Overview' },
				{ id: 'deployments', label: 'Deployments' },
				{ id: 'settings', label: 'Settings' }
			] as tab}
				<button
					onclick={() => activeTab = tab.id as any}
					class="pb-3 text-sm font-medium transition-colors cursor-pointer border-b-2
						{activeTab === tab.id
							? 'border-gray-900 text-gray-900'
							: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
				>
					{tab.label}
				</button>
			{/each}
		</nav>
	</div>

	<!-- Tab content -->
	{#if activeTab === 'overview'}
		<div class="grid gap-4 lg:grid-cols-2">
			<!-- Site info -->
			<Card class="p-5">
				<h3 class="text-sm font-semibold text-gray-900 mb-3">Site Information</h3>
				<dl class="space-y-2.5 text-sm">
					<div class="flex justify-between">
						<dt class="text-gray-500">Domain</dt>
						<dd class="text-gray-900 font-medium">{site.domain}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-gray-500">Repository</dt>
						<dd class="text-gray-900 font-mono text-xs">{site.repo}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-gray-500">Branch</dt>
						<dd class="flex items-center gap-1 text-gray-900"><GitBranch class="h-3 w-3" />{site.branch}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-gray-500">Build command</dt>
						<dd class="text-gray-900 font-mono text-xs">{site.buildCommand || '—  (static)'}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-gray-500">Output directory</dt>
						<dd class="text-gray-900 font-mono text-xs">{site.outputDir}</dd>
					</div>
				</dl>
			</Card>

			<!-- Timestamps -->
			<Card class="p-5">
				<h3 class="text-sm font-semibold text-gray-900 mb-3">Activity</h3>
				<dl class="space-y-2.5 text-sm">
					<div class="flex justify-between">
						<dt class="text-gray-500">Created</dt>
						<dd class="text-gray-900">{formatDate(site.createdAt)}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-gray-500">Last deploy</dt>
						<dd class="text-gray-900">{site.lastDeployAt ? formatDate(site.lastDeployAt) : 'Never'}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-gray-500">Total deployments</dt>
						<dd class="text-gray-900 font-medium">{deployments.length}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-gray-500">Status</dt>
						<dd>
							<span class="inline-flex items-center gap-1.5">
								<span class="h-2 w-2 rounded-full {status.dotColor}"></span>
								{status.label}
							</span>
						</dd>
					</div>
				</dl>
			</Card>
		</div>

		<!-- Recent deployments preview -->
		{#if deployments.length > 0}
			<div class="mt-6">
				<div class="flex items-center justify-between mb-3">
					<h3 class="text-sm font-semibold text-gray-900">Recent Deployments</h3>
					<button onclick={() => activeTab = 'deployments'} class="text-xs text-gray-500 hover:text-gray-900 cursor-pointer">View all →</button>
				</div>
				<Card class="overflow-hidden">
				<div class="divide-y divide-gray-100">
					{#each deployments.slice(0, 3) as deploy}
						{@const dStatus = deploy.status === 'success' ? 'bg-green-500' : deploy.status === 'failed' ? 'bg-red-500' : deploy.status === 'building' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}
						{@const isExpanded = expandedDeployId === deploy.id}
						<div>
							<button
								onclick={() => expandedDeployId = isExpanded ? null : deploy.id}
								class="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer text-left"
							>
								<div class="flex items-center gap-3">
									<span class="h-2 w-2 rounded-full {dStatus}"></span>
									<code class="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded font-mono">{deploy.commit.slice(0, 7)}</code>
									<span class="text-sm text-gray-500 truncate max-w-[200px]">{deploy.message}</span>
								</div>
								<div class="flex items-center gap-3 text-xs text-gray-400">
									<span class="font-mono">{deploy.duration}</span>
									<span>{timeAgo(deploy.createdAt)}</span>
									<ChevronDown class="h-3.5 w-3.5 transition-transform {isExpanded ? 'rotate-180' : ''}" />
								</div>
							</button>
							{#if (deploy.status === 'building' || deploy.status === 'queued')}
								<button
									onclick={(e) => { e.stopPropagation(); cancelBuild(deploy.id); }}
									disabled={canceling}
									class="w-full flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 border-t border-gray-100 transition-colors {canceling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
								>
									<X class="h-3 w-3" /> {canceling ? 'Canceling...' : 'Cancel build'}
								</button>
							{/if}
							{#if isExpanded}
								<div class="px-4 pb-3">
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
										<div 
											class="rounded-md bg-[#1e1e1e] p-4 overflow-x-auto overflow-y-auto relative max-h-[400px] border border-gray-800 shadow-inner custom-scrollbar"
											bind:this={logContainer}
										>
											<div class="flex items-center gap-2 mb-3 pb-2 border-b border-gray-800/50 sticky top-0 bg-[#1e1e1e]/90 backdrop-blur-sm">
												<div class="flex gap-1.5">
													<div class="w-3 h-3 rounded-full bg-red-500/80"></div>
													<div class="w-3 h-3 rounded-full bg-yellow-500/80"></div>
													<div class="w-3 h-3 rounded-full bg-green-500/80"></div>
												</div>
												<span class="text-[10px] font-mono text-gray-500 uppercase tracking-wider ml-2">Terminal Output</span>
											</div>
											<pre class="text-[13px] leading-relaxed font-mono text-gray-300 whitespace-pre-wrap font-medium">{@html parseLogColors(deploy.buildLog)}</pre>
											{#if deploy.status === 'building' || deploy.status === 'queued'}
												<div class="mt-4 flex items-center gap-2 text-xs text-yellow-500/90 font-mono animate-pulse bg-yellow-500/10 inline-flex px-2 py-1 rounded">
													<Loader class="h-3 w-3 animate-spin" />
													<span>Streaming live logs...</span>
												</div>
											{/if}
										</div>
									{:else if deploy.status === 'building' || deploy.status === 'queued'}
										<div class="rounded-md bg-[#1e1e1e] p-6 border border-gray-800 shadow-inner relative overflow-hidden">
											<div class="flex items-center gap-2 mb-4 pb-2 border-b border-gray-800/50">
												<div class="flex gap-1.5">
													<div class="w-3 h-3 rounded-full bg-red-500/50"></div>
													<div class="w-3 h-3 rounded-full bg-yellow-500/50"></div>
													<div class="w-3 h-3 rounded-full bg-green-500/50"></div>
												</div>
												<span class="text-[10px] font-mono text-gray-500 uppercase tracking-wider ml-2">Secure Build Environment</span>
											</div>
											
											<!-- Simulated Terminal Area -->
											<div class="font-mono text-[13px] leading-relaxed relative z-10">
												<div class="flex items-center text-gray-500 mb-2">
													<span class="text-green-500 mr-2">➜</span>
													<span class="text-blue-400 mr-2">~</span>
													<span class="text-gray-400">Initializing secure container...</span>
												</div>
												
												<div class="flex items-center text-gray-300 animate-pulse">
													<span class="text-purple-400 mr-2">⚡</span>
													<span>{simulatedBuildSteps[simulatedStepIndex]}</span>
													<span class="ml-1 inline-block w-2h-3 bg-gray-400 animate-pulse">_</span>
												</div>

												<!-- Indeterminate sleek progress bar -->
												<div class="mt-6 w-full h-1 bg-gray-800 rounded-full overflow-hidden">
													<div class="h-full bg-gradient-to-r from-transparent via-blue-500 to-purple-500 w-1/2 animate-[progress_1.5s_ease-in-out_infinite_alternate]"></div>
												</div>
											</div>
											
											<!-- Background ambient glow -->
											<div class="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none"></div>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</Card>
			</div>
		{/if}

	{:else if activeTab === 'deployments'}
		{#if deployments.length === 0}
			<Card class="p-8 text-center">
				<Rocket class="mx-auto h-10 w-10 text-gray-300" />
				<h3 class="mt-2 text-sm font-semibold text-gray-900">No deployments yet</h3>
				<p class="mt-1 text-sm text-gray-500">Deployments will appear here after your first push.</p>
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
											<code class="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded font-mono">{deploy.commit.slice(0, 7)}</code>
											<span class="text-sm font-medium text-gray-900">{deploy.message}</span>
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
							<div 
								class="rounded-md bg-[#1e1e1e] p-4 overflow-x-auto overflow-y-auto relative max-h-[400px] border border-gray-800 shadow-inner custom-scrollbar"
								bind:this={logContainer}
							>
								<div class="flex items-center gap-2 mb-3 pb-2 border-b border-gray-800/50 sticky top-0 bg-[#1e1e1e]/90 backdrop-blur-sm">
									<div class="flex gap-1.5">
										<div class="w-3 h-3 rounded-full bg-red-500/80"></div>
										<div class="w-3 h-3 rounded-full bg-yellow-500/80"></div>
										<div class="w-3 h-3 rounded-full bg-green-500/80"></div>
									</div>
									<span class="text-[10px] font-mono text-gray-500 uppercase tracking-wider ml-2">Terminal Output</span>
								</div>
								<pre class="text-[13px] leading-relaxed font-mono text-gray-300 whitespace-pre-wrap font-medium">{@html parseLogColors(deploy.buildLog)}</pre>
								{#if deploy.status === 'building' || deploy.status === 'queued'}
									<div class="mt-4 flex items-center gap-2 text-xs text-yellow-500/90 font-mono animate-pulse bg-yellow-500/10 inline-flex px-2 py-1 rounded">
										<Loader class="h-3 w-3 animate-spin" />
										<span>Streaming live logs...</span>
									</div>
								{/if}
							</div>
						{:else if deploy.status === 'building' || deploy.status === 'queued'}
							<div class="rounded-md bg-[#1e1e1e] p-6 border border-gray-800 shadow-inner relative overflow-hidden">
								<div class="flex items-center gap-2 mb-4 pb-2 border-b border-gray-800/50">
									<div class="flex gap-1.5">
										<div class="w-3 h-3 rounded-full bg-red-500/50"></div>
										<div class="w-3 h-3 rounded-full bg-yellow-500/50"></div>
										<div class="w-3 h-3 rounded-full bg-green-500/50"></div>
									</div>
									<span class="text-[10px] font-mono text-gray-500 uppercase tracking-wider ml-2">Secure Build Environment</span>
								</div>
								
								<!-- Simulated Terminal Area -->
								<div class="font-mono text-[13px] leading-relaxed relative z-10">
									<div class="flex items-center text-gray-500 mb-2">
										<span class="text-green-500 mr-2">➜</span>
										<span class="text-blue-400 mr-2">~</span>
										<span class="text-gray-400">Initializing secure container...</span>
									</div>
									
									<div class="flex items-center text-gray-300 animate-pulse">
										<span class="text-purple-400 mr-2">⚡</span>
										<span>{simulatedBuildSteps[simulatedStepIndex]}</span>
										<span class="ml-1 inline-block w-2h-3 bg-gray-400 animate-pulse">_</span>
									</div>

									<!-- Indeterminate sleek progress bar -->
									<div class="mt-6 w-full h-1 bg-gray-800 rounded-full overflow-hidden">
										<div class="h-full bg-gradient-to-r from-transparent via-blue-500 to-purple-500 w-1/2 animate-[progress_1.5s_ease-in-out_infinite_alternate]"></div>
									</div>
								</div>
								
								<!-- Background ambient glow -->
								<div class="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none"></div>
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

	{:else if activeTab === 'settings'}
		<!-- Edit site settings -->
		<Card class="p-5">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-sm font-semibold text-gray-900">Site Configuration</h3>
				{#if !editing}
					<Button variant="outline" size="sm" onclick={startEditing}>
						<Settings class="h-3.5 w-3.5 mr-1" />Edit
					</Button>
				{/if}
			</div>

			{#if editing}
				<div class="space-y-3 max-w-lg">
					<Input label="Site name" bind:value={editName} />
					<Input label="Domain" bind:value={editDomain} />
					<Input label="Repository" bind:value={editRepo} />
					<div class="grid grid-cols-2 gap-3">
						<Input label="Branch" bind:value={editBranch} />
						<Input label="Output directory" bind:value={editOutputDir} />
					</div>
					<Input label="Build command" placeholder="Leave empty for static sites" bind:value={editBuildCommand} />
					<div class="flex gap-2 pt-2">
						<Button onclick={saveEdits} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
						<Button variant="outline" onclick={() => editing = false}>Cancel</Button>
					</div>
				</div>
			{:else}
				<dl class="space-y-2.5 text-sm max-w-lg">
					<div class="flex justify-between"><dt class="text-gray-500">Name</dt><dd class="text-gray-900">{site.name}</dd></div>
					<div class="flex justify-between"><dt class="text-gray-500">Domain</dt><dd class="text-gray-900">{site.domain}</dd></div>
					<div class="flex justify-between"><dt class="text-gray-500">Repository</dt><dd class="text-gray-900 font-mono text-xs">{site.repo}</dd></div>
					<div class="flex justify-between"><dt class="text-gray-500">Branch</dt><dd class="text-gray-900">{site.branch}</dd></div>
					<div class="flex justify-between"><dt class="text-gray-500">Build command</dt><dd class="text-gray-900 font-mono text-xs">{site.buildCommand || '— (static)'}</dd></div>
					<div class="flex justify-between"><dt class="text-gray-500">Output dir</dt><dd class="text-gray-900 font-mono text-xs">{site.outputDir}</dd></div>
				</dl>
			{/if}
		</Card>

		<!-- Environment Variables -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div 
			class="mt-4 rounded-xl border-2 transition-all duration-200 {dragOver ? 'border-blue-400 bg-blue-50 border-dashed' : 'border-transparent'}"
			ondragover={(e) => { e.preventDefault(); dragOver = true; }}
			ondragleave={(e) => {
				// Only reset dragOver if leaving the main container
				if (e.currentTarget === e.target) dragOver = false;
			}}
			ondrop={handleDrop}
		>
			<Card class="relative w-full h-full overflow-hidden {dragOver ? 'border-transparent shadow-none' : ''}">
				<!-- Drag overlay -->
				{#if dragOver}
					<div class="absolute inset-0 bg-blue-50/90 z-10 flex flex-col items-center justify-center pointer-events-none">
						<Upload class="h-8 w-8 text-blue-500 mb-2 animate-bounce" />
						<p class="text-sm font-semibold text-blue-900">Drop your .env file here</p>
						<p class="text-xs text-blue-600 mt-1">We'll securely parse and save it.</p>
					</div>
				{/if}

				<div class="p-5 {dragOver ? 'opacity-30' : 'opacity-100'} transition-opacity">
					<div class="flex items-center gap-2 mb-1">
						<FileText class="h-4 w-4 text-gray-500" />
						<h3 class="text-sm font-semibold text-gray-900">Environment Variables</h3>
					</div>
					
					<div class="flex items-center justify-between mt-4">
						<div>
							{#if site.envVars}
								<div class="flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-md w-fit">
									<CheckCircle class="h-3.5 w-3.5" />
									<p class="text-sm font-medium">Environment variables active</p>
								</div>
								<p class="text-xs text-gray-500 mt-1.5">
									Securely stored. These will be injected as a .env file during deployment.
								</p>
							{:else}
								<p class="text-sm text-gray-500">No environment variables configured.</p>
								<p class="text-xs text-gray-400 mt-1">
									Upload a .env file to inject variables during deployment.
								</p>
							{/if}
						</div>
						
						<div>
							<input type="file" accept=".env,text/plain" bind:this={envFileInput} class="hidden" onchange={handleEnvUpload} />
							<Button 
								variant={site.envVars ? 'outline' : 'primary'} 
								size="sm" 
								onclick={() => envFileInput?.click()} 
								disabled={uploadingEnv}
							>
								{#if uploadingEnv}
									<Loader class="h-3.5 w-3.5 mr-1.5 animate-spin" /> Uploading...
								{:else if site.envVars}
									<Upload class="h-3.5 w-3.5 mr-1.5 text-gray-400" /> Replace .env
								{:else}
									<Upload class="h-3.5 w-3.5 mr-1.5" /> Upload .env
								{/if}
							</Button>
						</div>
					</div>
				</div>
			</Card>
		</div>

		<!-- Danger zone -->
		<Card class="p-5 mt-4 border-red-200">
			<h3 class="text-sm font-semibold text-red-600 mb-1">Danger Zone</h3>
			<p class="text-sm text-gray-500 mb-3">Permanently delete this site and all its deployment history.</p>

			{#if showDeleteConfirm}
				<div class="space-y-3 max-w-sm">
					<p class="text-sm text-gray-700">
						Type <strong class="font-mono text-red-600">{site.name}</strong> to confirm:
					</p>
					<Input bind:value={deleteConfirmText} placeholder={site.name} />
					<div class="flex gap-2">
						<Button variant="danger" onclick={handleDelete} disabled={deleting || deleteConfirmText !== site.name}>
							{deleting ? 'Deleting...' : 'Delete Forever'}
						</Button>
						<Button variant="outline" onclick={() => { showDeleteConfirm = false; deleteConfirmText = ''; }}>
							Cancel
						</Button>
					</div>
				</div>
			{:else}
				<Button variant="danger" onclick={() => showDeleteConfirm = true}>
					<Trash2 class="h-3.5 w-3.5 mr-1" />
					Delete Site
				</Button>
			{/if}
		</Card>
	{/if}
{/if}

{#if showSuccessToast}
	<div class="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-gray-900 border border-green-500/40 px-5 py-4 shadow-2xl shadow-green-500/10 toast-enter">
		<div class="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/20 ring-1 ring-green-500/40">
			<svg class="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
			</svg>
		</div>
		<div>
			<p class="text-sm font-semibold text-white">Deployment Successful! 🎉</p>
			<p class="text-xs text-gray-400 mt-0.5">Your site is live and up to date.</p>
		</div>
	</div>
{/if}

