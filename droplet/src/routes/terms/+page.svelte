<script lang="ts">
	import { ArrowLeft, Mail, Gavel, ShieldAlert, CheckCircle, Info, Clock, ExternalLink } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Terms & Conditions | SyncShip</title>
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
			<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold uppercase tracking-wider mb-4 border border-indigo-100">
				<Gavel class="h-3.5 w-3.5" />
				Service Agreement
			</div>
			<h1 class="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">Terms & Conditions</h1>
			<div class="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
				<span class="flex items-center gap-1.5"><Clock class="h-4 w-4" /> Last updated: February 26, 2026</span>
				<span class="h-1 w-1 rounded-full bg-slate-300"></span>
				<span class="flex items-center gap-1.5"><Info class="h-4 w-4" /> Binding Agreement</span>
			</div>
		</header>

		<!-- Main Content Grid -->
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
			<!-- Summary Sidebar (Visible on Desktop) -->
			<aside class="hidden lg:block lg:col-span-4 sticky top-12 self-start">
				<div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
					<h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Key Takeaways</h3>
					<ul class="space-y-4">
						<li class="flex gap-3">
							<div class="flex-shrink-0 mt-1"><CheckCircle class="h-4 w-4 text-indigo-500" /></div>
							<p class="text-xs text-slate-600 leading-relaxed"><strong class="text-slate-900 block mb-0.5">Your Server</strong> You own the infrastructure; you're responsible for its security.</p>
						</li>
						<li class="flex gap-3">
							<div class="flex-shrink-0 mt-1"><ShieldAlert class="h-4 w-4 text-indigo-500" /></div>
							<p class="text-xs text-slate-600 leading-relaxed"><strong class="text-slate-900 block mb-0.5">Acceptable Use</strong> No malware, phishing, or illegal content deployments.</p>
						</li>
						<li class="flex gap-3">
							<div class="flex-shrink-0 mt-1"><ExternalLink class="h-4 w-4 text-indigo-500" /></div>
							<p class="text-xs text-slate-600 leading-relaxed"><strong class="text-slate-900 block mb-0.5">3rd Parties</strong> We integrate with GitHub; their terms still apply to you.</p>
						</li>
					</ul>
				</div>
			</aside>

			<!-- Detailed Terms Content -->
			<div class="lg:col-span-8 bg-white rounded-3xl p-8 sm:p-12 shadow-sm ring-1 ring-slate-200/60">
				<div class="prose prose-slate prose-lg max-w-none prose-headings:scroll-mt-24 prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600 prose-li:marker:text-indigo-500 prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline">
					<h2 id="acceptance">1. Acceptance of Terms</h2>
					<p>By accessing or using SyncShip ("the Service"), you agree to be bound by these Terms & Conditions. If you do not agree to these terms, please do not use or access the Service.</p>

					<h2 id="description">2. Description of Service</h2>
					<p>SyncShip is a self-hosted deployment platform that allows you to deploy static websites and backend applications to your own servers. SyncShip provides the management dashboard and deployment daemon; <strong>you provide and manage the underlying server infrastructure</strong>.</p>

					<h2 id="responsibilities">3. Account Responsibilities</h2>
					<p>To ensure a secure environment, you agree to the following:</p>
					<ul>
						<li>You are responsible for maintaining the security of your account credentials.</li>
						<li>You are responsible for all activity that occurs under your account.</li>
						<li>You must provide accurate information when creating your account.</li>
						<li>You must be at least 13 years old to use the Service.</li>
					</ul>

					<h2 id="infrastructure">4. Your Server & Infrastructure</h2>
					<p>SyncShip operates on servers that <strong>you</strong> own and manage. You are solely responsible for:</p>
					<ul>
						<li>The security and ongoing maintenance of your server.</li>
						<li>Any costs associated with your server hosting (e.g., DigitalOcean, AWS).</li>
						<li>Compliance with your server provider's terms of service.</li>
						<li>Backing up your data and code.</li>
					</ul>

					<h2 id="acceptable-use">5. Acceptable Use</h2>
					<p>You agree not to use SyncShip for any illegal or unauthorized purposes. Specifically, you will not:</p>
					<ul>
						<li>Deploy malicious software, malware, or any content that violates laws.</li>
						<li>Host phishing sites or engage in fraudulent activities.</li>
						<li>Infringe on the intellectual property rights of others.</li>
						<li>Attempt to gain unauthorized access to SyncShip's systems.</li>
						<li>Distribute spam or unsolicited communications.</li>
					</ul>

					<h2 id="integrations">6. GitHub & Third-Party Integrations</h2>
					<p>SyncShip integrates with GitHub and other third-party services. Your use of these services is governed by their respective terms. SyncShip is not responsible for the availability or functionality of third-party services.</p>

					<h2 id="secrets">7. Environment Variables & Secrets</h2>
					<p>While we take reasonable measures to protect your secrets, you acknowledge that you are responsible for the security of any secrets you store and should rotate them regularly.</p>

					<h2 id="availability">8. Service Availability</h2>
					<p>SyncShip is provided on an "as is" and "as available" basis. We do not guarantee uninterrupted or error-free service and reserve the right to modify or discontinue the Service at any time.</p>

					<h2 id="limitation">9. Limitation of Liability</h2>
					<p>To the maximum extent permitted by law, SyncShip and its creators shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.</p>

					<h2 id="ip">10. Intellectual Property</h2>
					<p>You retain full ownership of any code, content, and data you deploy. SyncShip retains ownership of the platform's proprietary code, design, and branding assets.</p>

					<h2 id="termination">11. Termination</h2>
					<p>We reserve the right to suspend or terminate your access for violation of these Terms. You may delete your account at any time through the dashboard settings.</p>

					<h2 id="changes">12. Changes to These Terms</h2>
					<p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the new Terms.</p>

					<h2 id="contact">13. Contact</h2>
					<div class="mt-8 rounded-2xl bg-indigo-50 border border-indigo-200 p-8 flex flex-col sm:flex-row items-center gap-6">
						<div class="h-14 w-14 rounded-2xl bg-white shadow-sm ring-1 ring-indigo-200 flex items-center justify-center flex-shrink-0">
							<Mail class="h-6 w-6 text-indigo-600" />
						</div>
						<div>
							<p class="text-sm text-slate-600 leading-relaxed mb-4">Have questions about our terms? We're here to clarify any points of the agreement.</p>
							<a href="mailto:support@syncship.ink" class="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-900 text-white text-sm font-semibold rounded-xl hover:bg-indigo-800 transition-colors">
								Contact Support
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
			<a href="/terms" class="text-slate-900 underline decoration-indigo-500 decoration-2 underline-offset-8">Terms of Service</a>
			<a href="/privacy" class="hover:text-slate-900 transition-colors hover:underline decoration-slate-300 underline-offset-4">Privacy Policy</a>
		</div>
	</div>
</div>
