import { db } from './firebase.js';
import { deploySite } from './deployer.js';
import { FieldValue } from 'firebase-admin/firestore';
console.log('🚀 AgencyDroplet Daemon starting...');
// Heartbeat: write to Firestore every 60s so dashboard knows we're alive
async function sendHeartbeat() {
    try {
        await db.collection('daemon').doc('heartbeat').set({
            lastPing: FieldValue.serverTimestamp(),
            status: 'online'
        }, { merge: true });
    }
    catch (err) {
        console.error('Heartbeat failed:', err);
    }
}
sendHeartbeat();
setInterval(sendHeartbeat, 60000);
// Listen for queued deployments and process them
function startDeploymentListener() {
    console.log('👂 Listening for deployment requests...\n');
    const deploymentsRef = db.collection('deployments');
    // Watch for queued deployments
    deploymentsRef
        .where('status', '==', 'queued')
        .onSnapshot(async (snapshot) => {
        for (const change of snapshot.docChanges()) {
            if (change.type !== 'added')
                continue;
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
                const site = siteDoc.data();
                // Fetch user's settings to check for GitHub token
                let githubToken = undefined;
                if (data.ownerId) {
                    const settingsDoc = await db.collection('settings').doc(data.ownerId).get();
                    if (settingsDoc.exists) {
                        githubToken = settingsDoc.data()?.githubToken;
                    }
                }
                const result = await deploySite({
                    id: data.siteId,
                    name: site.name,
                    domain: site.domain,
                    repo: site.repo,
                    branch: data.branch || site.branch,
                    buildCommand: site.buildCommand || '',
                    outputDir: site.outputDir || '.',
                    githubToken,
                    envVars: site.envVars
                });
                // Update deployment status
                await doc.ref.update({
                    status: result.success ? 'success' : 'failed',
                    duration: result.duration,
                    buildLog: result.log,
                    completedAt: FieldValue.serverTimestamp()
                });
                // Update site status
                await db.collection('sites').doc(data.siteId).update({
                    status: result.success ? 'live' : 'failed',
                    lastDeployAt: FieldValue.serverTimestamp()
                });
                console.log(`${result.success ? '✅' : '❌'} Deployment ${deployId} ${result.success ? 'succeeded' : 'failed'} in ${result.duration}`);
            }
            catch (err) {
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
