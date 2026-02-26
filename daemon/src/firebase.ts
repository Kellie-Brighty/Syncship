import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Initialize Firebase Client SDK (BYOS Tenant Isolation)
// The daemon uses public keys because the real security comes from the user auth token
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export async function authenticateDaemon() {
  const email = process.env.SYNC_USER_EMAIL;
  const token = process.env.SYNC_DAEMON_TOKEN;

  if (!email || !token) {
    console.error('❌ Missing SYNC_USER_EMAIL or SYNC_DAEMON_TOKEN in Environment.');
    console.error('   The daemon cannot authenticate with Firebase without these credentials.');
    process.exit(1);
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, token);
    console.log(`✅ Daemon securely authenticated as: ${userCredential.user.email}`);
    // Return the actual user UID to use as the ownerId filter
    return userCredential.user.uid;
  } catch (err: any) {
    console.error('❌ Daemon Authentication Failed!');
    console.error(`   Error: ${err.message}`);
    process.exit(1);
  }
}
