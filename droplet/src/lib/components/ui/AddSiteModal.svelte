<script lang="ts">
	import { X, Globe, AlertCircle, RefreshCw, Key, Search, Check, Github, ChevronDown } from 'lucide-svelte';
	import Button from './Button.svelte';
	import Input from './Input.svelte';
	import Card from './Card.svelte';
	import { createSite, getSites } from '$lib/firebase/services/sites';
	import { canCreateSite } from '$lib/firebase/services/payments';
	import { currentUser } from '$lib/stores/auth';
	import { updateUserGithubToken } from '$lib/firebase/services/users';
	import { get } from 'svelte/store';
	import { untrack } from 'svelte';

	interface Props {
		open: boolean;
		onclose: () => void;
		oncreated?: () => void;
	}

	let { open = $bindable(false), onclose, oncreated }: Props = $props();

	let name = $state('');
	let domain = $state('');
	let repo = $state('');
	let branch = $state('main');
	let projectType = $state<'static' | 'build' | 'backend'>('static');
	let buildCommand = $state('npm run build');
	let outputDir = $state('.');
	let startCommand = $state('node dist/index.js');
	let loading = $state(false);
	let error = $state('');

	// GitHub Integration State
	let repoType = $state<'public' | 'private'>('public');
	let savedGithubToken = $state('');
	let githubTokenInput = $state('');
	let isSavingToken = $state(false);
	let detecting = $state(false);
	let detectionSuccess = $state(false);
	let showConfiguration = $state(false);
	let detectedEnvKeys = $state<string[]>([]);
	let isMonorepo = $state(false);
	let monorepoApps = $state<any[]>([]);
	let selectedAppPath = $state('');

	// Private Repo Search State
	let privateRepos = $state<Array<{id: string, name: string, private: boolean}>>([]);
	let loadingRepos = $state(false);
	let repoSearchQuery = $state('');

	let filteredRepos = $derived(
		privateRepos.filter(r => r.name.toLowerCase().includes(repoSearchQuery.toLowerCase()))
	);
	
	// Limit state
	let overLimit = $state(false);
	let limitMessage = $state('');

	// Update defaults manually if project type changes.
	// We only run this if NOT heavily relying on auto-detect to avoid wiping it.
	function handleProjectTypeChange(type: 'static' | 'build' | 'backend') {
		projectType = type;
		if (projectType === 'static') {
			outputDir = '.';
			buildCommand = '';
			startCommand = '';
		} else if (projectType === 'build') {
			outputDir = 'dist';
			buildCommand = 'npm run build';
			startCommand = '';
		} else {
			outputDir = '.';
			buildCommand = 'npm run build';
			startCommand = 'node dist/index.js';
		}
	}

	// Check limits and token when modal opens
	$effect(() => {
		if (open) {
			untrack(() => {
				const user = get(currentUser);
				if (user) {
					checkLimits(user.uid);
					// Set from profile
					savedGithubToken = user.githubToken || '';
					githubTokenInput = savedGithubToken;
					if (savedGithubToken && repoType === 'private') {
						fetchPrivateRepos();
					}
				}
				resetForm();
			});
		}
	});

	// Fetch repos when switching to private tab if we have a token
	$effect(() => {
		if (repoType === 'private') {
			untrack(() => {
				if (savedGithubToken && privateRepos.length === 0) {
					fetchPrivateRepos();
				}
			});
		}
	});

	function resetForm() {
        name = ''; domain = ''; repo = ''; branch = 'main';
        projectType = 'static'; buildCommand = ''; outputDir = '.';
        startCommand = ''; error = ''; detectedEnvKeys = [];
		repoSearchQuery = '';
		showConfiguration = false;
		detectionSuccess = false;
		isMonorepo = false;
		monorepoApps = [];
		selectedAppPath = '';
	}

	async function checkLimits(uid: string) {
		const sites = await getSites(uid);
		const { allowed, message } = await canCreateSite(uid, sites.length);
		overLimit = !allowed;
		limitMessage = message || '';
	}

	async function saveGithubToken() {
		if (!githubTokenInput.trim()) return;
		isSavingToken = true;
		error = '';
		try {
			const user = get(currentUser);
			if (user) {
				await updateUserGithubToken(user.uid, githubTokenInput.trim());
				savedGithubToken = githubTokenInput.trim();
				await fetchPrivateRepos();
			}
		} catch (err: any) {
			error = 'Failed to save token: ' + err.message;
		} finally {
			isSavingToken = false;
		}
	}

	async function fetchPrivateRepos() {
		loadingRepos = true;
		error = '';
		try {
			const user = get(currentUser);
			const token = await user?.getIdToken();
			const res = await fetch('/api/github/repos', {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to fetch repositories');
			}
			const data = await res.json();
			console.log('Fetched private repos:', data.length);
			privateRepos = data;
		} catch (err: any) {
			error = err.message;
			// If unauthorized/invalid token, maybe clear it
			if (err.message.includes('Token is invalid')) {
				savedGithubToken = '';
				githubTokenInput = '';
			}
		} finally {
			loadingRepos = false;
		}
	}

	let detectTimeout: ReturnType<typeof setTimeout>;

	function handlePublicRepoInput() {
		clearTimeout(detectTimeout);
		if (repo.trim() !== '') {
			detectTimeout = setTimeout(() => detectRepository(), 1000);
		} else {
			showConfiguration = false;
		}
	}

	function selectPrivateRepo(selectedRepo: string) {
		repo = selectedRepo;
		repoSearchQuery = selectedRepo;
		detectRepository();
	}

	async function detectRepository() {
		if (!repo.trim()) {
			showConfiguration = false;
			return;
		}
		
		detecting = true;
		error = '';
		detectedEnvKeys = [];
		detectionSuccess = false;
		showConfiguration = false;
		isMonorepo = false;
		monorepoApps = [];
		selectedAppPath = '';

		try {
			const user = get(currentUser);
			const token = await user?.getIdToken();
			
			const res = await fetch('/api/github/detect', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': token ? `Bearer ${token}` : ''
				},
				body: JSON.stringify({ 
					repo: repo.trim(),
					requireAuth: repoType === 'private'
				})
			});

			const data = await res.json();

			if (!res.ok) {
				if (data.needsAuth && repoType === 'public') {
					error = "This repository seems to be private. Please switch to the 'Private Repo' tab.";
					repoType = 'private'; // Auto-switch
				} else {
					throw new Error(data.error || 'Failed to analyze repository');
				}
				showConfiguration = true;
				return;
			}

			// Apply detected settings
			projectType = data.projectType;
			buildCommand = data.buildCommand;
			outputDir = data.outputDir;
			startCommand = data.startCommand;
			detectedEnvKeys = data.envKeys || [];
			
			// Optional: auto-fill name based on repo if empty
			if (!name && repo.includes('/')) {
				name = repo.split('/')[1].toLowerCase().replace(/[^a-z0-9-]/g, '-');
			}

			// Capture monorepo data
			isMonorepo = data.isMonorepo || false;
			monorepoApps = data.monorepoApps || [];
			selectedAppPath = ''; // Reset selection

			detectionSuccess = true;
			showConfiguration = true;

		} catch (err: any) {
			console.warn("Detection failed (it's okay, user can fill manually):", err);
			// We don't loudly error here to not block the user, just log it.
			// error = err.message; 
			detectionSuccess = false;
			showConfiguration = true;
		} finally {
			detecting = false;
		}
	}

	function handleAppSelection() {
		const app = monorepoApps.find(a => a.path === selectedAppPath);
		if (app) {
			console.log('Selected app from monorepo:', app);
			projectType = app.projectType as 'static' | 'build' | 'backend';
			buildCommand = app.buildCommand || '';
			outputDir = app.outputDir || '.';
			startCommand = app.startCommand || '';
			
			// Always suggest name based on app name
			const repoName = repo.includes('/') ? repo.split('/')[1] : repo;
			name = `${repoName}-${app.name}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (overLimit) return;
		error = '';

		if (!name.trim()) { error = 'Site name is required'; return; }
		if (!domain.trim()) { error = 'Domain is required'; return; }
		if (!repo.trim()) { error = 'Repository is required'; return; }

		const user = get(currentUser);
		if (!user) { error = 'You must be logged in'; return; }

		loading = true;
		try {
			// Extract env vars dynamically based on detected keys
			// Assuming we add a way to collect them in the UI later, for now we just create the site
			// If we wanted to, we could map inputs bound to `detectedEnvKeys` here.

			await createSite({
				name: name.trim(),
				domain: domain.trim(),
				repo: repo.trim(),
				branch: branch.trim() || 'main',
				siteType: projectType === 'backend' ? 'backend' : 'static',
				isPrivate: repoType === 'private',
				buildCommand: projectType === 'static' ? '' : (buildCommand.trim() || 'npm run build'),
				outputDir: projectType === 'backend' ? '.' : (outputDir.trim() || (projectType === 'static' ? '.' : 'dist')),
				startCommand: projectType === 'backend' ? (startCommand.trim() || 'node dist/index.js') : undefined,
				ownerId: user.uid
			});
			open = false;
			oncreated?.();
		} catch (err: any) {
			error = err.message || 'Failed to create site';
		} finally {
			loading = false;
		}
	}

	function handleBackdrop(e: MouseEvent) {
		// Removed backdrop click closing as per user request
	}

	function handleKeydown(e: KeyboardEvent) {
		// Removed escape key closing as per user request
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 sm:p-0"
		onclick={handleBackdrop}
	>
		<div class="relative w-full max-w-2xl mx-auto rounded-xl border border-gray-200 bg-white shadow-2xl max-h-[95vh] flex flex-col">
			
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
				<div class="flex items-center gap-2">
					<Globe class="h-5 w-5 text-gray-600" />
					<h2 class="text-base font-semibold text-gray-900">Deploy New Site</h2>
				</div>
				<button
					type="button"
					onclick={() => { open = false; onclose?.(); }}
					class="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer rounded-full p-1 hover:bg-gray-100"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<!-- Scrollable Body -->
			<div class="overflow-y-auto overflow-x-hidden flex-1 p-6">
				
				{#if overLimit}
					<div class="rounded-lg bg-indigo-50 border border-indigo-100 p-4 mb-6">
						<div class="flex items-start gap-3">
							<AlertCircle class="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
							<div>
								<p class="text-sm font-bold text-indigo-900">{limitMessage}</p>
								<p class="text-xs text-indigo-600 mt-1">Upgrade now to unlock unlimited sites and professional features.</p>
								<a href="https://buy.polar.sh/polar_cl_wI21HXqPa8S1S3W6Y9lBK0cuwU0gNfPdjUb9l4HgmLO?customer_email={$currentUser?.email || ''}" target="_blank" rel="noopener noreferrer" class="inline-block mt-3 text-xs font-bold text-white bg-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors">
									Upgrade for $2
								</a>
							</div>
						</div>
					</div>
				{/if}

				{#if error}
					<div class="rounded-lg bg-red-50 border border-red-200 p-3 mb-6 flex items-start gap-2">
						<AlertCircle class="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
						<p class="text-sm text-red-700">{error}</p>
					</div>
				{/if}

				<form id="add-site-form" onsubmit={handleSubmit} class="space-y-8">
					
					<!-- Step 1: Repository Source -->
					<div class="space-y-4">
						<div class="flex items-center gap-2 border-b border-gray-200 pb-2">
							<span class="flex items-center justify-center w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold">1</span>
							<h3 class="text-sm font-semibold text-gray-900">Source Repository</h3>
						</div>

						<!-- Tabs -->
						<div class="flex p-1 space-x-1 bg-gray-100/80 rounded-lg">
							<button type="button" 
								onclick={() => repoType = 'public'} 
								class="w-full rounded-md py-1.5 text-sm font-medium transition-all {repoType === 'public' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
							>
								Public Repository
							</button>
							<button type="button" 
								onclick={() => repoType = 'private'} 
								class="w-full rounded-md py-1.5 text-sm font-medium transition-all flex items-center justify-center gap-1.5 {repoType === 'private' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
							>
								<Key class="h-3 w-3" />
								Private Repository
							</button>
						</div>

						<!-- Repository Input Area -->
						<div class="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
							
							{#if repoType === 'public'}
								<div class="space-y-3">
									<label class="block text-sm font-medium text-gray-700">GitHub Repository URL or Name</label>
									<div class="relative">
										<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
											<Github class="h-4 w-4 text-gray-400" />
										</div>
										<input 
											type="text" 
											placeholder="e.g. sveltejs/kit or https://github.com/..." 
											bind:value={repo}
											oninput={handlePublicRepoInput}
											class="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm custom-input"
											disabled={loading || overLimit}
										/>
										{#if detecting}
											<div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
												<RefreshCw class="h-4 w-4 text-blue-500 animate-spin" />
											</div>
										{/if}
									</div>
									<p class="text-xs text-gray-500 mt-1">Must be publicly accessible. SyncShip will automatically detect your framework.</p>
								</div>

							{:else}
								<!-- Private Repo Flow -->
								{#if !savedGithubToken}
									<div class="space-y-4">
										<div class="bg-amber-50 rounded-lg p-3 border border-amber-100 flex gap-3">
											<Key class="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
											<div>
												<p class="text-sm font-semibold text-amber-900">Personal Access Token Required</p>
												<p class="text-xs text-amber-800 mt-1 leading-relaxed">
													To deploy private repositories, you must provide a GitHub Personal Access Token (classic). 
													<br /><br />
													<strong>Important:</strong> You must check the entire <code class="bg-amber-200/60 px-1.5 py-0.5 rounded text-amber-900 border border-amber-300/50">repo</code> scope box when generating the token so SyncShip can access your code.
												</p>
												<a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" class="text-xs font-bold text-amber-900 hover:text-amber-700 underline underline-offset-2 mt-3 flex items-center gap-1 w-fit">Generate a Token on GitHub &rarr;</a>
											</div>
										</div>
										<div class="flex gap-2">
											<div class="flex-1">
												<Input type="password" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" bind:value={githubTokenInput} />
											</div>
											<Button onclick={saveGithubToken} disabled={isSavingToken || !githubTokenInput}>
												{isSavingToken ? 'Saving...' : 'Save & Connect'}
											</Button>
										</div>
									</div>
								{:else}
									<div class="space-y-3 relative">
										<div class="flex justify-between items-center">
											<label class="block text-sm font-medium text-gray-700">Select Private Repository</label>
											<button type="button" onclick={() => savedGithubToken = ''} class="text-xs text-gray-500 hover:text-gray-700 underline">Change Token</button>
										</div>

										<div class="relative mb-2">
											<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
												<Search class="h-4 w-4 text-gray-400" />
											</div>
											<input 
												type="text" 
												placeholder="Search {privateRepos.length > 0 ? privateRepos.length : ''} repositories..." 
												bind:value={repoSearchQuery}
												class="block w-full rounded-md border-0 py-2 pl-10 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
											/>
											{#if detecting || loadingRepos}
												<div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
													<RefreshCw class="h-4 w-4 text-blue-500 animate-spin" />
												</div>
											{/if}
										</div>

										<!-- Inline Scrollable List -->
										{#if privateRepos.length > 0}
											<div class="w-full bg-white border border-gray-200 shadow-inner max-h-60 rounded-md py-1 text-base overflow-y-auto sm:text-sm">
												{#each filteredRepos as r}
													<button type="button" class="group w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0" onclick={() => selectPrivateRepo(r.name)}>
														<div class="flex items-center gap-2 overflow-hidden">
															<Github class="h-3.5 w-3.5 text-gray-400 shrink-0" />
															<span class="truncate block text-left text-gray-900 font-medium">{r.name}</span>
														</div>
														<div class="flex items-center">
															{#if repo === r.name}
																<span class="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
																	<Check class="h-3 w-3" /> Selected
																</span>
															{/if}
														</div>
													</button>
												{:else}
													<div class="px-4 py-6 text-center text-sm text-gray-500">No repositories matching "{repoSearchQuery}" found.</div>
												{/each}
											</div>
										{:else if savedGithubToken && !loadingRepos && privateRepos.length === 0}
											<div class="w-full bg-amber-50 border border-amber-200 rounded-md p-4 text-center mt-2">
												<p class="text-sm font-semibold text-amber-900 mb-1">No repositories found.</p>
												<p class="text-xs text-amber-800">
													This usually means your token does not have the <strong>repo</strong> scope selected, or it is a fine-grained token without access explicitly granted. 
													<br />
													<button type="button" class="underline hover:text-amber-600 font-medium mt-2" onclick={fetchPrivateRepos}>Retry Fetch</button>
												</p>
											</div>
										{/if}

										{#if repo}
											<div class="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded border border-green-100">
												<Check class="h-4 w-4" />
												Selected: <span class="font-bold">{repo}</span>
											</div>
										{/if}
									</div>
								{/if}
							{/if}
						</div>
					</div>

					<!-- Step 2: Deployment Config -->
					{#if showConfiguration}
					<div class="space-y-4 pt-6 border-t border-gray-100">
						<div class="flex items-center gap-2 border-b border-gray-200 pb-2">
							<span class="flex items-center justify-center w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold">2</span>
							<h3 class="text-sm font-semibold text-gray-900">Configuration</h3>
						</div>

						{#if isMonorepo && monorepoApps.length > 0}
							<div class="bg-indigo-50 border border-indigo-200 p-4 rounded-xl shadow-sm mt-3 mb-5">
								<div class="flex gap-3 mb-3">
									<Check class="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
									<div>
										<h4 class="text-sm font-bold text-indigo-900">Monorepo Detected</h4>
										<p class="text-sm text-indigo-800 mt-1 leading-relaxed">
											SyncShip found multiple apps inside this repository. Please select which app you want to deploy.
										</p>
									</div>
								</div>
								
								<div class="ml-8">
									<label for="appSelect" class="block text-xs font-semibold text-indigo-900 mb-1.5 uppercase tracking-wide">Select App to Deploy</label>
									<div class="relative">
										<select 
											id="appSelect"
											bind:value={selectedAppPath}
											onchange={handleAppSelection}
											class="w-full bg-white border border-indigo-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 appearance-none pr-8 font-medium shadow-sm transition-shadow hover:shadow"
										>
											<option value="" disabled selected>— Choose an application —</option>
											{#each monorepoApps as app}
												<option value={app.path}>{app.name} ({app.path})</option>
											{/each}
										</select>
										<ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-500 pointer-events-none" />
									</div>
								</div>
							</div>
						{:else if detectionSuccess}
							<div class="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex gap-3 shadow-sm mt-3 mb-5">
								<Check class="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
								<div>
									<h4 class="text-sm font-bold text-emerald-900">Analysis Complete</h4>
									<p class="text-sm text-emerald-800 mt-1 leading-relaxed">
										SyncShip automatically detected a <strong>{projectType === 'build' ? 'Framework/Build' : projectType === 'backend' ? 'Server/API' : 'Static'}</strong> project in your repository and pre-filled the recommended build settings.
									</p>
									<p class="text-xs text-emerald-700 mt-3 font-medium">Please review these settings and fill in any required fields like your <strong>Domain</strong>.</p>
								</div>
							</div>
						{:else}
							<div class="bg-blue-50 border border-blue-200 p-4 rounded-xl flex gap-3 shadow-sm mt-3 mb-5">
								<AlertCircle class="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
								<div>
									<h4 class="text-sm font-bold text-blue-900">Manual Configuration Required</h4>
									<p class="text-sm text-blue-800 mt-1 leading-relaxed">
										We couldn't automatically detect your framework. Please select the correct project type and configure your build commands below manually.
									</p>
								</div>
							</div>
						{/if}

						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<Input label="Site Name (Internal)" placeholder="acme-marketing" required bind:value={name} disabled={loading || overLimit} />
							<Input label="Domain" placeholder="acme.com" required bind:value={domain} disabled={loading || overLimit} />
						</div>

						<!-- Project type selector -->
						<div class="pt-2">
							<div class="flex justify-between items-center mb-3">
								<p class="text-xs font-medium text-gray-500 uppercase tracking-wider">Project Type</p>
								{#if detecting}
									<span class="text-xs text-blue-600 flex items-center gap-1 animate-pulse"><RefreshCw class="w-3 h-3 animate-spin"/> Auto-detecting...</span>
								{/if}
							</div>
							<div class="grid grid-cols-3 gap-2">
								<button
									type="button"
									onclick={() => handleProjectTypeChange('static')}
									disabled={loading || overLimit}
									class="rounded-lg border px-3 py-2.5 text-left text-sm transition-colors cursor-pointer disabled:opacity-50
										{projectType === 'static'
											? 'border-gray-900 bg-gray-50 text-gray-900 ring-1 ring-gray-900'
											: 'border-gray-200 text-gray-500 hover:border-gray-300'}"
								>
									<span class="font-medium block text-center sm:text-left">Static</span>
								</button>
								<button
									type="button"
									onclick={() => handleProjectTypeChange('build')}
									disabled={loading || overLimit}
									class="rounded-lg border px-3 py-2.5 text-left text-sm transition-colors cursor-pointer disabled:opacity-50
										{projectType === 'build'
											? 'border-gray-900 bg-gray-50 text-gray-900 ring-1 ring-gray-900'
											: 'border-gray-200 text-gray-500 hover:border-gray-300'}"
								>
									<span class="font-medium block text-center sm:text-left">Framework</span>
								</button>
								<button
									type="button"
									onclick={() => handleProjectTypeChange('backend')}
									disabled={loading || overLimit}
									class="rounded-lg border px-3 py-2.5 text-left text-sm transition-colors cursor-pointer disabled:opacity-50
										{projectType === 'backend'
											? 'border-gray-900 bg-gray-50 text-gray-900 ring-1 ring-gray-900'
											: 'border-gray-200 text-gray-500 hover:border-gray-300'}"
								>
									<span class="font-medium block text-center sm:text-left">Server / API</span>
								</button>
							</div>
						</div>

						<!-- Build settings -->
						<div class="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4">
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<Input label="Branch" placeholder="main" bind:value={branch} disabled={loading || overLimit} />
								{#if projectType !== 'backend'}
									<Input label="Output Directory" placeholder={projectType === 'static' ? '.' : 'dist'} bind:value={outputDir} disabled={loading || overLimit} />
								{/if}
							</div>
							{#if projectType === 'build' || projectType === 'backend'}
								<Input label="Build Command" placeholder="npm run build" bind:value={buildCommand} disabled={loading || overLimit} />
							{/if}
							{#if projectType === 'backend'}
								<Input label="Start Command" placeholder="node dist/index.js" bind:value={startCommand} disabled={loading || overLimit} />
							{/if}
						</div>
						
						<!-- Env vars hint -->
						{#if detectedEnvKeys.length > 0}
							<div class="bg-blue-50 border border-blue-100 rounded-lg p-3">
								<p class="text-sm text-blue-900 font-medium flex items-center gap-1.5"><AlertCircle class="w-4 h-4"/> Environment Variables Detected</p>
								<p class="text-xs text-blue-700 mt-1">We found a <code>.env.example</code> file. Once deployed, you can set values for: <br/> 
									<span class="font-mono text-[10px] mt-1 inline-block bg-white/50 px-2 py-1 rounded border border-blue-200">{detectedEnvKeys.slice(0, 5).join(', ')}{detectedEnvKeys.length > 5 ? '...' : ''}</span>
								</p>
							</div>
						{/if}

						<!-- DNS reminder -->
						<div class="flex items-start gap-2 rounded-lg bg-gray-50 border border-gray-200 p-3 mt-4">
							<Globe class="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
							<p class="text-xs text-gray-500">
								Make sure <strong class="text-gray-700">{domain || 'your domain'}</strong> has an <strong class="text-gray-700">A record</strong> pointing to your server.
							</p>
						</div>
					</div>
					{/if}

				</form>
			</div>
			
			<!-- Footer / Actions -->
			<div class="border-t border-gray-100 px-6 py-4 bg-gray-50 rounded-b-xl flex gap-3 shrink-0">
				<Button
					variant="outline"
					class="flex-1"
					type="button"
					onclick={() => { open = false; onclose?.(); }}
				>
					Cancel
				</Button>
				<Button form="add-site-form" class="flex-1" type="submit" disabled={loading || overLimit || !showConfiguration || (!repo && repoType === 'private')}>
					{loading ? 'Deploying Magic...' : overLimit ? 'Limit Reached' : !showConfiguration ? 'Select a Repository First' : 'Deploy Site'}
				</Button>
			</div>

		</div>
	</div>
{/if}

<style>
	/* Make the input look normal since we are hacking the svelte-select look out */
	.custom-input {
		/* ... existing styles via tailwind mostly handle this */
	}
</style>

