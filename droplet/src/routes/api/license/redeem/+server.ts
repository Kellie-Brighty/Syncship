import { json, type RequestEvent } from '@sveltejs/kit';
import { adminDb } from '$lib/server/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { env } from '$env/dynamic/private';

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
		const adminLicenseKey = env.ADMIN_LICENSE_KEY;

		// 2. Secure Validation
		// If an ADMIN_LICENSE_KEY is set in environment, allow it as a bypass
		if (adminLicenseKey && licenseKey === adminLicenseKey) {
			console.log(`[License Redemption] Admin key used by ${uid}`);
		} else {
			// Otherwise, reject the placeholder prefix check
			return json({ 
				error: 'Feature not yet available', 
				message: 'License key redemption is currently undergoing maintenance. Please contact support.' 
			}, { status: 501 });
		}

		// Update the user plan to lifetime
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
