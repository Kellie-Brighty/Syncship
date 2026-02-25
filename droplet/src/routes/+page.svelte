<script lang="ts">
	import { onMount } from 'svelte';
	import { Droplets, Rocket, Shield, Globe, GitBranch, Activity, Terminal, ChevronRight, Check } from 'lucide-svelte';

	let heroCanvas: HTMLCanvasElement;
	let animFrame: number;

	interface Drop { x:number; y:number; r:number; maxR:number; opacity:number; phase:'grow'|'hold'|'fade'; holdTimer:number; speed:number; }

	function initWaterDrops(canvas: HTMLCanvasElement) {
		const ctx = canvas.getContext('2d')!;

		function resize() {
			canvas.width  = canvas.offsetWidth  * window.devicePixelRatio;
			canvas.height = canvas.offsetHeight * window.devicePixelRatio;
			ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
		}

		// ── Condensation drops ──────────────────────────────
		interface CDrop { x:number; y:number; r:number; maxR:number; opacity:number; phase:'grow'|'hold'|'fade'; holdTimer:number; speed:number; }
		const drops: CDrop[] = [];

		function spawnDrop() {
			const maxR = 4 + Math.random() * 18;
			drops.push({ x:Math.random()*canvas.offsetWidth, y:Math.random()*canvas.offsetHeight,
				r:0, maxR, opacity:0, phase:'grow', holdTimer:90+Math.random()*120, speed:0.15+Math.random()*0.3 });
		}

		function drawDrop(d: CDrop) {
			if (d.r < 0.5) return;
			const {x,y,r,opacity} = d;
			// frosted glass body
			const body = ctx.createRadialGradient(x-r*0.3,y-r*0.35,r*0.02, x,y,r);
			body.addColorStop(0, `rgba(255,255,255,${opacity*0.70})`);
			body.addColorStop(0.5,`rgba(220,232,245,${opacity*0.18})`);
			body.addColorStop(1,  `rgba(185,210,230,${opacity*0.30})`);
			ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
			ctx.fillStyle = body; ctx.fill();
			// border
			ctx.strokeStyle=`rgba(255,255,255,${opacity*0.55})`; ctx.lineWidth=0.7; ctx.stroke();
			// highlight
			ctx.beginPath(); ctx.arc(x-r*0.28,y-r*0.32,r*0.25,0,Math.PI*2);
			ctx.fillStyle=`rgba(255,255,255,${opacity*0.70})`; ctx.fill();
		}

		// ── Water streaks ────────────────────────────────────
		interface Streak { x:number; y:number; length:number; width:number; opacity:number; speed:number; wiggle:number; phase:'fall'|'fade'; }
		const streaks: Streak[] = [];

		function spawnStreak() {
			streaks.push({
				x: 30+Math.random()*(canvas.offsetWidth-60),
				y: -40,
				length: 30+Math.random()*80,
				width: 1+Math.random()*2.5,
				opacity: 0.18+Math.random()*0.28,
				speed: 0.6+Math.random()*1.4,
				wiggle: (Math.random()-0.5)*0.6,
				phase: 'fall'
			});
		}

		function drawStreak(s: Streak) {
			const grad = ctx.createLinearGradient(s.x, s.y, s.x+s.wiggle*s.length*0.3, s.y+s.length);
			grad.addColorStop(0, `rgba(255,255,255,0)`);
			grad.addColorStop(0.3, `rgba(210,228,245,${s.opacity})`);
			grad.addColorStop(0.85,`rgba(200,222,240,${s.opacity*0.8})`);
			grad.addColorStop(1, `rgba(255,255,255,0)`);
			ctx.beginPath();
			ctx.moveTo(s.x, s.y);
			ctx.quadraticCurveTo(s.x+s.wiggle*20, s.y+s.length*0.5, s.x+s.wiggle*10, s.y+s.length);
			ctx.strokeStyle = grad;
			ctx.lineWidth = s.width;
			ctx.lineCap = 'round';
			ctx.stroke();
		}

		function tick() {
			ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

			// spawn drops
			if (drops.length < 35 && Math.random() < 0.06) spawnDrop();
			// spawn streaks
			if (streaks.length < 12 && Math.random() < 0.015) spawnStreak();

			// draw & update streaks first (behind drops)
			for (let i=streaks.length-1; i>=0; i--) {
				const s = streaks[i];
				drawStreak(s);
				if (s.phase === 'fall') {
					s.y += s.speed;
					if (s.y > canvas.offsetHeight + 20) { streaks.splice(i,1); continue; }
				}
			}

			// draw & update condensation drops
			for (let i=drops.length-1; i>=0; i--) {
				const d = drops[i];
				if (d.phase==='grow') {
					d.r += d.speed; d.opacity = Math.min(0.88, d.opacity+0.025);
					if (d.r>=d.maxR) d.phase='hold';
				} else if (d.phase==='hold') {
					d.holdTimer--;
					if (d.holdTimer<=0) d.phase='fade';
				} else {
					d.opacity -= 0.010;
					if (d.opacity<=0) { drops.splice(i,1); continue; }
				}
				drawDrop(d);
			}

			animFrame = requestAnimationFrame(tick);
		}

		resize();
		window.addEventListener('resize', resize);
		// pre-seed
		for (let i=0; i<18; i++) {
			spawnDrop();
			const d=drops[i];
			d.r=Math.random()*d.maxR*0.8; d.opacity=0.3+Math.random()*0.5;
			d.phase = Math.random()>0.4 ? 'hold' : 'grow';
		}
		tick();
	}

	// ── Scroll reveal via IntersectionObserver ────────────────
	function initScrollReveal() {
		const els = document.querySelectorAll('.reveal');
		const obs = new IntersectionObserver((entries) => {
			entries.forEach((e) => {
				if (e.isIntersecting) {
					(e.target as HTMLElement).classList.add('revealed');
					obs.unobserve(e.target);
				}
			});
		}, { threshold: 0.12 });
		els.forEach(el => obs.observe(el));
	}

	// ── Smooth scroll helper ──────────────────────────────────
	function smoothTo(id: string) {
		return (e: MouseEvent) => {
			e.preventDefault();
			document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		};
	}

	onMount(() => {
		if (heroCanvas) initWaterDrops(heroCanvas);
		initScrollReveal();
		return () => cancelAnimationFrame(animFrame);
	});
</script>

<svelte:head>
	<title>SyncShip — Deploy Smarter. Ship Faster.</title>
	<meta name="description" content="The self-hosted deployment platform for agencies. Git-push to deploy. Your server. Your control." />
</svelte:head>

<!-- ─── NAVBAR ────────────────────────────────────────────────── -->
<header class="fixed top-0 inset-x-0 z-50 border-b border-gray-200/80 bg-white/70 backdrop-blur-xl">
	<div class="mx-auto max-w-7xl px-6 lg:px-8">
		<div class="flex h-16 items-center justify-between">
			<a href="/" class="flex items-center gap-x-2.5">
				<div class="rounded-lg bg-gray-900 p-1.5 shadow-sm">
					<Droplets class="h-4 w-4 text-white" />
				</div>
				<span class="text-lg font-bold tracking-tight text-gray-900">SyncShip</span>
			</a>

			<nav class="hidden md:flex items-center gap-8">
				<a href="#features"     onclick={smoothTo('features')}     class="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Features</a>
				<a href="#how-it-works" onclick={smoothTo('how-it-works')} class="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">How it works</a>
				<a href="#pricing"      onclick={smoothTo('pricing')}      class="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Pricing</a>
			</nav>

			<div class="flex items-center gap-3">
				<a href="/auth/login" class="hidden sm:block text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Sign in</a>
				<a href="/auth/register" class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 transition-colors shadow-sm">
					Get Started Free
				</a>
			</div>
		</div>
	</div>
</header>

<!-- ─── HERO ──────────────────────────────────────────────────── -->
<section class="relative min-h-screen flex items-center justify-center overflow-hidden pt-32 pb-24" style="background: linear-gradient(160deg, #e6ecf0 0%, #eef2f5 45%, #e2e8ed 100%);">
	<!-- Frosted glass texture overlay -->
	<div class="absolute inset-0 pointer-events-none" style="background: url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\") center/512px; opacity: 0.03;"></div>
	<!-- Glass shimmer bands -->
	<div class="absolute inset-0 pointer-events-none" style="background: linear-gradient(105deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.25) 60%, rgba(255,255,255,0) 100%);"></div>
	<!-- Bottom fog fade -->
	<div class="absolute bottom-0 inset-x-0 h-40 pointer-events-none" style="background: linear-gradient(to top, rgba(230,236,240,0.8), transparent);"></div>

	<!-- Water drop canvas -->
	<canvas bind:this={heroCanvas} class="absolute inset-0 w-full h-full pointer-events-none"></canvas>

	<div class="relative z-10 mx-auto max-w-5xl px-6 text-center">

		<h1 class="reveal fade-up delay-100 text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 tracking-tight leading-[1.05]">
			Ship Your Clients' Sites.
			<br />
			<span class="relative inline-block mt-2">
				<span class="relative z-10">Not Your Sanity.</span>
				<span class="absolute inset-x-0 bottom-1 h-4 bg-gray-200/80 -rotate-1 rounded"></span>
			</span>
		</h1>

		<p class="reveal fade-up delay-200 mt-7 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed font-medium">
			Git-push. Auto-build. Custom domain. Free SSL. All on <strong class="text-gray-900">your own Ubuntu server</strong>. No Vercel. No lock-in. No per-site fees.
		</p>

		<div class="reveal fade-up delay-300 mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
			<a href="/auth/register" class="cta-btn w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-8 py-3.5 text-base font-bold text-white hover:bg-gray-800 transition-all shadow-md">
				Start Deploying Free
				<ChevronRight class="h-4 w-4" />
			</a>
			<a href="#how-it-works" onclick={smoothTo('how-it-works')} class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white/70 backdrop-blur px-8 py-3.5 text-base font-semibold text-gray-700 hover:bg-white transition-colors shadow-sm">
				See How It Works
			</a>
		</div>

		<!-- Terminal card -->
		<div class="reveal fade-up delay-400 mt-16 mx-auto max-w-3xl rounded-2xl border border-gray-200/80 bg-white/60 backdrop-blur-xl shadow-xl overflow-hidden">
			<div class="flex items-center gap-2 border-b border-gray-100 px-4 py-3 bg-gray-50/80">
				<div class="h-3 w-3 rounded-full bg-red-400/80"></div>
				<div class="h-3 w-3 rounded-full bg-yellow-400/80"></div>
				<div class="h-3 w-3 rounded-full bg-green-400/80"></div>
				<span class="font-mono text-[10px] text-gray-400 uppercase tracking-widest ml-3">Terminal Output</span>
			</div>
			<div class="p-6 text-left space-y-2 font-mono text-sm leading-relaxed bg-gray-950 text-gray-300">
				<p class="text-gray-500 typing-line" style="animation-delay:0.6s">$ git push origin main</p>
				<p class="text-blue-400 typing-line"  style="animation-delay:0.9s">→ Pulling latest changes from GitHub...</p>
				<p class="typing-line"                style="animation-delay:1.2s">→ Injecting .env variables...</p>
				<p class="text-yellow-400 typing-line" style="animation-delay:1.5s">→ Running build: bun run build</p>
				<p class="typing-line"                style="animation-delay:1.8s">→ Nginx configured and reloaded</p>
				<p class="text-green-400 typing-line" style="animation-delay:2.1s">→ SSL certificate deployed ✓</p>
				<p class="text-green-400 font-bold typing-line" style="animation-delay:2.4s">✅ Deployed successfully in 34s</p>
			</div>
		</div>
	</div>
</section>

<!-- ─── STATS BAR ──────────────────────────────────────────────── -->
<section class="border-y border-gray-200 bg-white py-10">
	<div class="mx-auto max-w-5xl px-6">
		<div class="grid grid-cols-3 divide-x divide-gray-200">
			{#each [['50+', 'Sites Deployed'], ['99.9%', 'Uptime'], ['< 60s', 'Avg Deploy Time']] as [val, label]}
				<div class="reveal fade-up text-center px-8">
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
		<div class="text-center mb-16 reveal fade-up">
			<p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Features</p>
			<h2 class="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
				Everything built-in.<br /><span class="text-gray-400">Nothing held back.</span>
			</h2>
			<p class="mt-4 text-gray-500 max-w-xl mx-auto">Vercel-grade deployments on your own hardware. Built for agencies with multiple client sites.</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
			{#each [
				{ Icon: Terminal, title: 'Live Deployment Logs', desc: "Color-coded terminal streams live to your dashboard. Know exactly what's happening at every build step." },
				{ Icon: Shield, title: 'Auto SSL Certificates', desc: "Free Let's Encrypt certs provisioned automatically. Every site gets HTTPS from the first deploy." },
				{ Icon: Activity, title: 'Live Server Stats', desc: 'Real-time CPU & RAM usage pulled directly from your Ubuntu droplet. Stay on top of server health.' },
				{ Icon: Globe, title: 'Custom Domains', desc: 'Point any domain to your droplet. Nginx configured and reloaded automatically every single time.' },
				{ Icon: GitBranch, title: 'Git-Based Deploys', desc: 'Connect your GitHub repo once. Hit Re-deploy to pull the latest commit, build, and go live instantly.' },
				{ Icon: Rocket, title: 'Zero Vendor Lock-In', desc: 'Your server, your code, your data. Cancel anytime without losing a single deployment or config.' }
			] as { Icon, title, desc }, i}
				<div class="reveal fade-up feature-card group rounded-2xl border border-gray-200/80 bg-white/70 backdrop-blur-sm p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
					style="animation-delay: {i * 80}ms">
					<div class="mb-4 inline-flex items-center justify-center rounded-xl bg-gray-100 p-3 group-hover:bg-gray-900 transition-colors duration-300">
						<Icon class="h-5 w-5 text-gray-700 group-hover:text-white transition-colors duration-300" />
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
		<div class="reveal fade-up mb-16">
			<p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">How It Works</p>
			<h2 class="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-4">Up and running in minutes.</h2>
			<p class="text-gray-500 max-w-md mx-auto">No DevOps degree. No YAML nightmares. Just a form, your repo, and one button.</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
			{#each [
				{ step: '01', title: 'Connect Your Droplet', desc: 'Run the one-line daemon installer on your Ubuntu server. Done in under a minute.' },
				{ step: '02', title: 'Add Your Site', desc: 'Paste your GitHub repo URL, custom domain, and build command. Environment variables stored securely.' },
				{ step: '03', title: 'Hit Deploy', desc: 'SyncShip clones your repo, builds it, configures Nginx, provisions SSL, and makes it live — while you watch.' }
			] as item, i}
				<div class="reveal fade-up rounded-2xl border border-gray-200/80 bg-gray-50/80 p-6 shadow-sm" style="animation-delay: {i * 100}ms">
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
		<div class="text-center mb-16 reveal fade-up">
			<p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Pricing</p>
			<h2 class="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
				Simple pricing.<br /><span class="text-gray-400">No surprises.</span>
			</h2>
			<p class="mt-4 text-gray-500">Stop paying per-site. Pay once, deploy everything.</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<!-- Starter -->
			<div class="reveal fade-up delay-100 rounded-2xl border border-gray-200 bg-white/80 backdrop-blur p-7 flex flex-col shadow-sm">
				<p class="text-xs font-bold uppercase tracking-widest text-gray-400">Starter</p>
				<div class="mt-4"><span class="text-4xl font-black text-gray-900">Free</span></div>
				<p class="mt-2 text-sm text-gray-500">Perfect for testing and small projects.</p>
				<ul class="mt-6 space-y-3 flex-1">
					{#each ['1 Droplet', '3 Sites', 'Deployment Logs', 'Auto SSL', 'Community Support'] as f}
						<li class="flex items-center gap-2 text-sm text-gray-600"><Check class="h-4 w-4 text-gray-400 shrink-0" />{f}</li>
					{/each}
				</ul>
				<a href="/auth/register" class="mt-8 block rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors">Get Started Free</a>
			</div>

			<!-- Agency -->
			<div class="reveal fade-up delay-200 rounded-2xl border border-gray-900 bg-gray-900 p-7 flex flex-col relative overflow-hidden shadow-xl">
				<div class="absolute top-4 right-4 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider">Most Popular</div>
				<p class="text-xs font-bold uppercase tracking-widest text-gray-400">Agency</p>
				<div class="mt-4 flex items-end gap-1">
					<span class="text-4xl font-black text-white">$29</span>
					<span class="text-gray-500 mb-1 text-sm">/month</span>
				</div>
				<p class="mt-2 text-sm text-gray-400">For agencies managing multiple client sites.</p>
				<ul class="mt-6 space-y-3 flex-1">
					{#each ['3 Droplets', 'Unlimited Sites', 'Real-time Server Stats', 'Priority Support', 'Team Access', 'Custom Environments'] as f}
						<li class="flex items-center gap-2 text-sm text-gray-300"><Check class="h-4 w-4 text-gray-400 shrink-0" />{f}</li>
					{/each}
				</ul>
				<a href="/auth/register" class="mt-8 block rounded-xl bg-white py-2.5 text-center text-sm font-bold text-gray-900 hover:bg-gray-100 transition-colors">Start Agency Plan</a>
			</div>

			<!-- Enterprise -->
			<div class="reveal fade-up delay-300 rounded-2xl border border-gray-200 bg-white/80 backdrop-blur p-7 flex flex-col shadow-sm">
				<p class="text-xs font-bold uppercase tracking-widest text-gray-400">Enterprise</p>
				<div class="mt-4"><span class="text-4xl font-black text-gray-900">Custom</span></div>
				<p class="mt-2 text-sm text-gray-500">White-label, SSO, and custom SLAs for large teams.</p>
				<ul class="mt-6 space-y-3 flex-1">
					{#each ['Unlimited Droplets', 'White-label Dashboard', 'SSO / SAML', 'SLA Guarantee', 'Dedicated Support', 'Custom Integrations'] as f}
						<li class="flex items-center gap-2 text-sm text-gray-600"><Check class="h-4 w-4 text-gray-400 shrink-0" />{f}</li>
					{/each}
				</ul>
				<a href="mailto:hello@syncship.ink" class="mt-8 block rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors">Contact Us</a>
			</div>
		</div>
	</div>
</section>

<!-- ─── CTA ───────────────────────────────────────────────────── -->
<section class="bg-white border-t border-gray-100 py-24">
	<div class="mx-auto max-w-3xl px-6 text-center reveal fade-up">
		<div class="inline-flex items-center justify-center rounded-2xl bg-gray-900 p-4 mb-6 shadow-md">
			<Droplets class="h-8 w-8 text-white" />
		</div>
		<h2 class="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Ready to ship faster?</h2>
		<p class="mt-4 text-gray-500 max-w-md mx-auto">Join agencies already using SyncShip to deploy client sites on their own terms.</p>
		<a href="/auth/register" class="cta-btn mt-8 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-10 py-3.5 text-base font-bold text-white hover:bg-gray-800 transition-all shadow-md">
			Get Started Free <ChevronRight class="h-4 w-4" />
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
				<a href="#features"     onclick={smoothTo('features')}     class="text-xs text-gray-400 hover:text-gray-700 transition-colors">Features</a>
				<a href="#how-it-works" onclick={smoothTo('how-it-works')} class="text-xs text-gray-400 hover:text-gray-700 transition-colors">How it works</a>
				<a href="#pricing"      onclick={smoothTo('pricing')}      class="text-xs text-gray-400 hover:text-gray-700 transition-colors">Pricing</a>
				<a href="/auth/login"    class="text-xs text-gray-400 hover:text-gray-700 transition-colors">Sign In</a>
			</div>
		</div>
		<div class="mt-8 pt-6 border-t border-gray-200 text-center">
			<p class="text-xs text-gray-400">© 2026 SyncShip. Built with ♥ for agencies.</p>
		</div>
	</div>
</footer>

<style>
	/* ── Smooth scroll ───────────── */
	:global(html) { scroll-behavior: smooth; }

	/* ── Scroll reveal ───────────── */
	:global(.reveal) {
		opacity: 0;
		transform: translateY(28px);
		transition: opacity 0.65s cubic-bezier(0.22,1,0.36,1),
		            transform 0.65s cubic-bezier(0.22,1,0.36,1);
	}
	:global(.reveal.revealed) {
		opacity: 1;
		transform: translateY(0);
	}
	:global(.fade-up) { transform: translateY(28px); }
	:global(.delay-100) { transition-delay: 0.10s; }
	:global(.delay-200) { transition-delay: 0.20s; }
	:global(.delay-300) { transition-delay: 0.30s; }
	:global(.delay-400) { transition-delay: 0.40s; }

	/* ── Terminal line fade-in ───── */
	:global(.typing-line) {
		opacity: 0;
		animation: line-appear 0.45s ease forwards;
	}
	@keyframes line-appear {
		from { opacity: 0; transform: translateX(-6px); }
		to   { opacity: 1; transform: translateX(0); }
	}

	/* ── CTA button pulse hover ──── */
	:global(.cta-btn) {
		position: relative;
		overflow: hidden;
	}
	:global(.cta-btn::after) {
		content: '';
		position: absolute;
		inset: 0;
		background: rgba(255,255,255,0.08);
		opacity: 0;
		transition: opacity 0.2s;
	}
	:global(.cta-btn:hover::after) { opacity: 1; }
	:global(.cta-btn:active) { transform: scale(0.97); }

	/* ── Feature card shine effect ─ */
	:global(.feature-card) {
		position: relative;
		overflow: hidden;
	}
	:global(.feature-card::before) {
		content: '';
		position: absolute;
		top: -60%; left: -60%;
		width: 50%; height: 50%;
		background: radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%);
		transform: rotate(-30deg);
		opacity: 0;
		transition: opacity 0.4s, transform 0.6s;
		pointer-events: none;
	}
	:global(.feature-card:hover::before) {
		opacity: 1;
		transform: rotate(-30deg) translate(60%, 60%);
	}
</style>
