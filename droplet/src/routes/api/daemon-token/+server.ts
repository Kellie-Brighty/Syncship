import { json, type RequestEvent } from '@sveltejs/kit';
import { adminDb } from '$lib/server/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import crypto from 'crypto';

export async function POST({ request }: RequestEvent) {
	try {
        // 1. Authenticate the caller using standard Firebase ID Tokens
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

		// 2. Generate a highly secure random token (password) for the daemon
		const generatedPassword = crypto.randomBytes(32).toString('hex');
		const daemonEmail = `daemon-${uid}@syncship.ink`;

        // 3. Provision or Update the headless Daemon Auth Account
		try {
			// Try to update existing daemon user
			const existingUser = await getAuth().getUserByEmail(daemonEmail);
			await getAuth().updateUser(existingUser.uid, {
				password: generatedPassword
			});
		} catch (error: any) {
			if (error.code === 'auth/user-not-found') {
				// User doesn't exist, create physical credentials
				await getAuth().createUser({
					email: daemonEmail,
					password: generatedPassword,
					displayName: `Daemon Instance (${uid})`,
				});
			} else {
				throw error;
			}
		}

        // 4. Save the password securely in their settings document so we can show it on the UI
		await adminDb.collection('settings').doc(uid).set({
			daemonToken: generatedPassword,
            daemonEmail: daemonEmail
		}, { merge: true });

		return json({
			success: true,
			daemonEmail,
			daemonToken: generatedPassword
		});
	} catch (err: any) {
		console.error('Error provisioning daemon token:', err);
		return json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
	}
}
