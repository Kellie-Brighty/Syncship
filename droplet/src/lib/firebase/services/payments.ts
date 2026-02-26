import { db } from '../client';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';

export interface UserPlan {
	plan: 'free' | 'pro' | 'lifetime';
	planSetAt: string;
	subscriptionEndDate?: string;
	isWhitelisted?: boolean;
}

/**
 * Updates a user's plan in Firestore.
 * This is the client-side version (service).
 */
export async function updateUserPlan(uid: string, planData: Partial<UserPlan>) {
	const userRef = doc(db, 'users', uid);
	await setDoc(userRef, {
		...planData,
		planSetAt: new Date().toISOString()
	}, { merge: true });
}

/**
 * Gets a user's currently active plan and status
 */
export async function getUserPlan(uid: string): Promise<UserPlan> {
	const userRef = doc(db, 'users', uid);
	const snap = await getDoc(userRef);
	
	if (!snap.exists()) {
		return {
			plan: 'free',
			planSetAt: new Date().toISOString()
		};
	}

	const data = snap.data();
	return {
		plan: data.plan || 'free',
		planSetAt: data.planSetAt || new Date().toISOString(),
		subscriptionEndDate: data.subscriptionEndDate,
		isWhitelisted: data.isWhitelisted || false
	};
}

/**
 * Checks if a user has active access (either lifetime, whitelisted, or active sub)
 */
export async function checkAccess(uid: string, email?: string): Promise<boolean> {
	// Whitelist check for Kelly
	if (email === 'kelliebrighty@gmail.com') return true;

	const plan = await getUserPlan(uid);
	
	if (plan.isWhitelisted) return true;
	if (plan.plan === 'lifetime') return true;
	
	if (plan.plan === 'pro' && plan.subscriptionEndDate) {
		const endDate = new Date(plan.subscriptionEndDate);
		return endDate > new Date();
	}

	return false;
}
