<script lang="ts">
	import { Droplets, Rocket, Shield, Globe, GitBranch, Activity, Terminal, ChevronRight, Check } from 'lucide-svelte';
</script>

<svelte:head>
	<title>SyncShip — Deploy Smarter. Ship Faster.</title>
	<meta name="description" content="The self-hosted deployment platform for agencies. Git-push to deploy. Your server. Your control." />
</svelte:head>

<!-- ─── NAVBAR ───────────────────────────────────────────────── -->
<header class="fixed top-0 inset-x-0 z-50 border-b border-gray-200/80 bg-white/70 backdrop-blur-xl">
	<div class="mx-auto max-w-7xl px-6 lg:px-8">
		<div class="flex h-16 items-center justify-between">
			<!-- Brand (exact replica of app sidebar logo) -->
			<a href="/" class="flex items-center gap-x-2.5">
				<div class="rounded-lg bg-gray-900 p-1.5 shadow-neumorphic-sm">
					<Droplets class="h-4 w-4 text-white" />
				</div>
				<span class="text-lg font-bold tracking-tight text-gray-900">SyncShip</span>
			</a>

			<nav class="hidden md:flex items-center gap-8">
				<a href="#features" class="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Features</a>
				<a href="#how-it-works" class="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">How it works</a>
				<a href="#pricing" class="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Pricing</a>
			</nav>

			<div class="flex items-center gap-3">
				<a href="/auth/login" class="hidden sm:block text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
					Sign in
				</a>
				<a href="/auth/register" class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors shadow-neumorphic-sm">
					Get Started Free
				</a>
			</div>
		</div>
	</div>
</header>

<!-- ─── HERO ─────────────────────────────────────────────────── -->
<section class="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-50 pt-16">
	<!-- Neumorphic background blobs -->
	<div class="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] rounded-full bg-gray-200/60 blur-[80px] pointer-events-none"></div>
	<div class="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] rounded-full bg-gray-300/40 blur-[100px] pointer-events-none"></div>

	<div class="relative z-10 mx-auto max-w-5xl px-6 text-center">
		<!-- Badge -->
		<div class="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 backdrop-blur px-4 py-1.5 mb-8 shadow-neumorphic-sm">
			<span class="h-1.5 w-1.5 rounded-full bg-gray-900 animate-pulse"></span>
			<span class="text-xs font-semibold text-gray-700 tracking-wide uppercase">Now in Beta — Free to Join</span>
		</div>

		<h1 class="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 tracking-tight leading-[1.05]">
			Ship Your Clients' Sites.
			<br />
			<span class="relative inline-block">
				<span class="relative z-10">Not Your Sanity.</span>
				<span class="absolute inset-x-0 bottom-1 h-4 bg-gray-200/80 -rotate-1 rounded"></span>
			</span>
		</h1>

		<p class="mt-7 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed font-medium">
			Git-push. Auto-build. Custom domain. Free SSL. All on <strong class="text-gray-900">your own Ubuntu server</strong>. No Vercel. No lock-in. No per-site fees.
		</p>

		<div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
			<a href="/auth/register" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-8 py-3.5 text-base font-bold text-white hover:bg-gray-800 transition-all shadow-neumorphic">
				Start Deploying Free
				<ChevronRight class="h-4 w-4" />
			</a>
			<a href="#how-it-works" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white/70 backdrop-blur px-8 py-3.5 text-base font-semibold text-gray-700 hover:bg-white transition-colors shadow-neumorphic-sm">
				See How It Works
			</a>
		</div>

		<!-- Terminal card (glassmorphic) -->
		<div class="mt-16 mx-auto max-w-3xl rounded-2xl border border-gray-200/80 bg-white/60 backdrop-blur-xl shadow-neumorphic overflow-hidden">
			<!-- Mac dots header -->
			<div class="flex items-center gap-2 border-b border-gray-100 px-4 py-3 bg-gray-50/80">
				<div class="h-3 w-3 rounded-full bg-red-400/80"></div>
				<div class="h-3 w-3 rounded-full bg-yellow-400/80"></div>
				<div class="h-3 w-3 rounded-full bg-green-400/80"></div>
				<span class="font-mono text-[10px] text-gray-400 uppercase tracking-widest ml-3">Terminal Output</span>
			</div>
			<div class="p-6 text-left space-y-2 font-mono text-sm leading-relaxed bg-gray-950 text-gray-300">
				<p class="text-gray-500">$ git push origin main</p>
				<p class="text-blue-400">→ Pulling latest changes from GitHub...</p>
				<p>→ Injecting stored .env variables...</p>
				<p>→ Installing dependencies...</p>
				<p class="text-yellow-400">→ Running build: bun run build</p>
				<p>→ Nginx configured and reloaded</p>
				<p class="text-green-400">→ SSL certificate deployed for yourdomain.com</p>
				<p class="text-green-400 font-bold">✅ Deployed successfully in 34s</p>
			</div>
		</div>
	</div>
</section>

<!-- ─── STATS BAR ─────────────────────────────────────────────── -->
<section class="border-y border-gray-200 bg-white py-10">
	<div class="mx-auto max-w-5xl px-6">
		<div class="grid grid-cols-3 divide-x divide-gray-200">
			{#each [['50+', 'Sites Deployed'], ['99.9%', 'Uptime'], ['< 60s', 'Avg Deploy Time']] as [val, label]}
				<div class="text-center px-8">
					<p class="text-3xl font-black text-gray-900 tracking-tight">{val}</p>
					<p class="mt-1 text-sm font-medium text-gray-500">{label}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ─── FEATURES ──────────────────────────────────────────────── -->
<section id="features" class="bg-gray-50 py-28">
	<div class="mx-auto max-w-7xl px-6 lg:px-8">
		<div class="text-center mb-16">
			<p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Features</p>
			<h2 class="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
				Everything built-in.<br />
				<span class="text-gray-400">Nothing held back.</span>
			</h2>
			<p class="mt-4 text-gray-500 max-w-xl mx-auto">
				Vercel-grade deployments on your own hardware. Built specifically for agencies with multiple client sites.
			</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
			{#each [
				{ Icon: Terminal, title: 'Live Deployment Logs', desc: 'Color-coded terminal output streams live to your dashboard. Know exactly what's happening at every build step.' },
				{ Icon: Shield, title: 'Auto SSL Certificates', desc: "Free Let's Encrypt certificates provisioned automatically. Every site gets HTTPS from the first deploy." },
				{ Icon: Activity, title: 'Live Server Stats', desc: 'Real-time CPU & RAM usage pulled directly from your Ubuntu droplet. Keep your server healthy at a glance.' },
				{ Icon: Globe, title: 'Custom Domains', desc: 'Point any domain to your droplet. Nginx is configured and reloaded automatically every single time.' },
				{ Icon: GitBranch, title: 'Git-Based Deploys', desc: 'Connect your GitHub repo once. Hit Re-deploy to pull the latest commit, build, and go live instantly.' },
				{ Icon: Rocket, title: 'Zero Vendor Lock-In', desc: 'Your server, your code, your data. Cancel anytime without losing a single deployment or config.' }
			] as { Icon, title, desc }}
				<div class="group rounded-2xl border border-gray-200/80 bg-white/70 backdrop-blur-sm p-6 hover:shadow-neumorphic transition-all duration-300 hover:-translate-y-0.5">
					<div class="mb-4 inline-flex items-center justify-center rounded-xl bg-gray-100 p-3 shadow-neumorphic-inset group-hover:bg-gray-900 transition-colors">
						<Icon class="h-5 w-5 text-gray-700 group-hover:text-white transition-colors" />
					</div>
					<h3 class="text-base font-bold text-gray-900 mb-1.5">{title}</h3>
					<p class="text-sm text-gray-500 leading-relaxed">{desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ─── HOW IT WORKS ──────────────────────────────────────────── -->
<section id="how-it-works" class="bg-white py-28 border-y border-gray-100">
	<div class="mx-auto max-w-4xl px-6 text-center">
		<p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">How It Works</p>
		<h2 class="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-4">Up and running in minutes.</h2>
		<p class="text-gray-500 mb-16 max-w-md mx-auto">No DevOps degree. No YAML nightmares. Just a form, your repo, and one button.</p>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
			{#each [
				{ step: '01', title: 'Connect Your Droplet', desc: 'Run the one-line daemon installer on your Ubuntu server. Done in under a minute.' },
				{ step: '02', title: 'Add Your Site', desc: 'Paste your GitHub repo URL, custom domain, and build command. Environment variables stored securely.' },
				{ step: '03', title: 'Hit Deploy', desc: 'SyncShip clones your repo, builds it, configures Nginx, provisions SSL, and makes it live — while you watch.' }
			] as item}
				<div class="rounded-2xl border border-gray-200/80 bg-gray-50/80 p-6 shadow-neumorphic-sm">
					<div class="flex items-center gap-3 mb-4">
						<span class="font-mono text-xs font-black text-gray-400">{item.step}</span>
						<div class="h-px flex-1 bg-gray-200"></div>
					</div>
					<h3 class="font-bold text-gray-900 mb-2">{item.title}</h3>
					<p class="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ─── PRICING ───────────────────────────────────────────────── -->
<section id="pricing" class="bg-gray-50 py-28">
	<div class="mx-auto max-w-5xl px-6">
		<div class="text-center mb-16">
			<p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Pricing</p>
			<h2 class="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
				Simple pricing.<br /><span class="text-gray-400">No surprises.</span>
			</h2>
			<p class="mt-4 text-gray-500">Stop paying per-site. Pay once, deploy everything.</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<!-- Starter -->
			<div class="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur p-7 flex flex-col shadow-neumorphic-sm">
				<p class="text-xs font-bold uppercase tracking-widest text-gray-400">Starter</p>
				<div class="mt-4">
					<span class="text-4xl font-black text-gray-900">Free</span>
				</div>
				<p class="mt-2 text-sm text-gray-500">Perfect for testing and small projects.</p>
				<ul class="mt-6 space-y-3 flex-1">
					{#each ['1 Droplet', '3 Sites', 'Deployment Logs', 'Auto SSL', 'Community Support'] as f}
						<li class="flex items-center gap-2 text-sm text-gray-600">
							<Check class="h-4 w-4 text-gray-400 shrink-0" />
							{f}
						</li>
					{/each}
				</ul>
				<a href="/auth/register" class="mt-8 block rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors shadow-neumorphic-inset">
					Get Started Free
				</a>
			</div>

			<!-- Agency (featured) -->
			<div class="rounded-2xl border border-gray-900 bg-gray-900 p-7 flex flex-col relative overflow-hidden shadow-neumorphic">
				<div class="absolute top-4 right-4 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider">Most Popular</div>
				<p class="text-xs font-bold uppercase tracking-widest text-gray-400">Agency</p>
				<div class="mt-4 flex items-end gap-1">
					<span class="text-4xl font-black text-white">$29</span>
					<span class="text-gray-500 mb-1 text-sm">/month</span>
				</div>
				<p class="mt-2 text-sm text-gray-400">For agencies managing multiple client sites.</p>
				<ul class="mt-6 space-y-3 flex-1">
					{#each ['3 Droplets', 'Unlimited Sites', 'Real-time Server Stats', 'Priority Support', 'Team Access', 'Custom Environments'] as f}
						<li class="flex items-center gap-2 text-sm text-gray-300">
							<Check class="h-4 w-4 text-gray-400 shrink-0" />
							{f}
						</li>
					{/each}
				</ul>
				<a href="/auth/register" class="mt-8 block rounded-xl bg-white py-2.5 text-center text-sm font-bold text-gray-900 hover:bg-gray-100 transition-colors">
					Start Agency Plan
				</a>
			</div>

			<!-- Enterprise -->
			<div class="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur p-7 flex flex-col shadow-neumorphic-sm">
				<p class="text-xs font-bold uppercase tracking-widest text-gray-400">Enterprise</p>
				<div class="mt-4">
					<span class="text-4xl font-black text-gray-900">Custom</span>
				</div>
				<p class="mt-2 text-sm text-gray-500">White-label, SSO, and custom SLAs for large teams.</p>
				<ul class="mt-6 space-y-3 flex-1">
					{#each ['Unlimited Droplets', 'White-label Dashboard', 'SSO / SAML', 'SLA Guarantee', 'Dedicated Support', 'Custom Integrations'] as f}
						<li class="flex items-center gap-2 text-sm text-gray-600">
							<Check class="h-4 w-4 text-gray-400 shrink-0" />
							{f}
						</li>
					{/each}
				</ul>
				<a href="mailto:hello@syncship.ink" class="mt-8 block rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors shadow-neumorphic-inset">
					Contact Us
				</a>
			</div>
		</div>
	</div>
</section>

<!-- ─── CTA ───────────────────────────────────────────────────── -->
<section class="bg-white border-t border-gray-100 py-24">
	<div class="mx-auto max-w-3xl px-6 text-center">
		<div class="inline-flex items-center justify-center rounded-2xl bg-gray-900 p-4 mb-6 shadow-neumorphic">
			<Droplets class="h-8 w-8 text-white" />
		</div>
		<h2 class="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Ready to ship faster?</h2>
		<p class="mt-4 text-gray-500 max-w-md mx-auto">Join agencies already using SyncShip to deploy client sites on their own terms.</p>
		<a href="/auth/register" class="mt-8 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-10 py-3.5 text-base font-bold text-white hover:bg-gray-800 transition-all shadow-neumorphic hover:-translate-y-0.5">
			Get Started Free
			<ChevronRight class="h-4 w-4" />
		</a>
	</div>
</section>

<!-- ─── FOOTER ────────────────────────────────────────────────── -->
<footer class="bg-gray-50 border-t border-gray-200 py-10">
	<div class="mx-auto max-w-7xl px-6">
		<div class="flex flex-col md:flex-row items-center justify-between gap-5">
			<a href="/" class="flex items-center gap-x-2.5">
				<div class="rounded-lg bg-gray-900 p-1.5">
					<Droplets class="h-4 w-4 text-white" />
				</div>
				<span class="text-sm font-bold tracking-tight text-gray-900">SyncShip</span>
				<span class="text-gray-400 text-xs ml-1">— Ship your clients' sites, not your sanity.</span>
			</a>
			<div class="flex items-center gap-6">
				<a href="#features" class="text-xs text-gray-400 hover:text-gray-700 transition-colors">Features</a>
				<a href="#pricing" class="text-xs text-gray-400 hover:text-gray-700 transition-colors">Pricing</a>
				<a href="/auth/login" class="text-xs text-gray-400 hover:text-gray-700 transition-colors">Sign In</a>
				<a href="/auth/register" class="text-xs text-gray-400 hover:text-gray-700 transition-colors">Sign Up</a>
			</div>
		</div>
		<div class="mt-8 pt-6 border-t border-gray-200 text-center">
			<p class="text-xs text-gray-400">© 2026 SyncShip. Built with ♥ for agencies.</p>
		</div>
	</div>
</footer>

<style>
	html { scroll-behavior: smooth; }

	/* Neumorphic shadow utilities */
	:global(.shadow-neumorphic) {
		box-shadow: 8px 8px 20px #d1d1d1, -8px -8px 20px #ffffff;
	}
	:global(.shadow-neumorphic-sm) {
		box-shadow: 4px 4px 10px #d1d1d1, -4px -4px 10px #ffffff;
	}
	:global(.shadow-neumorphic-inset) {
		box-shadow: inset 4px 4px 8px #d1d1d1, inset -4px -4px 8px #ffffff;
	}
</style>
