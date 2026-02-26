<svelte:head>
	<title>Privacy Policy | SyncShip</title>
</svelte:head>

<div class="min-h-screen bg-white py-16 px-6">
	<div class="mx-auto max-w-3xl">
		<a href="/" class="text-sm text-gray-500 hover:text-gray-900 transition-colors">&larr; Back to SyncShip</a>

		<h1 class="text-3xl font-bold text-gray-900 mt-6 mb-2">Privacy Policy</h1>
		<p class="text-sm text-gray-500 mb-10">Last updated: February 26, 2026</p>

		<div class="prose prose-gray prose-sm max-w-none">
			<h2>1. Introduction</h2>
			<p>SyncShip ("we", "our", "us") is a self-hosted deployment platform. This Privacy Policy explains how we collect, use, and protect your personal information when you use our service at syncship.ink.</p>

			<h2>2. Information We Collect</h2>
			<h3>Account Information</h3>
			<p>When you create an account, we collect your email address and display name. This information is stored in Firebase Authentication and Firestore.</p>

			<h3>Site & Deployment Data</h3>
			<p>When you create sites and deployments, we store your repository URLs, domain names, build commands, deployment logs, and environment variables. Environment variables are stored encrypted and are only used during the deployment process on your server.</p>

			<h3>GitHub Tokens</h3>
			<p>If you provide a GitHub Personal Access Token, it is stored in your Firestore settings document and is only used to authenticate with GitHub when pulling private repositories during deployments.</p>

			<h3>Server Statistics</h3>
			<p>Your daemon sends basic server health metrics (CPU, RAM usage, IP address) to Firestore for display in your dashboard.</p>

			<h2>3. How We Use Your Information</h2>
			<ul>
				<li>To provide and operate the deployment service</li>
				<li>To authenticate your identity and secure your account</li>
				<li>To deploy your code to your own server</li>
				<li>To display server health and deployment status in your dashboard</li>
			</ul>

			<h2>4. Data Storage & Security</h2>
			<p>Your data is stored in Google Cloud Firestore with security rules that enforce tenant isolation — you can only access your own data. GitHub tokens and environment variables are stored in your Firestore account and transmitted securely to your daemon over HTTPS.</p>

			<h2>5. Third-Party Services</h2>
			<p>We use the following third-party services:</p>
			<ul>
				<li><strong>Firebase/Google Cloud</strong> — Authentication and database</li>
				<li><strong>GitHub</strong> — Repository access for deployments</li>
				<li><strong>Let's Encrypt</strong> — Free SSL certificates</li>
				<li><strong>Google Public DNS</strong> — DNS propagation checks</li>
			</ul>

			<h2>6. Your Rights</h2>
			<p>You can:</p>
			<ul>
				<li>Access and export your data at any time through the dashboard</li>
				<li>Delete your account and all associated data</li>
				<li>Remove your GitHub token at any time</li>
				<li>Delete individual sites and their deployment history</li>
			</ul>

			<h2>7. Data Retention</h2>
			<p>We retain your data for as long as your account is active. When you delete a site or your account, the associated data is permanently removed from Firestore.</p>

			<h2>8. Children's Privacy</h2>
			<p>SyncShip is not intended for use by individuals under the age of 13. We do not knowingly collect personal information from children.</p>

			<h2>9. Changes to This Policy</h2>
			<p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.</p>

			<h2>10. Contact</h2>
			<p>If you have questions about this Privacy Policy, please contact us at <a href="mailto:support@syncship.ink" class="text-gray-900 underline">support@syncship.ink</a>.</p>
		</div>
	</div>
</div>
