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
		
		const { email, uid, isWhitelisted } = await request.json();
		
		if (!email && !uid) {
			return json({ error: 'Missing email or uid' }, { status: 400 });
		}

		const status = isWhitelisted !== false; // default to true
		const plan = status ? 'lifetime' : 'free';

		// 2. Update existing user by UID if provided
		if (uid) {
			await adminDb.collection('users').doc(uid).update({
				plan: plan,
				isWhitelisted: status,
				planSetAt: new Date().toISOString()
			});
			return json({ 
				success: true, 
				message: `User ${status ? 'whitelisted' : 'un-whitelisted'} successfully!` 
			});
		}

		// 3. Update by Email (for new entries or pending users)
		const targetEmail = email.toLowerCase();
		const usersRef = adminDb.collection('users');
		const snap = await usersRef.where('email', '==', targetEmail).limit(1).get();

		if (snap.empty) {
			if (status) {
				// User doesn't exist yet, store in pending_plans with whitelist flag
				await adminDb.collection('pending_plans').doc(targetEmail).set({
					plan: plan,
					isWhitelisted: status,
					setAt: new Date().toISOString()
				});
				return json({ 
					success: true, 
					message: `${targetEmail} whitelisted (pending registration)` 
				});
			} else {
				// Remove from pending if exists
				await adminDb.collection('pending_plans').doc(targetEmail).delete();
				return json({ success: true, message: `${targetEmail} removed from pending whitelist` });
			}
		}

		// User exists, update directly
		await snap.docs[0].ref.update({
			plan: plan,
			isWhitelisted: status,
			planSetAt: new Date().toISOString()
		});

		return json({ 
			success: true, 
			message: `${targetEmail} ${status ? 'whitelisted' : 'un-whitelisted'} successfully!` 
		});
	} catch (err: any) {
		console.error('[Admin Whitelist] Error:', err);
		return json({ error: 'Failed to whitelist user', details: err.message }, { status: 500 });
	}
}
