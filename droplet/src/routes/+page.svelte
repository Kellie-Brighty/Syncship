<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<svelte:head>
	<title>SyncShip — Deploy Smarter. Ship Faster.</title>
	<meta name="description" content="The self-hosted deployment platform built for agencies. Git-push to deploy. Your server. Your control." />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
</svelte:head>

<!-- NAVBAR -->
<nav class="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-gray-950/80 backdrop-blur-xl">
	<div class="mx-auto max-w-7xl px-6 lg:px-8">
		<div class="flex h-16 items-center justify-between">
			<a href="/" class="flex items-center gap-2.5">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500">
					<svg class="h-4 w-4 text-gray-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7" />
					</svg>
				</div>
				<span class="text-base font-bold text-white tracking-tight">SyncShip</span>
			</a>

			<div class="hidden md:flex items-center gap-8">
				<a href="#features" class="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
				<a href="#how-it-works" class="text-sm text-gray-400 hover:text-white transition-colors">How it works</a>
				<a href="#pricing" class="text-sm text-gray-400 hover:text-white transition-colors">Pricing</a>
			</div>

			<div class="flex items-center gap-3">
				<a href="/auth/login" class="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">Sign in</a>
				<a href="/auth/register" class="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-green-400 transition-colors">
					Get Started Free
				</a>
			</div>
		</div>
	</div>
</nav>

<!-- HERO -->
<section class="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-950 pt-16">
	<!-- Grid background -->
	<div class="absolute inset-0 bg-grid-pattern opacity-[0.03]"></div>
	<!-- Green glow -->
	<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-green-500/10 blur-[120px] rounded-full pointer-events-none"></div>

	<div class="relative z-10 mx-auto max-w-5xl px-6 text-center">
		<div class="inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-4 py-1.5 mb-8">
			<span class="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></span>
			<span class="text-xs font-medium text-green-400 tracking-wide">Now in Beta — Join Free</span>
		</div>

		<h1 class="text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.05]">
			Ship Your Clients' Sites.<br />
			<span class="text-green-400">Not Your Sanity.</span>
		</h1>

		<p class="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
			SyncShip is the self-hosted deployment platform built for agencies. Git-push, auto-build, custom domains, SSL — all on <strong class="text-white">your own server</strong>. No Vercel fees. Full control.
		</p>

		<div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
			<a href="/auth/register" class="w-full sm:w-auto rounded-xl bg-green-500 px-8 py-3.5 text-base font-bold text-gray-950 hover:bg-green-400 transition-all hover:scale-105 shadow-lg shadow-green-500/20">
				Start Deploying Free →
			</a>
			<a href="#how-it-works" class="w-full sm:w-auto rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-colors">
				See How It Works
			</a>
		</div>

		<!-- Terminal preview -->
		<div class="mt-16 mx-auto max-w-3xl rounded-2xl border border-white/10 bg-gray-900 shadow-2xl shadow-black/50 overflow-hidden">
			<div class="flex items-center gap-2 border-b border-white/5 px-4 py-3">
				<div class="h-3 w-3 rounded-full bg-red-500/80"></div>
				<div class="h-3 w-3 rounded-full bg-yellow-500/80"></div>
				<div class="h-3 w-3 rounded-full bg-green-500/80"></div>
				<span class="ml-3 text-xs font-mono text-gray-500 uppercase tracking-wider">Terminal Output</span>
			</div>
			<div class="p-5 font-mono text-sm text-left space-y-1.5 leading-relaxed">
				<p class="text-gray-500">$ git push origin main</p>
				<p class="text-blue-400">→ Pulling latest changes from GitHub...</p>
				<p class="text-gray-300">→ Injecting stored .env variables...</p>
				<p class="text-gray-300">→ Installing dependencies...</p>
				<p class="text-yellow-400">→ Running build: bun run build</p>
				<p class="text-gray-300">→ Nginx configured and reloaded</p>
				<p class="text-green-400">→ SSL certificate deployed for yoursite.com</p>
				<p class="text-green-400 font-semibold">✅ Deployed successfully in 34s</p>
			</div>
		</div>
	</div>
</section>

<!-- STATS BAR -->
<section class="border-y border-white/5 bg-gray-900/50 py-10">
	<div class="mx-auto max-w-5xl px-6">
		<div class="grid grid-cols-3 divide-x divide-white/5">
			<div class="text-center px-6">
				<p class="text-3xl font-black text-white">50+</p>
				<p class="mt-1 text-sm text-gray-500">Sites Deployed</p>
			</div>
			<div class="text-center px-6">
				<p class="text-3xl font-black text-white">99.9%</p>
				<p class="mt-1 text-sm text-gray-500">Uptime</p>
			</div>
			<div class="text-center px-6">
				<p class="text-3xl font-black text-white">&lt;60s</p>
				<p class="mt-1 text-sm text-gray-500">Avg Deploy Time</p>
			</div>
		</div>
	</div>
</section>

<!-- FEATURES -->
<section id="features" class="bg-gray-950 py-28">
	<div class="mx-auto max-w-7xl px-6 lg:px-8">
		<div class="text-center mb-16">
			<h2 class="text-3xl sm:text-4xl font-black text-white tracking-tight">Everything you need.<br /><span class="text-gray-500">Nothing you don't.</span></h2>
			<p class="mt-4 text-gray-400 max-w-xl mx-auto">Built specifically for agencies who want Vercel-grade deployments without the Vercel bill.</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each [
				{ icon: '⚡', title: 'Live Deployment Logs', desc: 'Watch your build happen in real time. Color-coded terminal output streams straight to your dashboard.' },
				{ icon: '🔒', title: 'Auto SSL Certificates', desc: "Free Let's Encrypt certs provisioned automatically for every domain. HTTPS out of the box." },
				{ icon: '📊', title: 'Live Server Stats', desc: 'Real-time CPU and RAM graphs pulled directly from your Ubuntu droplet. Know your server health instantly.' },
				{ icon: '🌐', title: 'Custom Domains', desc: 'Point any domain. Nginx is configured automatically. No DNS wizardry required.' },
				{ icon: '🔄', title: 'Git-Based Deploys', desc: 'Connect your GitHub repo. One click triggers a full clone, build, and deploy cycle.' },
				{ icon: '🛡️', title: 'Self-Hosted Control', desc: 'Your code never leaves your server. No vendor lock-in. Scale however you want.' }
			] as feat}
				<div class="group rounded-2xl border border-white/5 bg-gray-900/60 p-6 hover:border-green-500/30 hover:bg-gray-900 transition-all duration-300">
					<div class="text-3xl mb-4">{feat.icon}</div>
					<h3 class="text-base font-bold text-white mb-2">{feat.title}</h3>
					<p class="text-sm text-gray-500 leading-relaxed">{feat.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- HOW IT WORKS -->
<section id="how-it-works" class="bg-gray-900/30 py-28 border-y border-white/5">
	<div class="mx-auto max-w-4xl px-6 text-center">
		<h2 class="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">Up and running in minutes.</h2>
		<p class="text-gray-400 mb-16">No DevOps PhD required.</p>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
			{#each [
				{ step: '01', title: 'Connect Your Droplet', desc: 'Run our one-line install script on your DigitalOcean droplet. Done in 30 seconds.' },
				{ step: '02', title: 'Add Your First Site', desc: 'Paste your GitHub repo URL, your domain, your build command. We handle the rest.' },
				{ step: '03', title: 'Hit Deploy', desc: 'Your site is cloned, built, SSL-secured, and live. Watch it happen in real time.' }
			] as item}
				<div class="relative">
					<div class="flex items-center justify-center w-12 h-12 rounded-full border border-green-500/30 bg-green-500/10 mx-auto mb-5">
						<span class="text-xs font-black font-mono text-green-400">{item.step}</span>
					</div>
					<h3 class="font-bold text-white mb-2">{item.title}</h3>
					<p class="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- PRICING -->
<section id="pricing" class="bg-gray-950 py-28">
	<div class="mx-auto max-w-5xl px-6">
		<div class="text-center mb-16">
			<h2 class="text-3xl sm:text-4xl font-black text-white tracking-tight">Simple pricing.<br /><span class="text-gray-500">No surprises.</span></h2>
			<p class="mt-4 text-gray-400">Stop paying per-site fees. Pay once, deploy everything.</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<!-- Starter -->
			<div class="rounded-2xl border border-white/10 bg-gray-900/60 p-7 flex flex-col">
				<h3 class="text-sm font-semibold text-gray-400 uppercase tracking-widest">Starter</h3>
				<div class="mt-4 flex items-end gap-1">
					<span class="text-4xl font-black text-white">Free</span>
				</div>
				<p class="mt-2 text-sm text-gray-500">Perfect for getting started and testing the platform.</p>
				<ul class="mt-6 space-y-3 flex-1">
					{#each ['1 Droplet', '3 Sites', 'Deployment Logs', 'Auto SSL', 'Community Support'] as feat}
						<li class="flex items-center gap-2 text-sm text-gray-400">
							<svg class="h-4 w-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
							{feat}
						</li>
					{/each}
				</ul>
				<a href="/auth/register" class="mt-8 block rounded-xl border border-white/10 bg-white/5 py-2.5 text-center text-sm font-semibold text-white hover:bg-white/10 transition-colors">
					Get Started Free
				</a>
			</div>

			<!-- Agency (featured) -->
			<div class="rounded-2xl border border-green-500/40 bg-gray-900 p-7 flex flex-col relative overflow-hidden shadow-xl shadow-green-500/10">
				<div class="absolute top-4 right-4 rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-bold text-green-400">Most Popular</div>
				<h3 class="text-sm font-semibold text-green-400 uppercase tracking-widest">Agency</h3>
				<div class="mt-4 flex items-end gap-1">
					<span class="text-4xl font-black text-white">$29</span>
					<span class="text-gray-500 mb-1">/month</span>
				</div>
				<p class="mt-2 text-sm text-gray-400">For agencies deploying multiple client sites.</p>
				<ul class="mt-6 space-y-3 flex-1">
					{#each ['3 Droplets', 'Unlimited Sites', 'Real-time Server Stats', 'Priority Support', 'Team Access', 'Custom Environments'] as feat}
						<li class="flex items-center gap-2 text-sm text-gray-300">
							<svg class="h-4 w-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
							{feat}
						</li>
					{/each}
				</ul>
				<a href="/auth/register" class="mt-8 block rounded-xl bg-green-500 py-2.5 text-center text-sm font-bold text-gray-950 hover:bg-green-400 transition-colors">
					Start Agency Plan
				</a>
			</div>

			<!-- Enterprise -->
			<div class="rounded-2xl border border-white/10 bg-gray-900/60 p-7 flex flex-col">
				<h3 class="text-sm font-semibold text-gray-400 uppercase tracking-widest">Enterprise</h3>
				<div class="mt-4 flex items-end gap-1">
					<span class="text-4xl font-black text-white">Custom</span>
				</div>
				<p class="mt-2 text-sm text-gray-500">For large teams needing white-label and advanced controls.</p>
				<ul class="mt-6 space-y-3 flex-1">
					{#each ['Unlimited Droplets', 'White-label Dashboard', 'SSO / SAML', 'SLA Guarantee', 'Dedicated Support', 'Custom Integrations'] as feat}
						<li class="flex items-center gap-2 text-sm text-gray-400">
							<svg class="h-4 w-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
							{feat}
						</li>
					{/each}
				</ul>
				<a href="mailto:hello@syncship.ink" class="mt-8 block rounded-xl border border-white/10 bg-white/5 py-2.5 text-center text-sm font-semibold text-white hover:bg-white/10 transition-colors">
					Contact Us
				</a>
			</div>
		</div>
	</div>
</section>

<!-- CTA BANNER -->
<section class="bg-gray-900/50 border-y border-white/5 py-20">
	<div class="mx-auto max-w-3xl px-6 text-center">
		<h2 class="text-3xl sm:text-4xl font-black text-white tracking-tight">Ready to ship faster?</h2>
		<p class="mt-4 text-gray-400">Join agencies already using SyncShip to deploy client sites in seconds.</p>
		<a href="/auth/register" class="mt-8 inline-block rounded-xl bg-green-500 px-10 py-3.5 text-base font-bold text-gray-950 hover:bg-green-400 transition-all hover:scale-105 shadow-lg shadow-green-500/20">
			Get Started Free →
		</a>
	</div>
</section>

<!-- FOOTER -->
<footer class="bg-gray-950 border-t border-white/5 py-12">
	<div class="mx-auto max-w-7xl px-6">
		<div class="flex flex-col md:flex-row items-center justify-between gap-6">
			<div class="flex items-center gap-2.5">
				<div class="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500">
					<svg class="h-3.5 w-3.5 text-gray-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7" />
					</svg>
				</div>
				<span class="text-sm font-bold text-white">SyncShip</span>
				<span class="text-gray-600 text-sm">— Ship your clients' sites, not your sanity.</span>
			</div>
			<div class="flex items-center gap-6">
				<a href="#features" class="text-xs text-gray-600 hover:text-gray-400 transition-colors">Features</a>
				<a href="#pricing" class="text-xs text-gray-600 hover:text-gray-400 transition-colors">Pricing</a>
				<a href="/auth/login" class="text-xs text-gray-600 hover:text-gray-400 transition-colors">Sign In</a>
				<a href="/auth/register" class="text-xs text-gray-600 hover:text-gray-400 transition-colors">Sign Up</a>
			</div>
		</div>
		<div class="mt-8 border-t border-white/5 pt-8 text-center">
			<p class="text-xs text-gray-700">© 2026 SyncShip. Built with ♥ for agencies.</p>
		</div>
	</div>
</footer>

<style>
	html { scroll-behavior: smooth; }
	.bg-grid-pattern {
		background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
		                  linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px);
		background-size: 60px 60px;
	}
</style>
