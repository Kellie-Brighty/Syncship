import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { adminAuth, adminDb } from '$lib/server/firebase-admin';

// Helper to fetch from GitHub API with error handling
async function fetchGithub(url: string, token?: string) {
    const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'SyncShip-Detector'
    };
    if (token) {
        headers['Authorization'] = `token ${token}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
        if (res.status === 404 || res.status === 401) {
            return null; // Repo not found or private and unauthorized
        }
        throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
}

export async function POST({ request }: RequestEvent) {
    try {
        const { repo, requireAuth } = await request.json();

        if (!repo || typeof repo !== 'string') {
            return json({ error: 'Repository is required' }, { status: 400 });
        }

        let githubToken: string | undefined;

        // Optionally get token from authenticated user
        const authHeader = request.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const idToken = authHeader.split('Bearer ')[1];
            try {
                const decodedToken = await adminAuth.verifyIdToken(idToken);
                const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
                if (userDoc.exists) {
                    githubToken = userDoc.data()?.githubToken;
                }
            } catch (authErr) {
                console.error('Auth verification failed in detect API:', authErr);
                // Continue without token unless explicitly required
                if (requireAuth) {
                    return json({ error: 'Unauthorized' }, { status: 401 });
                }
            }
        }

        if (requireAuth && !githubToken) {
             return json({ error: 'GitHub Token required for private repositories' }, { status: 401 });
        }

        // 1. Fetch Repository Contents (Root)
        const contentsUrl = `https://api.github.com/repos/${repo}/contents`;
        const contents = await fetchGithub(contentsUrl, githubToken);
        
        if (!contents) {
            return json({ 
                error: 'Repository not found. It might be private or spelled incorrectly.',
                needsAuth: !githubToken
            }, { status: 404 });
        }

        if (!Array.isArray(contents)) {
            return json({ error: 'Invalid repository contents' }, { status: 400 });
        }

        const files = contents.map((file: any) => file.name);

        // Result object to build up
        const result = {
            projectType: 'static',
            buildCommand: '',
            outputDir: '.',
            startCommand: '',
            installCommand: 'npm install',
            envKeys: [] as string[],
            isMonorepo: false,
            monorepoApps: [] as Array<{
                name: string;
                path: string;
                projectType: string;
                buildCommand: string;
                outputDir: string;
                startCommand: string;
            }>
        };

        // 2. Detect Package Manager
        if (files.includes('bun.lockb')) result.installCommand = 'bun install';
        else if (files.includes('pnpm-lock.yaml')) result.installCommand = 'pnpm install';
        else if (files.includes('yarn.lock')) result.installCommand = 'yarn install';
        else if (files.includes('package-lock.json')) result.installCommand = 'npm install';

        // --- Helper Function for Framework Detection ---
        function analyzePackageJson(pkgJson: any, installCmd: string, appPath: string = '.') {
            const deps = { ...(pkgJson.dependencies || {}), ...(pkgJson.devDependencies || {}) };
            const scripts = pkgJson.scripts || {};
            
            let detected = {
                projectType: 'static',
                buildCommand: scripts.build ? `${installCmd.split(' ')[0]} run build` : '',
                startCommand: '',
                outputDir: '.'
            };

            const isSubApp = appPath !== '.';
            const prefixCmd = isSubApp && installCmd.includes('npm') 
                        ? `npm run build --workspace=${appPath.split('/').pop()}`
                        : isSubApp && installCmd.includes('yarn')
                        ? `yarn workspace ${pkgJson.name || appPath.split('/').pop()} build`
                        : isSubApp && installCmd.includes('pnpm')
                        ? `pnpm --filter ${pkgJson.name || appPath.split('/').pop()} build`
                        : `${installCmd.split(' ')[0]} run build`;

            if (deps['next']) {
                detected.projectType = 'backend';
                detected.buildCommand = prefixCmd;
                detected.startCommand = scripts.start ? `${installCmd.split(' ')[0]} start` : 'npm start';
                detected.outputDir = isSubApp ? `${appPath}/.next` : '.next';
            } else if (deps['@remix-run/dev'] || deps['@remix-run/node']) {
                detected.projectType = 'backend';
                detected.buildCommand = prefixCmd;
                detected.startCommand = `node ${isSubApp ? appPath + '/' : ''}build/index.js`;
                detected.outputDir = isSubApp ? `${appPath}/build` : 'build';
            } else if (deps['@sveltejs/kit']) {
                detected.projectType = 'backend';
                detected.buildCommand = prefixCmd;
                detected.startCommand = `node ${isSubApp ? appPath + '/' : ''}build/index.js`;
                detected.outputDir = isSubApp ? `${appPath}/build` : 'build';
            } else if (deps['nuxt']) {
                detected.projectType = 'backend';
                detected.buildCommand = prefixCmd;
                detected.startCommand = `node ${isSubApp ? appPath + '/' : ''}.output/server/index.mjs`;
                detected.outputDir = isSubApp ? `${appPath}/.output` : '.output';
            } else if (deps['@astrojs/node']) {
                detected.projectType = 'backend';
                detected.buildCommand = prefixCmd;
                detected.startCommand = `node ${isSubApp ? appPath + '/' : ''}dist/server/entry.mjs`;
                detected.outputDir = isSubApp ? `${appPath}/dist` : 'dist';
            } else if (deps['astro']) {
                detected.projectType = 'build';
                detected.buildCommand = prefixCmd;
                detected.outputDir = isSubApp ? `${appPath}/dist` : 'dist';
            } else if (deps['@nestjs/core']) {
                detected.projectType = 'backend';
                detected.buildCommand = prefixCmd;
                detected.startCommand = scripts.start ? `${installCmd.split(' ')[0]} start:prod` : 'node dist/main';
                detected.outputDir = isSubApp ? `${appPath}/dist` : 'dist';
            } else if (deps['react-scripts'] || deps['vite'] || deps['vue'] || deps['webpack']) {
                detected.projectType = 'build';
                detected.buildCommand = prefixCmd;
                detected.outputDir = isSubApp ? (deps['react-scripts'] ? `${appPath}/build` : `${appPath}/dist`) : (deps['react-scripts'] ? 'build' : 'dist');
            } else if (deps['express'] || deps['fastify'] || deps['koa'] || scripts.start || deps['@adonisjs/core']) {
                detected.projectType = 'backend';
                detected.buildCommand = scripts.build ? prefixCmd : '';
                detected.startCommand = scripts.start ? `${installCmd.split(' ')[0]} start` : 'node index.js';
                detected.outputDir = appPath;
            }

            return detected;
        }

        // 3. Detect Framework / Backend
        let rootPackageJsonData: any = null;

        if (files.includes('package.json')) {
            const pkgFile = contents.find((f: any) => f.name === 'package.json');
            if (pkgFile && pkgFile.download_url) {
                 const pkgRes = await fetch(pkgFile.download_url);
                 if (pkgRes.ok) {
                     rootPackageJsonData = await pkgRes.json();
                 }
            }
        }

        // Apply root detection
        if (rootPackageJsonData) {
            const rootDetected = analyzePackageJson(rootPackageJsonData, result.installCommand);
            result.projectType = rootDetected.projectType;
            result.buildCommand = rootDetected.buildCommand;
            result.startCommand = rootDetected.startCommand;
            result.outputDir = rootDetected.outputDir;
            
            // --- MONOREPO DETECTION ---
            // 1. Check for workspaces in package.json
            let workspaces: string[] = [];
            if (rootPackageJsonData.workspaces) {
                if (Array.isArray(rootPackageJsonData.workspaces)) {
                    workspaces = rootPackageJsonData.workspaces;
                } else if (rootPackageJsonData.workspaces.packages) {
                    workspaces = rootPackageJsonData.workspaces.packages;
                }
            }

            // 2. Check for pnpm-workspace.yaml if pnpm
            if (workspaces.length === 0 && files.includes('pnpm-workspace.yaml')) {
                const pnpmWp = contents.find((f: any) => f.name === 'pnpm-workspace.yaml');
                if (pnpmWp && pnpmWp.download_url) {
                    try {
                        const pRes = await fetch(pnpmWp.download_url);
                        if (pRes.ok) {
                            const pText = await pRes.text();
                            // Extremely naive YAML-ish parser for "packages:" list
                            const matches = pText.match(/packages:\s*([\s\S]*?)(?:\n\w|$)/);
                            if (matches && matches[1]) {
                                workspaces = matches[1].split('\n')
                                    .map(line => line.trim().replace(/^-\s*/, '').replace(/['"]/g, ''))
                                    .filter(line => line && !line.startsWith('#'));
                            }
                        }
                    } catch (e) {
                         console.warn('Failed to parse pnpm-workspace.yaml:', e);
                    }
                }
            }

            // 3. Fallback to common dirs if no workspaces found
            if (workspaces.length === 0) {
                if (files.includes('apps')) workspaces.push('apps/*');
                if (files.includes('packages')) workspaces.push('packages/*');
            }

            if (workspaces.length > 0) {
                result.isMonorepo = true;
                
                // Process each workspace pattern
                for (const pattern of workspaces) {
                    const baseDir = pattern.split('/')[0];
                    if (!files.includes(baseDir)) continue;

                    try {
                        // Fetch contents of base directory
                        const appsUrl = `https://api.github.com/repos/${repo}/contents/${baseDir}`;
                        const appsContents = await fetchGithub(appsUrl, githubToken);
                        
                        if (Array.isArray(appsContents)) {
                            // Only look at subdirectories
                            const subDirs = appsContents.filter(f => f.type === 'dir');
                            
                            // Let's do a max of 5 app checks total to avoid hitting API rate limits
                            const dirsToCheck = subDirs.slice(0, 5 - result.monorepoApps.length);
                            if (dirsToCheck.length <= 0) break;
                            
                            for (const subDir of dirsToCheck) {
                                const subContentsUrl = `https://api.github.com/repos/${repo}/contents/${baseDir}/${subDir.name}/package.json`;
                                const subPkgContents = await fetchGithub(subContentsUrl, githubToken);
                                
                                if (subPkgContents && subPkgContents.download_url) {
                                    const subPkgRes = await fetch(subPkgContents.download_url);
                                    if (subPkgRes.ok) {
                                        const subPkgJson = await subPkgRes.json();
                                        const appDetected = analyzePackageJson(subPkgJson, result.installCommand, `${baseDir}/${subDir.name}`);
                                        
                                        result.monorepoApps.push({
                                            name: subPkgJson.name || subDir.name,
                                            path: `${baseDir}/${subDir.name}`,
                                            projectType: appDetected.projectType,
                                            buildCommand: appDetected.buildCommand,
                                            outputDir: appDetected.outputDir,
                                            startCommand: appDetected.startCommand
                                        });
                                    }
                                }
                            }
                        }
                    } catch (e) {
                         console.warn(`Failed to peek into monorepo pattern ${pattern}:`, e);
                    }
                }
            }
        } else {
            // Non-Node Backend Detections
            if (files.includes('manage.py') || files.includes('requirements.txt') || files.includes('Pipfile') || files.includes('pyproject.toml') || files.includes('main.py')) {
                result.projectType = 'backend';
                
                // Determine python install/start commands
                if (files.includes('requirements.txt')) {
                    result.installCommand = 'pip install -r requirements.txt';
                } else if (files.includes('Pipfile')) {
                    result.installCommand = 'pipenv install';
                } else if (files.includes('pyproject.toml') && files.includes('poetry.lock')) {
                    result.installCommand = 'poetry install';
                } else {
                    result.installCommand = 'pip install -r requirements.txt'; // Fallback
                }

                if (files.includes('manage.py')) { // Django
                    result.buildCommand = 'python manage.py collectstatic --noinput';
                    result.startCommand = 'python manage.py runserver 0.0.0.0:${PORT:-8000}'; 
                } else if (files.includes('main.py')) { // FastAPI / generic python
                    result.buildCommand = '';
                    result.startCommand = 'python main.py';
                } else {
                    result.buildCommand = '';
                    result.startCommand = 'python app.py';
                }
                
                result.outputDir = '.';
            } else if (files.includes('Gemfile')) { // Ruby
                result.projectType = 'backend';
                result.installCommand = 'bundle install';
                result.buildCommand = '';
                result.startCommand = 'bundle exec rails server -b 0.0.0.0 -p ${PORT:-3000}';
                result.outputDir = '.';
            } else if (files.includes('go.mod')) { // Go
                result.projectType = 'backend';
                result.installCommand = 'go mod download';
                result.buildCommand = 'go build -o server .';
                result.startCommand = './server';
                result.outputDir = '.';
            } else if (files.includes('pom.xml') || files.includes('build.gradle')) { // Java Spring 
                result.projectType = 'backend';
                result.installCommand = '';
                if (files.includes('pom.xml')) {
                    result.buildCommand = 'mvn clean package -DskipTests';
                    result.startCommand = 'java -jar target/*.jar';
                } else {
                    result.buildCommand = './gradlew build -x test';
                    result.startCommand = 'java -jar build/libs/*.jar';
                }
                result.outputDir = '.';
            }
        }

        // 4. Detect Env Vars
        const envFiles = ['.env.example', '.env.template', '.env.sample'];
        const foundEnvFile = contents.find((f: any) => envFiles.includes(f.name));
        
        if (foundEnvFile && foundEnvFile.download_url) {
            const envRes = await fetch(foundEnvFile.download_url);
            if (envRes.ok) {
                const envText = await envRes.text();
                // Extremely simple basic parsing for KEY=VALUE or just KEY=
                const keys = envText
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line && !line.startsWith('#'))
                    .map(line => line.split('=')[0].trim())
                    .filter(key => key.length > 0);
                
                // Deduplicate
                result.envKeys = [...new Set(keys)];
            }
        }

        return json(result);

    } catch (err: any) {
        console.error('GitHub API route error:', err);
        return json({ error: 'Failed to analyze repository' }, { status: 500 });
    }
}
