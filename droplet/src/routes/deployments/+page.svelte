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
	let logContainer = $state<HTMLElement | null>(null);
	let unsub: (() => void) | null = null;

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

	function parseLogColors(log: string): string {
		if (!log) return '';
		let safe = log
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;').replace(/'/g, '&#039;');
		return safe
			.replace(/^(.*?(?:ERR|ERROR|failed|Failed).*)$/gm, '<span class="text-red-400">$1</span>')
			.replace(/^(.*?(?:WARN|Warning).*)$/gm, '<span class="text-yellow-400">$1</span>')
			.replace(/^(.*?(?:success|Success|✅).*)$/gm, '<span class="text-green-400">$1</span>')
			.replace(/([0-9]+\.[0-9]+\s*(?:kB|MB|ms|s))/g, '<span class="text-blue-300">$1</span>')
			.replace(/(npm install|bun run build|npm run build|vite)/g, '<span class="text-purple-400">$1</span>');
	}

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
							class="w-full flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer text-left gap-3 sm:gap-0"
						>
							<div class="flex items-start sm:items-center gap-3">
								<span class="mt-1.5 sm:mt-0 h-2 w-2 shrink-0 rounded-full {dStatus}"></span>
								<div class="min-w-0">
									<div class="flex flex-wrap items-center gap-2">
										<span class="text-sm font-medium text-gray-900 truncate">{deploy.siteName}</span>
										<code class="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded font-mono shrink-0">{deploy.commit.slice(0, 7)}</code>
										<span class="text-sm text-gray-500 truncate max-w-[200px]">{deploy.message}</span>
									</div>
									<p class="mt-0.5 text-xs text-gray-400 truncate">
										{deploy.triggeredBy} · {deploy.branch}
									</p>
								</div>
							</div>
							<div class="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pl-5 sm:pl-0">
								<div class="text-left sm:text-right">
									<p class="text-sm font-mono text-gray-500">{deploy.duration}</p>
									<p class="text-xs text-gray-400">{timeAgo(deploy.createdAt)}</p>
								</div>
								<ChevronDown class="h-4 w-4 shrink-0 text-gray-400 transition-transform {isExpanded ? 'rotate-180' : ''}" />
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
	/* Infinite scanning progress bar animation for the simulated terminal */
	@keyframes progress {
		0% { transform: translateX(-100%); }
		100% { transform: translateX(200%); }
	}
</style>
