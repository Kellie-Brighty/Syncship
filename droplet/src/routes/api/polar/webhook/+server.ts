import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Webhook } from 'svix';
import { adminDb } from '$lib/server/firebase-admin';
import { POLAR_WEBHOOK_SECRET } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	const rawBody = await request.text();

	// Verify using Svix (Standard Webhooks)
	const wh = new Webhook(POLAR_WEBHOOK_SECRET);
	let event: Record<string, unknown>;

	try {
		event = wh.verify(rawBody, {
			'webhook-id': request.headers.get('webhook-id') ?? '',
			'webhook-timestamp': request.headers.get('webhook-timestamp') ?? '',
			'webhook-signature': request.headers.get('webhook-signature') ?? ''
		}) as Record<string, unknown>;
	} catch (err) {
		console.error('[Polar Webhook] Signature verification failed:', err);
		return json({ error: 'Invalid signature' }, { status: 401 });
	}

	const eventType = event.type as string;
	console.log(`[Polar Webhook] Received: ${eventType}`);

	// ── One-time purchase → Lifetime plan ───────────────────────
	if (eventType === 'order.created') {
		const order = event.data as Record<string, unknown>;
		const customer = order.customer as Record<string, unknown>;
		const email = (customer?.email as string)?.toLowerCase();

		if (!email) return json({ error: 'No email in order' }, { status: 400 });

		await setPlanByEmail(email, 'lifetime');
		console.log(`[Polar] ✅ Set plan=lifetime for ${email}`);
	}

	// ── Subscription events → Pro plan ───────────────────────────
	if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
		const sub = event.data as Record<string, unknown>;
		const customer = sub.customer as Record<string, unknown>;
		const email = (customer?.email as string)?.toLowerCase();
		const status = sub.status as string; // 'active' | 'canceled' | 'past_due' etc.

		if (!email) return json({ error: 'No email in subscription' }, { status: 400 });

		const plan = status === 'active' ? 'pro' : 'free';
		await setPlanByEmail(email, plan);
		console.log(`[Polar] ✅ Set plan=${plan} for ${email} (subscription: ${status})`);
	}

	return json({ received: true });
};

// ── Find Firebase user by email → update Firestore plan ──────────
async function setPlanByEmail(email: string, plan: 'lifetime' | 'pro' | 'free') {
	const usersRef = adminDb.collection('users');
	const snap = await usersRef.where('email', '==', email).limit(1).get();

	if (snap.empty) {
		// Buyer hasn't registered yet — store pending plan, applied at signup
		await adminDb.collection('pending_plans').doc(email).set({
			plan,
			setAt: new Date().toISOString()
		});
		console.log(`[Polar] No user found for ${email} — stored as pending plan`);
		return;
	}

	await snap.docs[0].ref.update({
		plan,
		planSetAt: new Date().toISOString()
	});
}
