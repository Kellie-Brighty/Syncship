import { writable, derived } from 'svelte/store';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  type User
} from 'firebase/auth';
import { auth } from '$lib/firebase/client';
import { ensureUserProfile } from '$lib/firebase/services/users';

const googleProvider = new GoogleAuthProvider();

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const authState = writable<AuthState>({
  user: null,
  loading: true,
  error: null
});

// Listen for auth state changes and sync user profile to Firestore
if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, async (user) => {
    authState.update((state) => ({
      ...state,
      user,
      loading: false
    }));

    // Create or update the user's Firestore profile
    if (user) {
      try {
        await ensureUserProfile(user);
      } catch (err) {
        console.error('Failed to sync user profile:', err);
      }
    }
  });
}

export const currentUser = derived(authState, ($state) => $state.user);
export const authLoading = derived(authState, ($state) => $state.loading);
export const authError = derived(authState, ($state) => $state.error);

export async function signIn(email: string, password: string) {
  authState.update((s) => ({ ...s, error: null, loading: true }));
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err: any) {
    authState.update((s) => ({ ...s, error: err.message, loading: false }));
    throw err;
  }
}

export async function signUp(email: string, password: string) {
  authState.update((s) => ({ ...s, error: null, loading: true }));
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (err: any) {
    authState.update((s) => ({ ...s, error: err.message, loading: false }));
    throw err;
  }
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export async function signInWithGoogle() {
  authState.update((s) => ({ ...s, error: null, loading: true }));
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err: any) {
    authState.update((s) => ({ ...s, error: err.message, loading: false }));
    throw err;
  }
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}
