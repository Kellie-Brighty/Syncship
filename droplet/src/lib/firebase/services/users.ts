import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '$lib/firebase/client';
import type { User } from '$lib/types/models';
import type { User as FirebaseUser } from 'firebase/auth';

const COLLECTION = 'users';

/**
 * Creates or updates the user profile document in Firestore.
 * Called after every successful authentication (Google or email/password).
 * Uses `merge: true` so existing data is preserved on subsequent logins.
 */
export async function ensureUserProfile(firebaseUser: FirebaseUser): Promise<void> {
  const ref = doc(db, COLLECTION, firebaseUser.uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    // Check for pending plans from Polar
    let plan = 'free';
    let isWhitelisted = firebaseUser.email === 'kelliebrighty@gmail.com';
    
    if (firebaseUser.email) {
      const pendingRef = doc(db, 'pending_plans', firebaseUser.email.toLowerCase());
      const pendingSnap = await getDoc(pendingRef);
      if (pendingSnap.exists()) {
        const pData = pendingSnap.data();
        plan = pData.plan || 'free';
        if (pData.isWhitelisted) isWhitelisted = true;
        await deleteDoc(pendingRef);
      }
    }

    // First-time user — create the document
    await setDoc(ref, {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      photoURL: firebaseUser.photoURL || null,
      role: firebaseUser.email === 'kelliebrighty@gmail.com' ? 'admin' : 'user',
      plan: plan,
      isWhitelisted: isWhitelisted,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } else {
    // Returning user — update last login info
    const data = snapshot.data();
    await setDoc(ref, {
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || data.displayName,
      photoURL: firebaseUser.photoURL || data.photoURL || null,
      role: firebaseUser.email === 'kelliebrighty@gmail.com' ? 'admin' : (data.role || 'user'),
      isWhitelisted: firebaseUser.email === 'kelliebrighty@gmail.com' ? true : (data.isWhitelisted || false),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const ref = doc(db, COLLECTION, uid);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    uid: data.uid,
    email: data.email,
    displayName: data.displayName,
    role: data.role ?? 'admin',
    createdAt: data.createdAt?.toDate() ?? new Date(),
    updatedAt: data.updatedAt?.toDate() ?? new Date()
  };
}
