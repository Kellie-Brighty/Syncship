import { cert, getApps, initializeApp, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } from '$env/static/private';

// Firebase Admin SDK — server-side only ($lib/server/*)
// Uses SvelteKit's $env/static/private — these vars are never sent to the browser.

function initAdmin() {
	if (getApps().length) return getApp();

	return initializeApp({
		credential: cert({
			projectId: FIREBASE_PROJECT_ID,
			clientEmail: FIREBASE_CLIENT_EMAIL,
			// .env stores \n as literal \n — replace to get real PEM newlines
			privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
		})
	});
}

const adminApp = initAdmin();
export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
