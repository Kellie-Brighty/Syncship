import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load service account key
const keyPath = resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json');
if (!existsSync(keyPath)) {
  console.error('❌ Service account key not found at:', keyPath);
  console.error('   Download it from Firebase Console → Project Settings → Service Accounts');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf-8')) as ServiceAccount;

const app = initializeApp({
  credential: cert(serviceAccount)
});

export const db = getFirestore(app);
console.log('🔥 Firebase Admin initialized');
