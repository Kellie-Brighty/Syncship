import { json, type RequestEvent } from '@sveltejs/kit';
import { adminDb } from '$lib/server/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

export async function POST({ request }: RequestEvent) {
	try {
        // 1. Authenticate the admin (Only Kellie)
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
		
		const adminEmail = decodedToken.email;
		if (adminEmail !== 'kelliebrighty@gmail.com') {
			return json({ error: 'Forbidden: Admin access only' }, { status: 403 });
		}
		
		const { email } = await request.json();
		if (!email || !email.includes('@')) {
			return json({ error: 'Invalid email address' }, { status: 400 });
		}

		// 2. Grant Lifetime Access via Whitelist
		const targetEmail = email.toLowerCase();
		const usersRef = adminDb.collection('users');
		const snap = await usersRef.where('email', '==', targetEmail).limit(1).get();

		if (snap.empty) {
			// User doesn't exist yet, store in pending_plans with whitelist flag
			await adminDb.collection('pending_plans').doc(targetEmail).set({
				plan: 'lifetime',
				isWhitelisted: true,
				setAt: new Date().toISOString()
			});
			return json({ 
				success: true, 
				message: `${targetEmail} whitelisted (pending registration)` 
			});
		}

		// User exists, update directly
		await snap.docs[0].ref.update({
			plan: 'lifetime',
			isWhitelisted: true,
			planSetAt: new Date().toISOString()
		});

		return json({ 
			success: true, 
			message: `${targetEmail} whitelisted successfully!` 
		});
	} catch (err: any) {
		console.error('[Admin Whitelist] Error:', err);
		return json({ error: 'Failed to whitelist user', details: err.message }, { status: 500 });
	}
}
