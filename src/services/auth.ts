import { deleteApp, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';

import { auth, db, firebaseConfig } from '../firebase';

const PROFILE_WRITE_TIMEOUT_MS = 10000;

export type UserProfile = {
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'customer';
};

export async function registerUser(
  name: string,
  email: string,
  password: string,
  role: UserProfile['role'],
): Promise<User> {
  const credentials = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credentials.user, { displayName: name });
  await saveUserProfile(credentials.user.uid, name, email, role);
  return credentials.user;
}

export async function createStaffAccount(
  name: string,
  email: string,
  password: string,
): Promise<void> {
  if (!auth.currentUser) throw new Error('admin-auth-required');

  const staffApp = initializeApp(firebaseConfig, `staff-account-${Date.now()}`);
  const staffAuth = getAuth(staffApp);
  try {
    const credentials = await createUserWithEmailAndPassword(staffAuth, email, password);
    await updateProfile(credentials.user, { displayName: name });
    await saveUserProfile(credentials.user.uid, name, email, 'staff');
  } finally {
    await signOut(staffAuth);
    await deleteApp(staffApp);
  }
}

export async function listStaffProfiles(): Promise<(UserProfile & { id: string })[]> {
  const snapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'staff')));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as UserProfile & { id: string });
}

export async function deleteStaffProfile(id: string): Promise<void> {
  await deleteDoc(doc(db, 'users', id));
}

async function saveUserProfile(
  uid: string,
  name: string,
  email: string,
  role: UserProfile['role'],
): Promise<void> {
  const profileWrite = setDoc(doc(db, 'users', uid), {
    name,
    email,
    role,
    createdAt: serverTimestamp(),
  });
  const timeout = new Promise<never>((_, reject) => {
    window.setTimeout(
      () => reject(new Error('profile-write-timeout')),
      PROFILE_WRITE_TIMEOUT_MS,
    );
  });
  await Promise.race([profileWrite, timeout]);
}

export async function login(email: string, password: string): Promise<User> {
  const credentials = await signInWithEmailAndPassword(auth, email, password);
  return credentials.user;
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const profile = await getDoc(doc(db, 'users', user.uid));
  if (!profile.exists()) {
    return {
      name: user.displayName || 'Salon owner',
      email: user.email || '',
      role: 'customer',
    };
  }

  return profile.data() as UserProfile;
}

export function logout(): Promise<void> {
  return signOut(auth);
}

export function waitForAuthState(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}
