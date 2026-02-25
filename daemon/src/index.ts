import { db } from './firebase.js';
import { deploySite } from './deployer.js';
import { FieldValue } from 'firebase-admin/firestore';
import os from 'os';
import * as osutils from 'os-utils';

console.log('🚀 AgencyDroplet Daemon starting...');

// Heartbeat: write to Firestore every 5s so dashboard knows we're alive and has fresh stats
function sendHeartbeat() {
  osutils.cpuUsage(async (cpuPercent) => {
    try {
      const totalRam = os.totalmem() / (1024 * 1024 * 1024); // GB
      const freeRam = os.freemem() / (1024 * 1024 * 1024);   // GB
      const usedRam = totalRam - freeRam;
      const memPercent = (usedRam / totalRam) * 100;

      // 1. Keep the daemon status alive
      await db.collection('daemon').doc('heartbeat').set({
        lastPing: FieldValue.serverTimestamp(),
        status: 'online'
      }, { merge: true });

      // 2. Stream live OS stats for the dashboard charts
      await db.collection('serverStats').doc('live').set({
        timestamp: FieldValue.serverTimestamp(),
        cpu: cpuPercent * 100,
        memory: memPercent,
        totalRamGb: totalRam,
        usedRamGb: usedRam
      });
    } catch (err) {
      console.error('Heartbeat failed:', err);
    }
  });
}

sendHeartbeat();
setInterval(sendHeartbeat, 5000);

// Listen for queued deployments and process them
function startDeploymentListener() {
  console.log('👂 Listening for deployment requests...\n');

  const deploymentsRef = db.collection('deployments');

  // Watch for queued deployments
  deploymentsRef
    .where('status', '==', 'queued')
    .onSnapshot(async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type !== 'added') continue;

        const doc = change.doc;
        const data = doc.data();
        const deployId = doc.id;

        console.log(`\n📦 New deployment: ${data.siteName} (${deployId})`);

        // Mark as building
        await doc.ref.update({
          status: 'building',
          startedAt: FieldValue.serverTimestamp()
        });

        // Update site status
        await db.collection('sites').doc(data.siteId).update({
          status: 'building'
        });

        try {
          // Get site config
          const siteDoc = await db.collection('sites').doc(data.siteId).get();
          if (!siteDoc.exists) {
            throw new Error(`Site ${data.siteId} not found`);
          }

          const site = siteDoc.data()!;

          // Fetch user's settings to check for GitHub token
          let githubToken = undefined;
          if (data.ownerId) {
            const settingsDoc = await db.collection('settings').doc(data.ownerId).get();
            if (settingsDoc.exists) {
              githubToken = settingsDoc.data()?.githubToken;
            }
          }

          const abortController = new AbortController();

          // Listen for cancellation from the UI
          const unsubscribe = doc.ref.onSnapshot((snap) => {
            if (snap.exists && snap.data()?.status === 'canceled') {
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
            abortSignal: abortController.signal,
            onLog: async (line, fullLog) => {
              // Stream logs live to Firestore (unless already canceled)
              if (!abortController.signal.aborted) {
                await doc.ref.update({ buildLog: fullLog });
              }
            }
          });

          unsubscribe(); // Clean up listener

          // Update deployment status + title from commit message
          // (Only if it wasn't already marked canceled by the UI listener)
          const finalSnap = await doc.ref.get();
          if (finalSnap.data()?.status !== 'canceled') {
            await doc.ref.update({
              status: result.success ? 'success' : 'failed',
              duration: result.duration,
              buildLog: result.log,
              message: result.commitMessage,
              completedAt: FieldValue.serverTimestamp()
            });
          }

          // Update site status
          await db.collection('sites').doc(data.siteId).update({
            status: result.success ? 'live' : 'failed',
            lastDeployAt: FieldValue.serverTimestamp()
          });

          console.log(`${result.success ? '✅' : '❌'} Deployment ${deployId} ${result.success ? 'succeeded' : 'failed'} in ${result.duration}`);

        } catch (err: any) {
          console.error(`❌ Deployment ${deployId} crashed:`, err.message);

          await doc.ref.update({
            status: 'failed',
            buildLog: `Fatal error: ${err.message}`,
            completedAt: FieldValue.serverTimestamp()
          });

          await db.collection('sites').doc(data.siteId).update({
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

console.log('✅ Daemon is running. Press Ctrl+C to stop.\n');
