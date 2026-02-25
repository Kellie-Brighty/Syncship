import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
const execAsync = promisify(exec);
const WEB_ROOT = process.env.WEB_ROOT || '/var/www';
const REPOS_DIR = process.env.REPOS_DIR || '/opt/agencydroplet/repos';
/**
 * Deploy a site: clone/pull repo, build if needed, set up Nginx + SSL
 */
export async function deploySite(site) {
    const startTime = Date.now();
    const logs = [];
    function log(msg) {
        console.log(`  [${site.name}] ${msg}`);
        logs.push(msg);
    }
    try {
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
            log('Pulling latest changes...');
            // Note: If the token changes, pull might fail if the remote URL wasn't updated. For MVP we just pull.
            await execAsync(`cd ${repoDir} && git remote set-url origin ${cloneUrl}.git && git fetch origin && git reset --hard origin/${site.branch}`, { timeout: 60000 });
        }
        else {
            log(`Cloning ${site.repo}...`);
            await execAsync(`git clone --branch ${site.branch} --single-branch ${cloneUrl}.git ${repoDir}`, { timeout: 120000 });
        }
        log('Repository ready');
        // 2.5 Inject Environment Variables if they exist
        if (site.envVars) {
            log('Injecting stored .env variables...');
            writeFileSync(resolve(repoDir, '.env'), site.envVars);
        }
        // 3. Build if needed (framework projects)
        if (site.buildCommand) {
            log(`Installing dependencies...`);
            const hasYarnLock = existsSync(resolve(repoDir, 'yarn.lock'));
            const hasPnpmLock = existsSync(resolve(repoDir, 'pnpm-lock.yaml'));
            const installCmd = hasPnpmLock ? 'pnpm install' : hasYarnLock ? 'yarn install' : 'npm install';
            await execAsync(`cd ${repoDir} && ${installCmd}`, { timeout: 300000 });
            log(`Running build: ${site.buildCommand}`);
            await execAsync(`cd ${repoDir} && ${site.buildCommand}`, { timeout: 300000 });
            log('Build complete');
        }
        // 4. Copy output to web root
        const sourceDir = resolve(repoDir, site.outputDir || '.');
        mkdirSync(siteDir, { recursive: true });
        await execAsync(`rsync -a --delete ${sourceDir}/ ${siteDir}/`);
        log(`Files deployed to ${siteDir}`);
        // 5. Generate Nginx config
        log('Configuring Nginx...');
        const nginxConfig = generateNginxConfig(cleanDomain, siteDir);
        writeFileSync(`/etc/nginx/sites-available/${cleanDomain}`, nginxConfig);
        // Enable site (symlink)
        const enabledPath = `/etc/nginx/sites-enabled/${cleanDomain}`;
        if (!existsSync(enabledPath)) {
            await execAsync(`ln -sf /etc/nginx/sites-available/${cleanDomain} ${enabledPath}`);
        }
        // Test and reload Nginx
        await execAsync('nginx -t');
        await execAsync('systemctl reload nginx');
        log('Nginx configured and reloaded');
        // 6. SSL certificate (Certbot)
        log('Setting up SSL...');
        try {
            await execAsync(`certbot --nginx -d ${cleanDomain} --non-interactive --agree-tos --email admin@${cleanDomain} --redirect`, { timeout: 120000 });
            log('SSL certificate installed');
        }
        catch (sslErr) {
            log(`SSL warning: ${sslErr.message} (site will still work on HTTP)`);
        }
        const duration = formatDuration(Date.now() - startTime);
        log(`✅ Deployed successfully in ${duration}`);
        return { success: true, duration, log: logs.join('\n') };
    }
    catch (err) {
        const duration = formatDuration(Date.now() - startTime);
        log(`❌ Deploy failed: ${err.message}`);
        return { success: false, duration, log: logs.join('\n') };
    }
}
function generateNginxConfig(domain, webRoot) {
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
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60)
        return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
}
