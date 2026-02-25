import { cert, getApps, initializeApp, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin SDK — server-side only ($lib/server/*)
// Used for privileged Firestore writes (e.g. Polar webhook plan updates)
//
// Required env vars (set in .env — never expose to client):
//   FIREBASE_PROJECT_ID
//   FIREBASE_CLIENT_EMAIL
//   FIREBASE_PRIVATE_KEY   (the full PEM key, with \n as literal \n in .env)

function initAdmin() {
	if (getApps().length) return getApp();

	return initializeApp({
		credential: cert({
			projectId: process.env.FIREBASE_PROJECT_ID,
			clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
			// .env stores \n as literal \n — replace to get real newlines
			privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n')
		})
	});
}

const adminApp = initAdmin();
export const adminDb = getFirestore(adminApp);
