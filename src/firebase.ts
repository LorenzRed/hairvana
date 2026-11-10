import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { doc, getDoc, getFirestore, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { reactive } from 'vue';

import type { UserProfile } from './types/marketplace';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

const app = isFirebaseConfigured ? (getApps().length ? getApp() : initializeApp(config)) : null;

export const auth = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;
export const storage: FirebaseStorage | null = app && config.storageBucket ? getStorage(app) : null;

export const session = reactive<{
  ready: boolean;
  user: User | null;
  profile: UserProfile | null;
  error: string;
}>({
  ready: !auth,
  user: null,
  profile: null,
  error: '',
});

export const authReady = auth
  ? new Promise<void>((resolve) => {
      onAuthStateChanged(
        auth,
        async (user) => {
          const knownProfile = user && session.user?.uid === user.uid ? session.profile : null;
          session.user = user;
          session.profile = knownProfile;
          session.error = '';

          if (user && db) {
            try {
              const profileSnapshot = await getDoc(doc(db, 'profiles', user.uid));
              if (profileSnapshot.exists()) {
                session.profile = profileSnapshot.data() as UserProfile;
              } else if (session.profile?.uid !== user.uid) {
                session.profile = null;
              }
            } catch (error) {
              session.error = error instanceof Error ? error.message : 'Could not load your account.';
            }
          }

          session.ready = true;
          resolve();
        },
        (error) => {
          session.error = error.message;
          session.ready = true;
          resolve();
        },
      );
    })
  : Promise.resolve();

export function requireFirebase(): { auth: NonNullable<typeof auth>; db: Firestore } {
  if (!auth || !db) {
    throw new Error('Connect a Firebase project before using accounts, listings, or orders.');
  }
  return { auth, db };
}

export async function registerCustomer(email: string, password: string, displayName: string): Promise<UserProfile> {
  const { auth: firebaseAuth, db: firestore } = requireFirebase();
  const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password);
  const profile: UserProfile = {
    uid: credential.user.uid,
    email: credential.user.email ?? email.trim().toLowerCase(),
    displayName: displayName.trim(),
    role: 'customer',
    active: true,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(firestore, 'profiles', credential.user.uid), {
    ...profile,
    createdAt: serverTimestamp(),
  });
  session.user = credential.user;
  session.profile = profile;
  return profile;
}

export async function signIn(email: string, password: string): Promise<UserCredential> {
  const { auth: firebaseAuth, db: firestore } = requireFirebase();
  const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password);
  const profileSnapshot = await getDoc(doc(firestore, 'profiles', credential.user.uid));
  session.user = credential.user;
  session.profile = profileSnapshot.exists() ? (profileSnapshot.data() as UserProfile) : null;

  if (!session.profile) {
    throw new Error('Your account has no assigned role. Ask an admin to finish setting it up.');
  }
  if (!session.profile.active) {
    throw new Error('This account is paused. Contact an admin for help.');
  }
  return credential;
}

export async function signOutUser(): Promise<void> {
  const { auth: firebaseAuth } = requireFirebase();
  await signOut(firebaseAuth);
  session.user = null;
  session.profile = null;
}
