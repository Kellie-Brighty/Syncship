<script lang="ts">
	import { X, Globe, AlertCircle } from 'lucide-svelte';
	import Button from './Button.svelte';
	import Input from './Input.svelte';
	import Card from './Card.svelte';
	import { createSite } from '$lib/firebase/services/sites';
	import { currentUser } from '$lib/stores/auth';
	import { get } from 'svelte/store';

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

	// Update defaults when project type changes
	$effect(() => {
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
	});

	// Clear form when modal opens
	$effect(() => {
		if (open) {
			name = ''; domain = ''; repo = ''; branch = 'main';
			projectType = 'static'; buildCommand = ''; outputDir = '.';
			startCommand = ''; error = '';
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';

		if (!name.trim()) { error = 'Site name is required'; return; }
		if (!domain.trim()) { error = 'Domain is required'; return; }
		if (!repo.trim()) { error = 'Repository is required'; return; }

		const user = get(currentUser);
		if (!user) { error = 'You must be logged in'; return; }

		loading = true;
		try {
			await createSite({
				name: name.trim(),
				domain: domain.trim(),
				repo: repo.trim(),
				branch: branch.trim() || 'main',
				siteType: projectType === 'backend' ? 'backend' : 'static',
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
		if (e.target === e.currentTarget) { open = false; onclose?.(); }
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') { open = false; onclose?.(); }
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm"
		onclick={handleBackdrop}
	>
		<div class="relative w-full max-w-lg mx-4 rounded-xl border border-gray-200 bg-white shadow-lg max-h-[90vh] overflow-y-auto">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
				<div class="flex items-center gap-2">
					<Globe class="h-5 w-5 text-gray-600" />
					<h2 class="text-base font-semibold text-gray-900">Add New Site</h2>
				</div>
				<button
					onclick={() => { open = false; onclose?.(); }}
					class="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
				>
					<X class="h-4 w-4" />
				</button>
			</div>

			<!-- Body -->
			<form onsubmit={handleSubmit} class="px-6 py-5 space-y-4">
				{#if error}
					<div class="rounded-lg bg-red-50 border border-red-200 p-3">
						<p class="text-sm text-red-700">{error}</p>
					</div>
				{/if}

				<Input label="Site name" placeholder="acme-marketing" required bind:value={name} />
				<Input label="Domain" placeholder="acme.com" required bind:value={domain} />
				<Input label="GitHub repository" placeholder="owner/repo-name" required bind:value={repo} />

				<!-- Project type selector -->
				<div class="border-t border-gray-100 pt-4 mt-4">
					<p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Project Type</p>
					<div class="grid grid-cols-3 gap-2">
						<button
							type="button"
							onclick={() => projectType = 'static'}
							class="rounded-lg border px-3 py-2.5 text-left text-sm transition-colors cursor-pointer
								{projectType === 'static'
									? 'border-gray-900 bg-gray-50 text-gray-900'
									: 'border-gray-200 text-gray-500 hover:border-gray-300'}"
						>
							<span class="font-medium block">Static HTML</span>
							<span class="text-xs text-gray-400 block mt-0.5">No build step</span>
						</button>
						<button
							type="button"
							onclick={() => projectType = 'build'}
							class="rounded-lg border px-3 py-2.5 text-left text-sm transition-colors cursor-pointer
								{projectType === 'build'
									? 'border-gray-900 bg-gray-50 text-gray-900'
									: 'border-gray-200 text-gray-500 hover:border-gray-300'}"
						>
							<span class="font-medium block">Framework</span>
							<span class="text-xs text-gray-400 block mt-0.5">React, Vue, etc.</span>
						</button>
						<button
							type="button"
							onclick={() => projectType = 'backend'}
							class="rounded-lg border px-3 py-2.5 text-left text-sm transition-colors cursor-pointer
								{projectType === 'backend'
									? 'border-gray-900 bg-gray-50 text-gray-900'
									: 'border-gray-200 text-gray-500 hover:border-gray-300'}"
						>
							<span class="font-medium block">Backend</span>
							<span class="text-xs text-gray-400 block mt-0.5">Node, Python, etc.</span>
						</button>
					</div>
				</div>

				<!-- Build settings -->
				<div class="space-y-3">
					<div class="grid grid-cols-2 gap-3">
						<Input label="Branch" placeholder="main" bind:value={branch} />
						{#if projectType !== 'backend'}
							<Input label="Output directory" placeholder={projectType === 'static' ? '.' : 'dist'} bind:value={outputDir} />
						{/if}
					</div>
					{#if projectType === 'build' || projectType === 'backend'}
						<Input label="Build command" placeholder="npm run build" bind:value={buildCommand} />
					{/if}
					{#if projectType === 'backend'}
						<Input label="Start command" placeholder="node dist/index.js" bind:value={startCommand} />
					{/if}
				</div>

				<!-- DNS reminder -->
				<div class="flex items-start gap-2 rounded-lg bg-gray-50 border border-gray-200 p-3">
					<AlertCircle class="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
					<p class="text-xs text-gray-500">
						Make sure your domain's <strong class="text-gray-700">A record</strong> points to your server's IP address.
					</p>
				</div>

				<!-- Actions -->
				<div class="flex gap-3 pt-2">
					<Button
						variant="outline"
						class="flex-1"
						type="button"
						onclick={() => { open = false; onclose?.(); }}
					>
						Cancel
					</Button>
					<Button class="flex-1" type="submit" disabled={loading}>
						{loading ? 'Creating...' : 'Create Site'}
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}
