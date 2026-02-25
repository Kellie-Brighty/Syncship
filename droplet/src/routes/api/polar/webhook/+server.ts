import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDb } from '$lib/server/firebase-admin';

// ── Polar webhook handler ────────────────────────────────────────
// Polar sends events when a purchase or subscription is created.
// We verify the webhook secret, find the user by email, and set
// their `plan` field in Firestore to 'lifetime' or 'pro'.
//
// Required env vars:
//   POLAR_WEBHOOK_SECRET  — from Polar Dashboard → Settings → Webhooks

const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET ?? '';

async function verifyPolarSignature(req: Request, rawBody: string): Promise<boolean> {
	const signature = req.headers.get('webhook-signature') ?? '';
	if (!signature || !POLAR_WEBHOOK_SECRET) return false;

	// Polar uses HMAC-SHA256: "sha256=<hex>"
	const [algo, receivedHex] = signature.split('=');
	if (algo !== 'sha256') return false;

	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(POLAR_WEBHOOK_SECRET),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
	const expectedHex = Array.from(new Uint8Array(mac))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

	return expectedHex === receivedHex;
}

export const POST: RequestHandler = async ({ request }) => {
	const rawBody = await request.text();

	// Verify signature
	const valid = await verifyPolarSignature(request, rawBody);
	if (!valid) {
		console.error('[Polar Webhook] Invalid signature');
		return json({ error: 'Invalid signature' }, { status: 401 });
	}

	let event: Record<string, unknown>;
	try {
		event = JSON.parse(rawBody);
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const eventType = event.type as string;
	console.log(`[Polar Webhook] Received: ${eventType}`);

	// Handle one-time purchase (lifetime deal)
	if (eventType === 'order.created') {
		const order = event.data as Record<string, unknown>;
		const customer = order.customer as Record<string, unknown>;
		const email = customer?.email as string;

		if (!email) {
			return json({ error: 'No email in order' }, { status: 400 });
		}

		await setPlanByEmail(email, 'lifetime');
		console.log(`[Polar Webhook] Set plan=lifetime for ${email}`);
	}

	// Handle recurring subscription (pro monthly — future use)
	if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
		const sub = event.data as Record<string, unknown>;
		const customer = sub.customer as Record<string, unknown>;
		const email = customer?.email as string;
		const status = sub.status as string; // 'active' | 'canceled' | etc.

		if (!email) {
			return json({ error: 'No email in subscription' }, { status: 400 });
		}

		const plan = status === 'active' ? 'pro' : 'free';
		await setPlanByEmail(email, plan);
		console.log(`[Polar Webhook] Set plan=${plan} for ${email} (subscription status: ${status})`);
	}

	return json({ received: true });
};

// ── Helper: find Firebase user by email → update Firestore plan ──
async function setPlanByEmail(email: string, plan: 'lifetime' | 'pro' | 'free') {
	const usersRef = adminDb.collection('users');
	const snap = await usersRef.where('email', '==', email).limit(1).get();

	if (snap.empty) {
		// User hasn't signed up yet — store a pending plan record
		// so when they register with this email it gets applied
		await adminDb.collection('pending_plans').doc(email).set({
			plan,
			setAt: new Date().toISOString()
		});
		console.log(`[Polar Webhook] No user found for ${email} — stored pending plan`);
		return;
	}

	const userDoc = snap.docs[0];
	await userDoc.ref.update({ plan, planSetAt: new Date().toISOString() });
}
