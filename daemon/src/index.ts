import './env.js';
import { db, authenticateDaemon } from './firebase.js';
import { deploySite } from './deployer.js';
import { doc, setDoc, updateDoc, collection, query, where, onSnapshot, serverTimestamp, getDoc } from 'firebase/firestore';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import * as osutils from 'os-utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function boot() {
  console.log(`🚀 SyncShip Daemon starting boot sequence...`);
  
  // Authenticate as a standard client using email & daemon token.
  // This physically locks the daemon into the `firestore.rules` sandbox.
  const SYNC_USER_ID = await authenticateDaemon();

  // Clear any existing error state on boot
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
    await updateDoc(doc(db, 'daemon', SYNC_USER_ID), {
      action: null,
      updateStatus: 'idle',
      updateError: null,
      version: pkg.version
    });
    console.log(`✅ Boot: Version synced (v${pkg.version}) and error states cleared.`);
  } catch (err) {
    console.warn(`⚠️ Failed to sync initial state:`, err);
  }

  // Fetch Droplet IP once on boot
  let dropletIp = '';
  try {
    const ipRes = await fetch('https://api.ipify.org');
    dropletIp = await ipRes.text();
    console.log(`🌐 Droplet Public IP: ${dropletIp}`);
  } catch (err) {
    console.warn(`⚠️ Failed to fetch Droplet IP:`, err);
  }

  // Heartbeat: write to Firestore every 5s so dashboard knows we're alive and has fresh stats
  function sendHeartbeat() {
    osutils.cpuUsage(async (cpuPercent) => {
      try {
        const totalRam = os.totalmem() / (1024 * 1024 * 1024); // GB
        const freeRam = os.freemem() / (1024 * 1024 * 1024);   // GB
        const usedRam = totalRam - freeRam;
        const memPercent = (usedRam / totalRam) * 100;

        // 1. Keep the daemon status alive
        const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
        await setDoc(doc(db, 'daemon', SYNC_USER_ID), {
          lastPing: serverTimestamp(),
          status: 'online',
          version: pkg.version
        }, { merge: true });

        // 2. Stream live OS stats for the dashboard charts
        await setDoc(doc(db, 'serverStats', SYNC_USER_ID), {
          timestamp: serverTimestamp(),
          cpu: cpuPercent * 100,
          memory: memPercent,
          totalRamGb: totalRam,
          usedRamGb: usedRam,
          dropletIp
        });
      } catch (err) {
        console.error('Heartbeat failed:', err);
      }
    });
  }

  sendHeartbeat(); // One-time ping on startup

  // Listen for commands from the dashboard (e.g., refresh server stats)
  onSnapshot(doc(db, 'daemon', SYNC_USER_ID), async (snap) => {
    const data = snap.data();
    if (data && data.action === 'refresh_stats') {
      console.log('🔄 Dashboard requested fresh stats');
      sendHeartbeat();
      // Acknowledge the command so it doesn't run repeatedly
      await updateDoc(snap.ref, { action: null }).catch(() => {});
    }

    if (data && data.action === 'self_update') {
      console.log('👷 Self-update requested. Executing...');
      try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);

        // Acknowledge receipt
        await updateDoc(snap.ref, { 
          action: 'updating',
          updateStatus: 'pulling' 
        });

        console.log('📥 Discarding local changes and pulling latest code...');
        await execAsync('git -C .. reset --hard HEAD && git -C .. clean -fd');
        await execAsync('git -C .. pull');
        
        await updateDoc(snap.ref, { updateStatus: 'installing' });
        console.log('📦 Installing dependencies...');
        await execAsync('npm install');

        console.log('🏗️ Building...');
        await execAsync('npm run build');

        // Read the NEW version from updated package.json
        const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

        await updateDoc(snap.ref, { 
          action: null,
          updateStatus: 'idle',
          version: pkg.version
        });
        
        console.log('🔄 Restarting daemon via PM2...');
        // We trigger the restart in the background and exit
        const restartCmd = 'pm2 restart syncship-daemon';
        exec(restartCmd);
        process.exit(0);

      } catch (err: any) {
        console.error('❌ Self-update failed:', err);
        await updateDoc(snap.ref, { 
          action: 'error',
          updateError: err.message || 'Unknown error'
        });
      }
    }
  });

  // Listen for queued deployments and process them
  function startDeploymentListener() {
    console.log('👂 Listening for deployment requests...\n');

    const deploymentsRef = collection(db, 'deployments');
    const q = query(deploymentsRef, where('ownerId', '==', SYNC_USER_ID), where('status', '==', 'queued'));

    // Watch for queued deployments
    onSnapshot(q, async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type !== 'added') continue;

        const docSnapshot = change.doc;
        const data = docSnapshot.data();
        const deployId = docSnapshot.id;

        console.log(`\n📦 New deployment: ${data.siteName} (${deployId})`);

        // Mark as building
        await updateDoc(docSnapshot.ref, {
          status: 'building',
          startedAt: serverTimestamp()
        });

        // Update site status
        await updateDoc(doc(db, 'sites', data.siteId), {
          status: 'building'
        });

        try {
          // Get site config
          const siteDocSnap = await getDoc(doc(db, 'sites', data.siteId));
          if (!siteDocSnap.exists()) {
            throw new Error(`Site ${data.siteId} not found`);
          }

          const site = siteDocSnap.data()!;

          // Fetch user's settings to check for GitHub token
          let githubToken = undefined;
          if (data.ownerId) {
            const settingsDocSnap = await getDoc(doc(db, 'settings', data.ownerId));
            if (settingsDocSnap.exists()) {
              githubToken = settingsDocSnap.data()?.githubToken;
            }
          }

          const abortController = new AbortController();

          // Listen for cancellation from the UI
          const unsubscribeCancel = onSnapshot(docSnapshot.ref, (snap) => {
            if (snap.exists() && snap.data()?.status === 'canceled') {
              console.log(`\n🛑 Deployment ${deployId} canceled by user`);
              abortController.abort();
            }
          });

          const result = await deploySite({
            id: data.siteId,
            name: site.name,
            domain: site.domain,
            repo: site.repo,
            branch: data.branch || site.branch,
            siteType: site.siteType || 'static',
            buildCommand: site.buildCommand || '',
            outputDir: site.outputDir || '.',
            startCommand: site.startCommand,
            port: site.port,
            githubToken,
            envVars: site.envVars,
            installCommand: site.installCommand,
            secretFiles: site.secretFiles,
            abortSignal: abortController.signal,
            engine: site.engine,
            onPortAssigned: async (port) => {
              // Save the assigned port back to Firestore so it persists across redeploys
              await updateDoc(doc(db, 'sites', data.siteId), { port });
            }
          });

          unsubscribeCancel(); // Clean up listener

          // Update deployment status + title from commit message
          // (Only if it wasn't already marked canceled by the UI listener)
          const finalSnap = await getDoc(docSnapshot.ref);
          if (finalSnap.data()?.status !== 'canceled') {
            await updateDoc(docSnapshot.ref, {
              status: result.success ? 'success' : 'failed',
              duration: result.duration,
              buildLog: result.log,
              message: result.commitMessage,
              completedAt: serverTimestamp()
            });
          }

          // Update site status
          await updateDoc(doc(db, 'sites', data.siteId), {
            status: result.success ? 'live' : 'failed',
            lastDeployAt: serverTimestamp()
          });

          console.log(`${result.success ? '✅' : '❌'} Deployment ${deployId} ${result.success ? 'succeeded' : 'failed'} in ${result.duration}`);

        } catch (err: any) {
          console.error(`❌ Deployment ${deployId} crashed:`, err.message);

          await updateDoc(docSnapshot.ref, {
            status: 'failed',
            buildLog: `Fatal error: ${err.message}`,
            completedAt: serverTimestamp()
          });

          await updateDoc(doc(db, 'sites', data.siteId), {
            status: 'failed'
          });
        }
      }
    }, (error) => {
      console.error('❌ Firestore listener error:', error);
      // Restart listener after a delay
      setTimeout(startDeploymentListener, 5000);
    });
  }

  // Listen for sites marked for deletion and clean them up
  const deletingSites = new Set<string>();
  function startDeletionListener() {
    console.log('👂 Listening for deletion requests...\n');

    const sitesRef = collection(db, 'sites');
    const q = query(sitesRef, where('ownerId', '==', SYNC_USER_ID), where('status', '==', 'deleting'));

    onSnapshot(q, async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type !== 'added' && change.type !== 'modified') continue;

        const docSnapshot = change.doc;
        const site = docSnapshot.data();
        if (site.status !== 'deleting') continue;
        if (deletingSites.has(docSnapshot.id)) continue;

        deletingSites.add(docSnapshot.id);
        console.log(`\n🗑️ Deleting site: ${site.name} (${docSnapshot.id})`);

        try {
          // Import cleanup function
          const { cleanupSite } = await import('./deployer.js');
          
          const result = await cleanupSite({
            id: docSnapshot.id,
            domain: site.domain,
            siteType: site.siteType,
            engine: site.engine
          });

          if (result.success) {
            console.log(`✅ Cleanup successful for ${site.name}. Removing record from Firestore.`);
            // Finally delete the record from Firestore
            const { deleteDoc } = await import('firebase/firestore');
            await deleteDoc(docSnapshot.ref);
          } else {
            console.error(`❌ Cleanup failed for ${site.name}:`, result.log);
            // Mark as failed so user knows there was an issue
            await updateDoc(docSnapshot.ref, {
              status: 'failed',
              error: 'Cleanup failed. Manual intervention may be required.'
            });
            deletingSites.delete(docSnapshot.id);
          }
        } catch (err: any) {
          console.error(`❌ Deletion process crashed for ${site.name}:`, err.message);
          deletingSites.delete(docSnapshot.id);
        }
      }
    }, (error) => {
      console.error('❌ Deletion listener error:', error);
      setTimeout(startDeletionListener, 5000);
    });
  }

  // Start listening
  startDeploymentListener();
  startDeletionListener();

  // Keep alive
  process.on('SIGINT', () => {
    console.log('\n👋 Daemon shutting down...');
    process.exit(0);
  });

  console.log('✅ Daemon is securely connected and filtering isolated tasks. Press Ctrl+C to stop.\n');
}

boot().catch(console.error);
