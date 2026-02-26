<script lang="ts">
	import { ArrowLeft, Mail, ShieldCheck, Lock, Eye, Trash2, Clock, Info } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Privacy Policy | SyncShip</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 py-20 px-6 sm:px-8">
	<div class="mx-auto max-w-4xl">
		<!-- Navigation -->
		<div class="mb-12">
			<a href="/" class="group inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-all">
				<div class="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 group-hover:ring-slate-300 transition-all">
					<ArrowLeft class="h-4 w-4" />
				</div>
				Back to SyncShip
			</a>
		</div>

		<!-- Header Section -->
		<header class="mb-16">
			<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold uppercase tracking-wider mb-4 border border-blue-100">
				<ShieldCheck class="h-3.5 w-3.5" />
				Your Data is Yours
			</div>
			<h1 class="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">Privacy Policy</h1>
			<div class="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
				<span class="flex items-center gap-1.5"><Clock class="h-4 w-4" /> Last updated: February 26, 2026</span>
				<span class="h-1 w-1 rounded-full bg-slate-300"></span>
				<span class="flex items-center gap-1.5"><Info class="h-4 w-4" /> Self-hosted platform</span>
			</div>
		</header>

		<!-- Main Content Grid -->
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
			<!-- Summary Sidebar (Visible on Desktop) -->
			<aside class="hidden lg:block lg:col-span-4 sticky top-12 self-start">
				<div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
					<h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Quick Summary</h3>
					<ul class="space-y-4">
						<li class="flex gap-3">
							<div class="flex-shrink-0 mt-1"><Lock class="h-4 w-4 text-blue-500" /></div>
							<p class="text-xs text-slate-600 leading-relaxed"><strong class="text-slate-900 block mb-0.5">Secure Storage</strong> Your secrets are stored with tenant-level isolation.</p>
						</li>
						<li class="flex gap-3">
							<div class="flex-shrink-0 mt-1"><Eye class="h-4 w-4 text-blue-500" /></div>
							<p class="text-xs text-slate-600 leading-relaxed"><strong class="text-slate-900 block mb-0.5">Strictly Necessary</strong> We only collect what's needed to build and deploy your site.</p>
						</li>
						<li class="flex gap-3">
							<div class="flex-shrink-0 mt-1"><Trash2 class="h-4 w-4 text-blue-500" /></div>
							<p class="text-xs text-slate-600 leading-relaxed"><strong class="text-slate-900 block mb-0.5">Right to Erasure</strong> Delete your account, and all associated data is gone forever.</p>
						</li>
					</ul>
				</div>
			</aside>

			<!-- Detailed Policy Content -->
			<div class="lg:col-span-8 bg-white rounded-3xl p-8 sm:p-12 shadow-sm ring-1 ring-slate-200/60">
				<div class="prose prose-slate prose-lg max-w-none prose-headings:scroll-mt-24 prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600 prose-li:marker:text-blue-500 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">
					<h2 id="introduction">1. Introduction</h2>
					<p>SyncShip ("we", "our", "us") is a self-hosted deployment platform. This Privacy Policy explains how we collect, use, and protect your personal information when you use our service at syncship.ink. By using our services, you consent to the data practices described in this policy.</p>

					<h2 id="information-we-collect">2. Information We Collect</h2>
					<h3 class="text-lg font-semibold text-slate-900 mt-8 mb-4">Account Information</h3>
					<p>When you create an account, we collect your email address and display name. This information is stored in Firebase Authentication and Firestore to manage your access and profile.</p>

					<h3 class="text-lg font-semibold text-slate-900 mt-8 mb-4">Site & Deployment Data</h3>
					<p>When you create sites and deployments, we store your repository URLs, domain names, build commands, deployment logs, and environment variables. <strong>Environment variables are encrypted at rest</strong> and are only used during the deployment process on your server.</p>

					<h3 class="text-lg font-semibold text-slate-900 mt-8 mb-4">GitHub Tokens</h3>
					<p>If you provide a GitHub Personal Access Token, it is stored in your Firestore settings document and is only used to authenticate with GitHub when pulling private repositories during deployments.</p>

					<h3 class="text-lg font-semibold text-slate-900 mt-8 mb-4">Server Statistics</h3>
					<p>Your daemon sends basic server health metrics (CPU, RAM usage, IP address) to Firestore for display in your dashboard, ensuring you have real-time visibility into your infrastructure.</p>

					<h2 id="how-we-use">3. How We Use Your Information</h2>
					<ul>
						<li>To provide and operate the deployment service</li>
						<li>To authenticate your identity and secure your account</li>
						<li>To deploy your code to your own server</li>
						<li>To display server health and deployment status in your dashboard</li>
					</ul>

					<h2 id="storage-security">4. Data Storage & Security</h2>
					<p>Your data is stored in Google Cloud Firestore with security rules that enforce <strong>strict tenant isolation</strong> — you can only access your own data. GitHub tokens and environment variables are stored in your Firestore account and transmitted securely to your daemon over HTTPS.</p>

					<h2 id="third-party">5. Third-Party Services</h2>
					<p>We use the following third-party services to ensure the best experience:</p>
					<ul>
						<li><strong>Firebase/Google Cloud</strong> — Authentication and database</li>
						<li><strong>GitHub</strong> — Repository access for deployments</li>
						<li><strong>Let's Encrypt</strong> — Free SSL certificates</li>
						<li><strong>Google Public DNS</strong> — DNS propagation checks</li>
					</ul>

					<h2 id="your-rights">6. Your Rights</h2>
					<p>We believe in full transparency and control over your data:</p>
					<ul>
						<li>Access and export your data at any time through the dashboard</li>
						<li>Delete your account and all associated data permanently</li>
						<li>Remove your GitHub token at any time</li>
						<li>Delete individual sites and their deployment history</li>
					</ul>

					<h2 id="retention">7. Data Retention</h2>
					<p>We retain your data for as long as your account is active. When you delete a site or your account, the associated data is permanently removed from Firestore instantly.</p>

					<h2 id="childrens-privacy">8. Children's Privacy</h2>
					<p>SyncShip is not intended for use by individuals under the age of 13. We do not knowingly collect personal information from children.</p>

					<h2 id="changes">9. Changes to This Policy</h2>
					<p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date at the top.</p>

					<h2 id="contact">10. Contact</h2>
					<div class="mt-8 rounded-2xl bg-slate-50 border border-slate-200 p-8 flex flex-col sm:flex-row items-center gap-6">
						<div class="h-14 w-14 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 flex items-center justify-center flex-shrink-0">
							<Mail class="h-6 w-6 text-blue-600" />
						</div>
						<div>
							<p class="text-sm text-slate-600 leading-relaxed mb-4">If you have questions about this Privacy Policy, our data practices, or your dealings with the Service, please reach out to us.</p>
							<a href="mailto:support@syncship.ink" class="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors">
								Email Support
							</a>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Footer -->
	<div class="mx-auto max-w-4xl mt-24 pt-12 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-6">
		<p class="text-xs text-slate-400">&copy; 2026 SyncShip. All rights reserved.</p>
		<div class="flex gap-10 text-sm font-semibold text-slate-600">
			<a href="/terms" class="hover:text-slate-900 transition-colors hover:underline decoration-slate-300 underline-offset-4">Terms of Service</a>
			<a href="/privacy" class="text-slate-900 underline decoration-blue-500 decoration-2 underline-offset-8">Privacy Policy</a>
		</div>
	</div>
</div>
