<script lang="ts">
	import { Droplets, LayoutDashboard, Globe, Settings, LogOut, CodeSquare } from 'lucide-svelte';
	import { page } from '$app/stores';
	import { currentUser } from '$lib/stores/auth';
	import LogoutModal from './LogoutModal.svelte';

	const navigation = [
		{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
		{ name: 'Sites', href: '/sites', icon: Globe },
		{ name: 'Deployments', href: '/deployments', icon: CodeSquare },
		{ name: 'Settings', href: '/settings', icon: Settings }
	];

	let showLogout = $state(false);

	function isCurrent(path: string, currentPath: string) {
		if (path === '/' && currentPath === '/') return true;
		if (path !== '/' && currentPath.startsWith(path)) return true;
		return false;
	}

	function getInitials(user: { displayName?: string | null; email?: string | null }): string {
		if (user.displayName) {
			return user.displayName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
		}
		return (user.email?.[0] ?? '?').toUpperCase();
	}

	function getDisplayName(user: { displayName?: string | null; email?: string | null }): string {
		return user.displayName || user.email?.split('@')[0] || 'User';
	}
</script>

<div class="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
	<div class="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200/70 bg-white/85 backdrop-blur-sm px-5 pb-4">
		<!-- Logo -->
		<div class="flex h-14 shrink-0 items-center gap-x-2.5">
			<div class="rounded-lg bg-gray-900 p-1.5">
				<Droplets class="h-4 w-4 text-white" />
			</div>
			<span class="text-lg font-bold tracking-tight text-gray-900">SyncShip</span>
		</div>

		<!-- Nav -->
		<nav class="flex flex-1 flex-col">
			<ul role="list" class="flex flex-1 flex-col gap-y-7">
				<li>
					<ul role="list" class="-mx-2 space-y-0.5">
						{#each navigation as item}
							{@const current = isCurrent(item.href, $page.url.pathname)}
							<li>
								<a
									href={item.href}
									class="group flex gap-x-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors
									{current
										? 'bg-gray-100 text-gray-900'
										: 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}"
								>
									<item.icon
										class="h-5 w-5 shrink-0 transition-colors
										{current ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-700'}"
									/>
									{item.name}
								</a>
							</li>
						{/each}
					</ul>
				</li>

				<!-- Bottom section: Profile + Logout -->
				<li class="mt-auto space-y-3">
					<!-- Profile chip -->
					{#if $currentUser}
						<div class="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2.5">
							{#if $currentUser.photoURL}
								<img
									src={$currentUser.photoURL}
									alt="Profile"
									class="h-8 w-8 rounded-full object-cover"
									referrerpolicy="no-referrer"
								/>
							{:else}
								<div class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
									{getInitials($currentUser)}
								</div>
							{/if}
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium text-gray-900">{getDisplayName($currentUser)}</p>
								<p class="truncate text-xs text-gray-500">{$currentUser.email}</p>
							</div>
						</div>
					{/if}

					<!-- Logout -->
					<button
						onclick={() => showLogout = true}
						class="group -mx-2 flex w-full gap-x-3 rounded-lg px-2.5 py-2 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
					>
						<LogOut class="h-5 w-5 shrink-0 text-gray-400 group-hover:text-red-500 transition-colors" />
						Log out
					</button>
				</li>
			</ul>
		</nav>
	</div>
</div>

<LogoutModal bind:open={showLogout} onclose={() => showLogout = false} />
