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

	// Server status
	let serverStatus = $state<'checking' | 'online' | 'offline'>('checking');
	let lastHeartbeat = $state<Date | null>(null);

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
			tokenMsg = 'Token saved';
			setTimeout(() => tokenMsg = '', 3000);
		} catch (err: any) { tokenMsg = err.message; }
		finally { tokenSaving = false; }
	}

	async function checkDaemonStatus() {
		try {
			const heartbeatDoc = await getDoc(doc(db, 'daemon', 'heartbeat'));
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
		if (refreshingDaemon) return;
		refreshingDaemon = true;
		try {
			serverStatus = 'checking';
			await setDoc(doc(db, 'daemon', 'commands'), { action: 'refresh_stats', timestamp: Date.now() });
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
