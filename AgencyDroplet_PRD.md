# AgencyDroplet: Product Requirements Document

## 1. EXECUTIVE SUMMARY

AgencyDroplet is a self-hosted PaaS (Platform as a Service) dashboard sold as a one-time lifetime license to web development agencies. It installs on standard Linux VPS infrastructure (like a $5 DigitalOcean droplet) to provide a premium, Vercel-like UX for deploying and managing unlimited client static sites and frontend apps. It fully automates Nginx configuration, Certbot SSL generation, and domain mapping, while completely eliminating recurring PaaS bandwidth and seat limits.

## 2. PROBLEM STATEMENT

**The Problem:** Modern web development agencies rely heavily on cloud PaaS providers like Vercel and Netlify for seamless deployments. However, these platforms have shifted their pricing models, leading to unpredictable, exorbitant bandwidth bills and expensive per-seat costs that eat directly into agency margins.
**Impact:** Agencies are penalised for creating high-traffic, successful sites for their clients.
**Alternative:** The alternative is manually configuring Linux VPS servers via SSH, writing Nginx configurations, and setting up Certbot SSLs. This is slow, unscalable, and requires dedicated DevOps knowledge.

## 3. TARGET MARKET

**TAM:** All web developers and software engineers worldwide.
**SAM:** Web design and development agencies, and full-time freelancers.
**SOM:** Agencies building primarily static sites, SPAs, and Jamstack apps that are feeling the pain of recurring PaaS fees.
**Primary Persona:** Technical Agency Owner or Lead Developer managing 10 to 50+ client websites. Needs speed, reliability, and to maximize profit margins on hosting retainers.

## 4. SOLUTION

**Product Vision:** Become the industry standard self-hosted deployment tool for agencies, bridging the gap between DevOps freedom and Vercel-like developer experience.
**Core Value Proposition:** Get the deployment magic of Vercel on your own $5 server. No bandwidth taxes. No seat limits. Just a beautiful, white-labeled dashboard.
**Unique Differentiator:** The "Client Portal". Agencies can give clients read-only access to a branded dashboard to view their site's deploy status and metrics, professionalizing the agency's offering.

## 5. DETAILED FEATURE SPEC

### MVP Scope:

- **One-Click Installation:** A single bash script `curl -sL [url] | bash` to install AgencyDroplet on a fresh Ubuntu server.
- **Dashboard UI:** A clean, modern React/Svelte dashboard to view all deployed sites, server health (CPU/RAM), and connection status.
- **GitHub Integration:** Connect a GitHub repo and auto-deploy static sites on `git push`.
- **Domain & SSL Automation:** Add a custom domain, and the system automatically writes the Nginx block and provisions a Let's Encrypt SSL via Certbot.
- **Client Portal (Read-Only):** A simple white-labeled view where agency clients can log in and see their specific site's status.

## 6. TECHNICAL ARCHITECTURE

- **Backend:** Node.js or Go. Must run as a daemon (systemd service) with root permissions to execute `nginx` and `certbot` commands safely.
- **Frontend:** SvelteKit + Tailwind CSS for a breathtaking, ultra-fast dashboard.
- **Database:** SQLite (local file database) to minimize memory footprint and keep the installation self-contained.
- **Deployment Mechanics:** The agent listens for GitHub webhooks, pulls the repo, runs the build command (e.g., `npm run build`), copies the output to `/var/www/`, and reloads Nginx.

## 7. BUSINESS MODEL

**Revenue Streams:** One-time lifetime license fee of $199.
**Strategy:** Capture the "anti-subscription" movement. The high lifetime value is captured immediately, and since there are zero ongoing hosting costs for the company (the customer brings their own server), the gross margin per sale is near 100%.

## 8. GO-TO-MARKET

**Launch Strategy:** Target Twitter/X tech communities, indie hackers, and agency subreddits where the "Vercel pricing" pain point is actively discussed.
**Marketing:** "Host 100 client sites for $5/mo. The self-hosted PaaS for agencies."

## 9. SUCCESS METRICS

- **North Star:** Number of successful deployments through the platform.
- **Initial OKR:** 100 agencies purchasing the lifetime license in the first 3 months.

## 10. RISKS & MITIGATIONS

- **Technical Risk:** Users misconfiguring their base VPS. _Mitigation:_ The install script must strictly validate the environment (Ubuntu 22.04/24.04 only) before running.
- **Market Risk:** Competitors lowering prices. _Mitigation:_ Rely on the Client Portal and white-labeling to provide unique agency value beyond just cost-saving.

## 11. RESOURCE REQUIREMENTS

- 1x Full-Stack Developer to build the MVP Backend and Frontend.
- 1x Designer for brand assets and marketing site.

## 12. TIMELINE & MILESTONES

- **Month 1:** Backend CLI engine (Nginx/SSL automation).
- **Month 2:** SvelteKit Dashboard UI and GitHub webhooks.
- **Month 3:** Client Portal, documentation, and public launch.

---

### Implementation Architecture (Recommended Stack)

For building AgencyDroplet, the following Spawner skills are recommended:

1. **Frontend UI:** `SvelteKit` + `Tailwind CSS UI` for building the dashboard. It compiles to static files, making it incredibly fast.
2. **Backend Engine:** `Node.js` with `TypeScript Strict Mode` to execute shell commands securely and expose an API for the SvelteKit frontend.
3. **Database:** `SQLite` (via Prisma or Drizzle) to keep the entire software contained in a single binary/folder without requiring users to install Postgres.
