import {
  doc,
  getDoc,
  setDoc,
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
    // First-time user — create the document
    await setDoc(ref, {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      photoURL: firebaseUser.photoURL || null,
      role: 'admin',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } else {
    // Returning user — update last login info
    await setDoc(ref, {
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || snapshot.data().displayName,
      photoURL: firebaseUser.photoURL || snapshot.data().photoURL || null,
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
