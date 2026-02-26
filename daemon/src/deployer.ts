import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import cliProgress from 'cli-progress';
import dns from 'dns';

const execAsync = promisify(exec);

const WEB_ROOT = process.env.WEB_ROOT || '/var/www';
const REPOS_DIR = process.env.REPOS_DIR || '/opt/agencydroplet/repos';
const APPS_DIR = process.env.APPS_DIR || '/opt/apps';

interface SiteConfig {
  id: string;
  name: string;
  domain: string;
  repo: string;
  branch: string;
  siteType: 'static' | 'backend';
  buildCommand: string;
  outputDir: string;
  startCommand?: string;
  port?: number;
  githubToken?: string;
  envVars?: string;
  abortSignal?: AbortSignal;
  onLog?: (logLine: string, fullLog: string) => Promise<void> | void;
  onPortAssigned?: (port: number) => Promise<void> | void;
}

/**
 * Deploy a site: clone/pull repo, build if needed, set up Nginx + SSL
 */
export async function deploySite(site: SiteConfig): Promise<{ success: boolean; duration: string; log: string; commitMessage: string }> {
  const startTime = Date.now();
  const logs: string[] = [];

  console.log(`\n▶️ Starting deployment for ${site.name}`);
  const progressBar = new cliProgress.SingleBar({
    format: `  📦 [{bar}] {percentage}% | {stepName}`,
    clearOnComplete: false,
    hideCursor: true
  }, cliProgress.Presets.shades_classic);

  progressBar.start(7, 0, { stepName: 'Initializing...' });
  let currentStep = 0;

  async function log(msg: string, stepIncrement = 0, stepName?: string) {
    if (stepIncrement > 0) {
      currentStep += stepIncrement;
      progressBar.update(currentStep, { stepName: stepName || msg });
      
      // Compute text-based progress bar to save to the logs database for the UI terminal
      const pct = Math.round((currentStep / 7) * 100);
      const filledLength = Math.round((currentStep / 7) * 20);
      const emptyLength = 20 - filledLength;
      const barStr = '█'.repeat(filledLength) + '░'.repeat(emptyLength);
      logs.push(`\n[📦 ${barStr}] ${currentStep}/7 | ${stepName || msg} (${pct}%)\n`);
    } else if (stepName) {
      progressBar.update(currentStep, { stepName });
    }
    
    // Always push the literal message as well
    logs.push(msg);
    
    if (site.onLog) {
      try { await site.onLog(msg, logs.join('\n')); } catch (e) { /* ignore */ }
    }
  }

  // Helper to execute commands and stream their output live
  async function execStream(command: string, options: { timeout?: number } = {}) {
    return new Promise<void>((resolve, reject) => {
      let timeoutId: NodeJS.Timeout;
      const child = exec(command, (error) => {
        if (timeoutId) clearTimeout(timeoutId);
        if (error) reject(error);
        else resolve();
      });

      if (options.timeout) {
        timeoutId = setTimeout(() => {
          // Use pkill to kill the whole process group since exec spawns a shell
          if (child.pid) exec(`pkill -P ${child.pid}`);
          reject(new Error(`Command timed out after ${options.timeout}ms`));
        }, options.timeout);
      }

      if (site.abortSignal) {
        site.abortSignal.addEventListener('abort', () => {
          if (timeoutId) clearTimeout(timeoutId);
          if (child.pid) exec(`pkill -P ${child.pid}`);
          reject(new Error('Deployment canceled'));
        }, { once: true });
      }

      if (child.stdout) {
        child.stdout.on('data', (data) => {
          const lines = data.toString().trim().split('\n');
          lines.forEach((l: string) => l && log(`    ${l}`));
        });
      }
      
      if (child.stderr) {
        child.stderr.on('data', (data) => {
          const lines = data.toString().trim().split('\n');
          lines.forEach((l: string) => l && log(`    ${l}`));
        });
      }
    });
  }

  try {
    if (site.abortSignal?.aborted) throw new Error('Deployment canceled');

    // 1. Ensure directories exist
    mkdirSync(REPOS_DIR, { recursive: true });
    mkdirSync(WEB_ROOT, { recursive: true });

    const repoDir = resolve(REPOS_DIR, site.id);
    const cleanDomain = site.domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const siteDir = resolve(WEB_ROOT, cleanDomain);

    // 2. Clone or pull the repo
    const isFullUrl = site.repo.startsWith('http');
    const safeRepoUrl = isFullUrl
      ? site.repo.replace(/\.git$/, '')
      : `https://github.com/${site.repo}`;

    // Inject token for private repos (only if it's a github.com or owner/repo format)
    let cloneUrl = safeRepoUrl;
    if (site.githubToken && safeRepoUrl.includes('github.com')) {
      cloneUrl = safeRepoUrl.replace('https://github.com/', `https://x-access-token:${site.githubToken}@github.com/`);
    }

    if (existsSync(repoDir)) {
      await log('Pulling latest changes...', 1, 'Fetching source code');
      // Note: If the token changes, pull might fail if the remote URL wasn't updated. For MVP we just pull.
      await execStream(`cd ${repoDir} && git remote set-url origin ${cloneUrl}.git && git fetch origin && git reset --hard origin/${site.branch}`, { timeout: 60000 });
    } else {
      await log(`Cloning ${site.repo}...`, 1, 'Cloning repository');
      await execStream(`git clone --branch ${site.branch} --single-branch ${cloneUrl}.git ${repoDir}`, { timeout: 120000 });
    }

    // Read the latest commit message to use as deployment title
    let commitMessage = 'Manual deployment';
    try {
      const { stdout } = await execAsync(`cd ${repoDir} && git log -1 --pretty=%s`);
      const msg = stdout.trim();
      if (msg) commitMessage = msg;
    } catch { /* fallback to default */ }

    await log('Repository ready');

    // 2.5 Inject Environment Variables if they exist
    if (site.envVars) {
      await log('Injecting stored .env variables...', 1, 'Configuring environment');
      writeFileSync(resolve(repoDir, '.env'), site.envVars);
    } else {
      await log('No .env variables to map', 1, 'Configuring environment');
    }

    // 3. Build if needed (framework projects)
    if (site.buildCommand) {
      if (site.abortSignal?.aborted) throw new Error('Deployment canceled');

      if (existsSync(resolve(repoDir, 'package.json'))) {
        await log(`Installing dependencies...`, 1, 'Installing dependencies');
        const hasYarnLock = existsSync(resolve(repoDir, 'yarn.lock'));
        const hasPnpmLock = existsSync(resolve(repoDir, 'pnpm-lock.yaml'));
        const installCmd = hasPnpmLock ? 'pnpm install' : hasYarnLock ? 'yarn install' : 'npm install';
        await execStream(`cd ${repoDir} && ${installCmd}`, { timeout: 300000 });
      } else {
        await log(`No package.json found in root. Skipping auto-install...`, 1, 'Preparing build');
      }

      await log(`Running build: ${site.buildCommand}`, 1, 'Building project');
      await execStream(`cd ${repoDir} && ${site.buildCommand}`, { timeout: 300000 });
      await log('Build complete');
    } else {
      await log('No build command specified, skipping build', 2, 'Skipping build');
    }

    // 4. Copy output to web root
    if (site.abortSignal?.aborted) throw new Error('Deployment canceled');
    let sourceDir = resolve(repoDir, site.outputDir || '.');

    // Auto-fallback if the specified outputDir doesn't exist (helpful for React 'build' vs Vue 'dist')
    if (site.outputDir && site.outputDir !== '.' && !existsSync(sourceDir)) {
      const fallbacks = ['dist', 'build', 'out'];
      for (const override of fallbacks) {
        const potentialDir = resolve(repoDir, override);
        if (existsSync(potentialDir)) {
          sourceDir = potentialDir;
          await log(`Output directory '${site.outputDir}' not found. Auto-detected '${override}' instead.`, 0, 'Deploying files');
          break;
        }
      }
    }

    if (site.outputDir !== '.' && !existsSync(sourceDir)) {
      throw new Error(`Output directory not found. The build did not produce the expected folder.`);
    }

    mkdirSync(siteDir, { recursive: true });
    await execStream(`rsync -a --delete ${sourceDir}/ ${siteDir}/`);
    await log(`Files deployed to ${siteDir}`, 1, 'Deploying files');

    // 5. Configure Nginx + optionally start PM2 process
    if (site.abortSignal?.aborted) throw new Error('Deployment canceled');

    if (site.siteType === 'backend') {
      // ── Backend deploy: PM2 + reverse proxy ──
      const appDir = resolve(APPS_DIR, cleanDomain);
      mkdirSync(appDir, { recursive: true });
      await execStream(`rsync -a --delete ${repoDir}/ ${appDir}/`);
      await log(`App files synced to ${appDir}`);

      // Install deps in app dir if package.json exists
      if (existsSync(resolve(appDir, 'package.json'))) {
        await log('Installing production dependencies in app dir...');
        const hasYarnLock = existsSync(resolve(appDir, 'yarn.lock'));
        const hasPnpmLock = existsSync(resolve(appDir, 'pnpm-lock.yaml'));
        const installCmd = hasPnpmLock ? 'pnpm install' : hasYarnLock ? 'yarn install' : 'npm install';
        await execStream(`cd ${appDir} && ${installCmd}`, { timeout: 300000 });
      }

      // Re-inject env vars into the app directory
      if (site.envVars) {
        writeFileSync(resolve(appDir, '.env'), site.envVars);
      }

      // Allocate or reuse port
      const port = site.port || await allocatePort();
      await log(`Assigned port: ${port}`);

      // Notify caller of the assigned port so it can be saved
      if (site.onPortAssigned) {
        await site.onPortAssigned(port);
      }

      // Stop existing PM2 process if running
      await stopBackendProcess(cleanDomain);

      // Start the backend process with PM2
      const startCmd = site.startCommand || 'node dist/index.js';
      await startBackendProcess(cleanDomain, appDir, startCmd, port, site.envVars);
      await log(`🚀 Backend process started on port ${port}`, 1, 'Starting backend');

      // Configure Nginx as reverse proxy
      await log('Configuring Nginx reverse proxy...', 1, 'Configuring Nginx');
      const nginxConfig = generateReverseProxyNginxConfig(cleanDomain, port);
      writeFileSync(`/etc/nginx/sites-available/${cleanDomain}`, nginxConfig);
    } else {
      // ── Static deploy: serve files directly ──
      await log('Configuring Nginx...', 1, 'Configuring Nginx');
      const nginxConfig = generateNginxConfig(cleanDomain, siteDir);
      writeFileSync(`/etc/nginx/sites-available/${cleanDomain}`, nginxConfig);
    }

    // Enable site (symlink)
    const enabledPath = `/etc/nginx/sites-enabled/${cleanDomain}`;
    if (!existsSync(enabledPath)) {
      await execStream(`ln -sf /etc/nginx/sites-available/${cleanDomain} ${enabledPath}`);
    }

    // Test and reload Nginx
    await execStream('nginx -t');
    await execStream('systemctl reload nginx');
    await log('Nginx configured and reloaded');

    // 6. SSL certificate (Certbot) & DNS Check
    if (site.abortSignal?.aborted) throw new Error('Deployment canceled');
    await log('Setting up SSL...', 1, 'Setting up SSL');

    try {
      // Fetch Droplet IP
      const ipRes = await fetch('https://api.ipify.org');
      const dropletIp = await ipRes.text();

      // Check Domain DNS
      let dnsMatches = false;
      try {
        const records = await dns.promises.resolve4(cleanDomain);
        dnsMatches = records.includes(dropletIp);
      } catch (dnsErr) {
        // Domain might not exist yet or no A records
        dnsMatches = false;
      }

      if (dnsMatches) {
        await execStream(`certbot --nginx -d ${cleanDomain} --non-interactive --agree-tos --email admin@${cleanDomain} --redirect`, { timeout: 120000 });
        await log('SSL certificate installed');
      } else {
        await log(`⚠️ DNS for ${cleanDomain} has not fully propagated to this Droplet's IP (${dropletIp}) yet. Skipping SSL generation.`);
        await log('💡 The site is live on HTTP. Please wait ~10 minutes and click "Re-Deploy" to try installing SSL again.');
      }
    } catch (sslErr: any) {
      await log(`SSL warning: ${sslErr.message} (site will still work on HTTP)`);
    }

    progressBar.update(7, { stepName: 'Done' });
    progressBar.stop();
    const duration = formatDuration(Date.now() - startTime);
    await log(`✅ Deployed successfully in ${duration}`);

    return { success: true, duration, log: logs.join('\n'), commitMessage };

  } catch (err: any) {
    progressBar.stop();
    const duration = formatDuration(Date.now() - startTime);
    await log(`❌ Deploy failed: ${err.message}`);
    return { success: false, duration, log: logs.join('\n'), commitMessage: 'Manual deployment' };
  } finally {
    // Clean up server space post-deployment (logs and cache)
    try {
      await execAsync('npm cache clean --force');
      await execAsync('pm2 flush');
    } catch { /* Ignore cleanup errors so they don't break the return */ }
  }
}

function generateNginxConfig(domain: string, webRoot: string): string {
  return `server {
    listen 80;
    server_name ${domain};

    root ${webRoot};
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
`;
}

function generateReverseProxyNginxConfig(domain: string, port: number): string {
  return `server {
    listen 80;
    server_name ${domain};

    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
`;
}

async function allocatePort(): Promise<number> {
  const BASE_PORT = 3001;
  try {
    const { stdout } = await execAsync('pm2 jlist');
    const processes = JSON.parse(stdout);
    const usedPorts = new Set<number>();
    for (const proc of processes) {
      // Check env vars for PORT
      const envPort = proc.pm2_env?.env?.PORT || proc.pm2_env?.PORT;
      if (envPort) usedPorts.add(Number(envPort));
    }
    let port = BASE_PORT;
    while (usedPorts.has(port)) port++;
    return port;
  } catch {
    return BASE_PORT;
  }
}

async function stopBackendProcess(domain: string): Promise<void> {
  try {
    await execAsync(`pm2 delete ${domain}`);
  } catch {
    // Process might not exist yet, that's fine
  }
}

async function startBackendProcess(
  domain: string,
  appDir: string,
  startCommand: string,
  port: number,
  envVars?: string
): Promise<void> {
  // Parse the start command into script + args
  const parts = startCommand.split(' ');
  const script = parts[0];
  const args = parts.slice(1).join(' ');

  // Build PM2 start command with PORT env var
  const envStr = `PORT=${port}`;
  const pm2Cmd = `cd ${appDir} && ${envStr} pm2 start ${script} --name ${domain} -- ${args}`;
  await execAsync(pm2Cmd);
  await execAsync('pm2 save');
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
