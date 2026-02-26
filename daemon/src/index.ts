import './env.js';

import { db, authenticateDaemon } from './firebase.js';
import { deploySite } from './deployer.js';
import { doc, setDoc, updateDoc, collection, query, where, onSnapshot, serverTimestamp, getDoc } from 'firebase/firestore';
import os from 'os';
import * as osutils from 'os-utils';

async function boot() {
  console.log(`🚀 AgencyDroplet Daemon starting boot sequence...`);
  
  // Authenticate as a standard client using email & daemon token.
  // This physically locks the daemon into the `firestore.rules` sandbox.
  const SYNC_USER_ID = await authenticateDaemon();

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
        await setDoc(doc(db, 'daemon', SYNC_USER_ID), {
          lastPing: serverTimestamp(),
          status: 'online'
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
            buildCommand: site.buildCommand || '',
            outputDir: site.outputDir || '.',
            githubToken,
            envVars: site.envVars,
            abortSignal: abortController.signal
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

  // Start listening
  startDeploymentListener();

  // Keep alive
  process.on('SIGINT', () => {
    console.log('\n👋 Daemon shutting down...');
    process.exit(0);
  });

  console.log('✅ Daemon is securely connected and filtering isolated tasks. Press Ctrl+C to stop.\n');
}

boot().catch(console.error);
