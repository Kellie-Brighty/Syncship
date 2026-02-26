<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { User, Server, Github, Shield, Check, Copy, Eye, EyeOff } from 'lucide-svelte';
	import { currentUser } from '$lib/stores/auth';
	import { updateProfile, updatePassword, type User as FirebaseUser } from 'firebase/auth';
	import { doc, getDoc, setDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase/client';

	// Profile
	let displayName = $state('');
	let profileSaving = $state(false);
	let profileMsg = $state('');

	// Password
	let newPassword = $state('');
	let confirmNewPassword = $state('');
	let passwordSaving = $state(false);
	let passwordMsg = $state('');

	// GitHub token
	let githubToken = $state('');
	let tokenSaving = $state(false);
	let tokenMsg = $state('');
	let tokenLoaded = $state(false);
	let showToken = $state(false);

	// Server Status
	let serverStatus = $state<'checking' | 'online' | 'offline'>('checking');
	let lastHeartbeat = $state<Date | null>(null);

	// Server Key UI
	let showServerKey = $state(false);
	let copiedKey = $state(false);
	let copiedCommand = $state(false);
	
	let daemonToken = $state('');
	let daemonEmail = $state('');
	let generatingToken = $state(false);

	function copyToClipboard(text: string, type: 'key' | 'command') {
		navigator.clipboard.writeText(text);
		if (type === 'key') {
			copiedKey = true;
			setTimeout(() => copiedKey = false, 2000);
		} else {
			copiedCommand = true;
			setTimeout(() => copiedCommand = false, 2000);
		}
	}

	// Load user data
	$effect(() => {
		const user = $currentUser;
		if (user) {
			displayName = user.displayName || '';
			loadSettings(user.uid);
			checkDaemonStatus();
		}
	});

	async function loadSettings(uid: string) {
		try {
			const settingsDoc = await getDoc(doc(db, 'settings', uid));
			if (settingsDoc.exists()) {
				const data = settingsDoc.data();
				githubToken = data.githubToken || '';
				daemonToken = data.daemonToken || '';
				daemonEmail = data.daemonEmail || '';
			}
			tokenLoaded = true;
		} catch { tokenLoaded = true; }
	}

	async function saveProfile() {
		const user = $currentUser;
		if (!user) return;
		profileSaving = true; profileMsg = '';
		try {
			await updateProfile(user as FirebaseUser, { displayName: displayName.trim() });
			await setDoc(doc(db, 'users', user.uid), { displayName: displayName.trim() }, { merge: true });
			profileMsg = 'Profile updated';
			setTimeout(() => profileMsg = '', 3000);
		} catch (err: any) { profileMsg = err.message; }
		finally { profileSaving = false; }
	}

	async function changePassword() {
		const user = $currentUser;
		if (!user) return;
		if (newPassword.length < 6) { passwordMsg = 'Minimum 6 characters'; return; }
		if (newPassword !== confirmNewPassword) { passwordMsg = 'Passwords do not match'; return; }
		passwordSaving = true; passwordMsg = '';
		try {
			await updatePassword(user as FirebaseUser, newPassword);
			passwordMsg = 'Password updated';
			newPassword = ''; confirmNewPassword = '';
			setTimeout(() => passwordMsg = '', 3000);
		} catch (err: any) { passwordMsg = err.message?.replace('Firebase: ', '') || 'Failed'; }
		finally { passwordSaving = false; }
	}

	async function saveGithubToken() {
		const user = $currentUser;
		if (!user) return;
		tokenSaving = true; tokenMsg = '';
		try {
			await setDoc(doc(db, 'settings', user.uid), { githubToken: githubToken.trim() }, { merge: true });
			tokenMsg = 'Token saved successfully';
			setTimeout(() => tokenMsg = '', 3000);
		} catch (err: any) { tokenMsg = err.message; }
		finally { tokenSaving = false; }
	}

	async function generateDaemonToken() {
		const user = $currentUser;
		if (!user) return;
		generatingToken = true;
		try {
			const idToken = await user.getIdToken();
			const res = await fetch('/api/daemon-token', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${idToken}`
				}
			});
			if (!res.ok) throw new Error('Failed to generate token');
			const data = await res.json();
			daemonToken = data.daemonToken;
			daemonEmail = data.daemonEmail;
		} catch (err) {
			console.error(err);
			alert('Failed to generate daemon token');
		} finally {
			generatingToken = false;
		}
	}

	async function checkDaemonStatus() {
		const user = $currentUser;
		if (!user) return;
		try {
			const heartbeatDoc = await getDoc(doc(db, 'daemon', user.uid));
			if (heartbeatDoc.exists()) {
				const data = heartbeatDoc.data();
				const ts = data.lastPing?.toDate();
				lastHeartbeat = ts;
				const diffMs = Date.now() - (ts?.getTime() || 0);
				// Expanded to 24h since heartbeats are now manual.
				serverStatus = diffMs < 86400000 ? 'online' : 'offline';
			} else {
				serverStatus = 'offline';
			}
		} catch { serverStatus = 'offline'; }
	}

	let refreshingDaemon = $state(false);
	async function refreshDaemonStatus() {
		const user = $currentUser;
		if (!user) return;
		if (refreshingDaemon) return;
		refreshingDaemon = true;
		try {
			serverStatus = 'checking';
			await setDoc(doc(db, 'daemon', user.uid), { action: 'refresh_stats', timestamp: Date.now() }, { merge: true });
			// Give daemon 1.5s to respond and update heartbeat
			setTimeout(async () => {
				await checkDaemonStatus();
				refreshingDaemon = false;
			}, 1500);
		} catch (err) {
			console.error('Failed to command daemon:', err);
			refreshingDaemon = false;
			serverStatus = 'offline';
		}
	}
</script>

<svelte:head><title>Settings | SyncShip</title></svelte:head>

<div class="mb-6">
	<h1 class="text-xl font-bold tracking-tight text-gray-900">Settings</h1>
	<p class="mt-1 text-sm text-gray-500">Manage your account and server configuration.</p>
</div>

<div class="space-y-5 max-w-2xl">
	<!-- Profile -->
	<Card class="p-5">
		<div class="flex items-start gap-3">
			<div class="rounded-lg bg-gray-100 p-2.5"><User class="h-5 w-5 text-gray-700" /></div>
			<div class="flex-1">
				<h3 class="text-sm font-semibold text-gray-900">Profile</h3>
				<p class="mt-0.5 text-sm text-gray-500">Your account information.</p>
				<div class="mt-3 space-y-3 max-w-sm">
					<Input label="Display name" bind:value={displayName} placeholder="Your name" />
					<Input label="Email" value={$currentUser?.email || ''} disabled />
					<div class="flex items-center gap-2">
						<Button onclick={saveProfile} disabled={profileSaving}>
							{profileSaving ? 'Saving...' : 'Save'}
						</Button>
						{#if profileMsg}
							<span class="text-sm {profileMsg.includes('updated') ? 'text-green-600' : 'text-red-600'}">{profileMsg}</span>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</Card>

	<!-- Change Password -->
	{#if $currentUser?.providerData?.[0]?.providerId === 'password'}
		<Card class="p-5">
			<div class="flex items-start gap-3">
				<div class="rounded-lg bg-gray-100 p-2.5"><Shield class="h-5 w-5 text-gray-700" /></div>
				<div class="flex-1">
					<h3 class="text-sm font-semibold text-gray-900">Change Password</h3>
					<p class="mt-0.5 text-sm text-gray-500">Update your account password.</p>
					<div class="mt-3 space-y-3 max-w-sm">
						<Input label="New password" type="password" bind:value={newPassword} placeholder="Minimum 6 characters" />
						<Input label="Confirm new password" type="password" bind:value={confirmNewPassword} placeholder="••••••••" />
						<div class="flex items-center gap-2">
							<Button onclick={changePassword} disabled={passwordSaving}>
								{passwordSaving ? 'Updating...' : 'Update Password'}
							</Button>
							{#if passwordMsg}
								<span class="text-sm {passwordMsg.includes('updated') ? 'text-green-600' : 'text-red-600'}">{passwordMsg}</span>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</Card>
	{/if}

	<!-- Server Connection Key -->
	<Card class="p-5">
		<div class="flex items-start gap-3">
			<div class="rounded-lg bg-gray-100 p-2.5"><Server class="h-5 w-5 text-gray-700" /></div>
			<div class="flex-1 min-w-0">
				<h3 class="text-sm font-semibold text-gray-900">Server Connection Key</h3>
				<p class="mt-0.5 text-sm text-gray-500">Run this command on your Ubuntu 20.04/22.04 server to link it to SyncShip.</p>
				
				{#if !daemonToken}
					<div class="mt-4 p-4 border border-yellow-200 bg-yellow-50 rounded-md">
						<p class="text-sm text-yellow-800">You need to generate a secure Daemon Password to install SyncShip onto your VPS.</p>
						<Button class="mt-3" onclick={generateDaemonToken} disabled={generatingToken}>
							{generatingToken ? 'Generating...' : 'Generate Server Key'}
						</Button>
					</div>
				{:else}
					<div class="mt-4">
						<label for="install-command" class="block text-xs font-medium leading-6 text-gray-900">Installation Command</label>
						<div class="mt-1 flex rounded-md shadow-sm">
							<div class="relative flex flex-grow items-stretch focus-within:z-10 min-w-0">
								<pre id="install-command" class="block w-full rounded-none rounded-l-md border-0 py-2.5 pl-3 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 bg-gray-50 sm:text-sm sm:leading-6 font-mono overflow-hidden text-ellipsis whitespace-nowrap">curl -sL https://raw.githubusercontent.com/Kellie-Brighty/Syncship/main/droplet/static/install.sh | bash -s -- --email {daemonEmail} --token {daemonToken}</pre>
							</div>
							<button 
								type="button" 
								class="relative -ml-px inline-flex shrink-0 items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 cursor-pointer"
								onclick={() => copyToClipboard(`curl -sL https://raw.githubusercontent.com/Kellie-Brighty/Syncship/main/droplet/static/install.sh | bash -s -- --email ${daemonEmail} --token ${daemonToken}`, 'command')}
							>
								{#if copiedCommand}
									<Check class="h-4 w-4 text-green-600" /> <span class="text-green-600">Copied</span>
								{:else}
									<Copy class="h-4 w-4 text-gray-400" /> Copy
								{/if}
							</button>
						</div>
						<p class="mt-2 text-xs text-gray-500">This script will automatically install Nginx, Node.js, Certbot, and the SyncShip Daemon.</p>
					</div>

					<div class="mt-6 pt-5 border-t border-gray-100">
						<label for="raw-password" class="block text-xs font-medium leading-6 text-gray-900">Raw Daemon Password (Keep Secret)</label>
						<div class="mt-1 flex rounded-md shadow-sm max-w-sm">
							<div class="relative flex flex-grow items-stretch focus-within:z-10">
								<input 
									id="raw-password"
									type={showServerKey ? 'text' : 'password'} 
									readonly 
									value={daemonToken} 
									class="block w-full rounded-none rounded-l-md border-0 py-1.5 pl-3 text-gray-900 ring-1 ring-inset ring-gray-300 bg-gray-50 focus:ring-2 focus:ring-inset focus:ring-gray-900 sm:text-sm sm:leading-6 font-mono" 
								/>
							</div>
							<button type="button" class="relative -ml-px inline-flex items-center gap-x-1.5 px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 cursor-pointer" onclick={() => showServerKey = !showServerKey}>
								{#if showServerKey}
									<EyeOff class="h-4 w-4 text-gray-400" />
								{:else}
									<Eye class="h-4 w-4 text-gray-400" />
								{/if}
							</button>
							<button 
								type="button" 
								class="relative -ml-px inline-flex shrink-0 items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 cursor-pointer"
								onclick={() => copyToClipboard(daemonToken, 'key')}
							>
								{#if copiedKey}
									<Check class="h-4 w-4 text-green-600" />
								{:else}
									<Copy class="h-4 w-4 text-gray-400" />
								{/if}
							</button>
						</div>
						<p class="mt-2 text-xs text-gray-500">If compromised, you can generate a new one. This will disconnect your current VPS.</p>
						<Button variant="outline" class="mt-3 text-xs" onclick={generateDaemonToken} disabled={generatingToken}>
							{generatingToken ? 'Generating...' : 'Rotate Server Password'}
						</Button>
					</div>
				{/if}
			</div>
		</div>
	</Card>

	<!-- Daemon Status -->
	<Card class="p-5">
		<div class="flex items-start gap-3">
			<div class="rounded-lg bg-gray-100 p-2.5"><Server class="h-5 w-5 text-gray-700" /></div>
			<div class="flex-1">
				<h3 class="text-sm font-semibold text-gray-900">Daemon Status</h3>
				<p class="mt-0.5 text-sm text-gray-500">Your SyncShip deployment engine.</p>
				<div class="mt-3 flex items-center gap-3">
					{#if serverStatus === 'checking' || refreshingDaemon}
						<span class="inline-flex items-center gap-1.5 text-sm text-gray-500">
							<span class="h-2 w-2 rounded-full bg-gray-300 animate-pulse"></span>
							Checking...
						</span>
					{:else if serverStatus === 'online'}
						<span class="inline-flex items-center gap-1.5 text-sm text-green-700">
							<span class="h-2 w-2 rounded-full bg-green-500"></span>
							Online
						</span>
					{:else}
						<span class="inline-flex items-center gap-1.5 text-sm text-red-600">
							<span class="h-2 w-2 rounded-full bg-red-500"></span>
							Offline
						</span>
					{/if}

					<Button 
						variant="secondary" 
						size="sm" 
						class="text-xs px-2 py-1 h-7 ml-4"
						onclick={refreshDaemonStatus}
						disabled={refreshingDaemon}
					>
						Refresh Status
					</Button>
				</div>
					{#if lastHeartbeat}
						<span class="text-xs text-gray-400">Last seen: {lastHeartbeat.toLocaleTimeString()}</span>
					{/if}
				{#if serverStatus === 'offline'}
					<p class="mt-2 text-xs text-gray-400">
						Make sure the daemon is running on your server: <code class="bg-gray-100 px-1 rounded">pm2 logs agencydroplet</code>
					</p>
				{/if}
			</div>
		</div>
	</Card>

	<!-- GitHub Token -->
	<Card class="p-5">
		<div class="flex items-start gap-3">
			<div class="rounded-lg bg-gray-100 p-2.5"><Github class="h-5 w-5 text-gray-700" /></div>
			<div class="flex-1">
				<h3 class="text-sm font-semibold text-gray-900">GitHub Access Token</h3>
				<p class="mt-0.5 text-sm text-gray-500">Required for deploying private repositories. <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener" class="text-gray-900 underline">Generate one →</a></p>
				{#if tokenLoaded}
					<div class="mt-3 max-w-sm space-y-3">
						<Input label="Personal access token" type={showToken ? 'text' : 'password'} bind:value={githubToken} placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" />
						<div class="flex items-center gap-2">
							<Button onclick={saveGithubToken} disabled={tokenSaving}>
								{tokenSaving ? 'Saving...' : 'Save Token'}
							</Button>
							{#if tokenMsg}
								<span class="text-sm text-green-600">{tokenMsg}</span>
							{/if}
						</div>
					</div>
				{:else}
					<div class="mt-3 h-10 w-64 bg-gray-100 rounded animate-pulse"></div>
				{/if}
			</div>
		</div>
	</Card>
</div>
