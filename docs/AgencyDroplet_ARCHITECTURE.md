# AgencyDroplet: Architecture & Implementation Plan

## 1. Recommended Tech Stack

- **Frontend**: SvelteKit - Chosen for its simpler mental model, superior out-of-the-box performance, and elegant form actions/load functions.
- **Styling**: Tailwind CSS
- **Backend/Database**: Node.js with SQLite (via Prisma or Drizzle) to keep the entire software contained in a single binary/folder without requiring users to install Postgres.
- **Authentication**: Local DB authentication (JWT or Session-based) to ensure it remains a self-hosted single-tenant solution.
- **Deployment Mechanics**: A local Node.js daemon running on the VPS, executing Nginx config reloads and Certbot provisioning directly.

## 2. System Architecture

- **AgencyDroplet Daemon (Node.js)**: Runs securely on the host Ubuntu server as a systemd service. It listens for incoming HTTP webhooks (from GitHub) and API requests from the SvelteKit dashboard.
- **SvelteKit Dashboard**: Served locally or via the daemon, communicating with the local Node.js API to update deployment configurations, fetch server stats, and manage client portals.
- **Proxy/Web Server (Nginx)**: The daemon dynamically updates `/etc/nginx/sites-available/` and reloads Nginx to route client domains to the correct static assets in `/var/www/`.
- **SSL Manager (Certbot)**: Integrated via shell execution from the Node daemon to automatically provision Let's Encrypt certificates for newly added domains.

## 3. Data Model (Firebase Firestore)

- **Users Collection**: Admin (Agency) and Clients (read-only access).
- **Projects/Sites Collection**: Stores connected repo, build ID, domain names, base directory, and deployment status.
- **Deployments Collection**: Logs of build processes, success/failure status, timestamps, and commit hashes.
- **ServerStats Collection**: Historical RAM/CPU usage for dashboard visualization.

## 4. Spawner Skills for Building

| Phase    | Spawner Skill        | What It Provides                                   |
| -------- | -------------------- | -------------------------------------------------- |
| Setup    | `sveltekit-setup`    | SvelteKit project initialization with Tailwind     |
| Database | `firebase-firestore` | Firestore setup with data modeling                 |
| Auth     | `firebase-auth`      | Secure authentication using Firebase               |
| UI       | `tailwind-dashboard` | Pre-built dashboard components and layouts         |
| API      | `nodejs-daemon`      | Secure execution of shell commands (Nginx/Certbot) |
| Testing  | `playwright-tests`   | E2E testing for the dashboard and deploy hooks     |
| Deploy   | `ubuntu-installer`   | Bash script generation for the 1-click install     |

## 5. Implementation Phases

**Phase 1: Foundation**

- [ ] Initialize SvelteKit MVP and Tailwind CSS UI.
- [ ] Set up Firebase project and Firestore collections (Users, Sites, Deployments).
- [ ] Create authentication for the Agency Admin using Firebase Auth.

**Phase 2: Core Features**

- [ ] Develop the Node.js daemon to safely execute Nginx and Certbot commands.
- [ ] Implement GitHub webhook listeners to trigger `git pull` and build steps.
- [ ] Build the Dashboard UI to view active sites, server stats, and deploy logs.

**Phase 3: Polish & Launch**

- [ ] Build the read-only Client Portal interface.
- [ ] Package the installation into a single `curl | bash` script.
- [ ] Write documentation and launch assets.

## 6. Key Technical Decisions

- **Decision 1**: _Using Firebase over SQLite/Postgres_. This provides a managed, scalable NoSQL database and built-in authentication, reducing the operational burden on the self-hosted VPS while still allowing the core application to be independent.
- **Decision 2**: _Running Node.js as Root_. To modify Nginx and run Certbot, the daemon requires elevated privileges. We'll use strict input validation and command sanitization to prevent shell injection.

## 7. Getting Started

```bash
# Commands to initialize the project
npx sv create agencydroplet-dashboard
cd agencydroplet-dashboard
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```
