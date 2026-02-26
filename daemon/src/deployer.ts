import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import cliProgress from 'cli-progress';

const execAsync = promisify(exec);

const WEB_ROOT = process.env.WEB_ROOT || '/var/www';
const REPOS_DIR = process.env.REPOS_DIR || '/opt/agencydroplet/repos';

interface SiteConfig {
  id: string;
  name: string;
  domain: string;
  repo: string;
  branch: string;
  buildCommand: string;
  outputDir: string;
  githubToken?: string;
  envVars?: string;
  abortSignal?: AbortSignal;
  onLog?: (logLine: string, fullLog: string) => Promise<void> | void;
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
    logs.push(msg);
    if (stepIncrement > 0) {
      currentStep += stepIncrement;
      progressBar.update(currentStep, { stepName: stepName || msg });
    } else if (stepName) {
      progressBar.update(currentStep, { stepName });
    }
    
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
    const sourceDir = resolve(repoDir, site.outputDir || '.');
    mkdirSync(siteDir, { recursive: true });
    await execStream(`rsync -a --delete ${sourceDir}/ ${siteDir}/`);
    await log(`Files deployed to ${siteDir}`, 1, 'Deploying files');

    // 5. Generate Nginx config
    if (site.abortSignal?.aborted) throw new Error('Deployment canceled');
    await log('Configuring Nginx...', 1, 'Configuring Nginx');
    const nginxConfig = generateNginxConfig(cleanDomain, siteDir);
    writeFileSync(`/etc/nginx/sites-available/${cleanDomain}`, nginxConfig);

    // Enable site (symlink)
    const enabledPath = `/etc/nginx/sites-enabled/${cleanDomain}`;
    if (!existsSync(enabledPath)) {
      await execStream(`ln -sf /etc/nginx/sites-available/${cleanDomain} ${enabledPath}`);
    }

    // Test and reload Nginx
    await execStream('nginx -t');
    await execStream('systemctl reload nginx');
    await log('Nginx configured and reloaded');

    // 6. SSL certificate (Certbot)
    if (site.abortSignal?.aborted) throw new Error('Deployment canceled');
    await log('Setting up SSL...', 1, 'Setting up SSL');
    try {
      await execStream(`certbot --nginx -d ${cleanDomain} --non-interactive --agree-tos --email admin@${cleanDomain} --redirect`, { timeout: 120000 });
      await log('SSL certificate installed');
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

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
