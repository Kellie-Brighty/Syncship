import { json, type RequestEvent } from '@sveltejs/kit';
import { adminDb } from '$lib/server/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

export async function GET({ url, request }: RequestEvent) {
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

		// 2. Pagination & Sorting
		const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
		const lastId = url.searchParams.get('lastId');
		
		let query = adminDb.collection('users')
			.orderBy('createdAt', 'desc')
			.limit(pageSize);

		if (lastId) {
			const lastDoc = await adminDb.collection('users').doc(lastId).get();
			if (lastDoc.exists) {
				query = query.startAfter(lastDoc);
			}
		}

		const snapshot = await query.get();
		const users = snapshot.docs.map(doc => ({
			uid: doc.id,
			...doc.data(),
			createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
		}));

		// 3. Stats (Simplified for now, in a large DB we might use a dedicated stats doc)
		const totalUsersSnap = await adminDb.collection('users').count().get();
		const activeLicensesSnap = await adminDb.collection('users').where('plan', '==', 'lifetime').count().get();

		return json({
			users,
			stats: {
				totalUsers: totalUsersSnap.data().count,
				activeLicenses: activeLicensesSnap.data().count
			},
			lastId: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null,
			hasMore: snapshot.docs.length === pageSize
		});
	} catch (err: any) {
		console.error('[Admin Users API] Error:', err);
		return json({ error: 'Failed to fetch users', details: err.message }, { status: 500 });
	}
}
