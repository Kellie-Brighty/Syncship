import { json, type RequestEvent } from '@sveltejs/kit';
import { adminDb } from '$lib/server/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

export async function POST({ request }: RequestEvent) {
	try {
        // 1. Authenticate using Firebase ID Token
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
		}
		
		const idToken = authHeader.split('Bearer ')[1];
		let decodedToken;
		try {
			decodedToken = await getAuth().verifyIdToken(idToken);
		} catch (err) {
			return json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
		}
		
		const uid = decodedToken.uid;
		const { licenseKey } = await request.json();

		if (!licenseKey || !licenseKey.startsWith('SYNC-')) {
			return json({ error: 'Invalid license key format' }, { status: 400 });
		}

		// 2. TODO: Verify against Polar API here if POLAR_API_TOKEN is available
		// For now, we update the user plan to lifetime
		await adminDb.collection('users').doc(uid).update({
			plan: 'lifetime',
			planSetAt: new Date().toISOString(),
			licenseKey: licenseKey
		});

		return json({ 
			success: true, 
			plan: 'lifetime',
			message: 'Lifetime access activated successfully!'
		});
	} catch (err: any) {
		console.error('[License Redemption] Error:', err);
		return json({ error: 'Failed to redeem license', details: err.message }, { status: 500 });
	}
}
