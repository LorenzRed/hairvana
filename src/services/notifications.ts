import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';

import { db } from '../firebase';

export type AppRole = 'admin' | 'staff' | 'customer';

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  appointmentId?: string;
  createdAt?: { toMillis?: () => number } | null;
};

function mapSnapshot(snapshot: QuerySnapshot<DocumentData>): AppNotification[] {
  return snapshot.docs.map((item) => ({
    id: item.id,
    title: String(item.data().title || 'Update'),
    body: String(item.data().body || ''),
    type: String(item.data().type || 'update'),
    appointmentId: typeof item.data().appointmentId === 'string' ? item.data().appointmentId : undefined,
    createdAt: item.data().createdAt || null,
  }));
}

export function subscribeNotifications(
  userId: string,
  role: AppRole,
  onUpdate: (notifications: AppNotification[], readIds: Set<string>) => void,
  onError: (error: Error) => void,
): () => void {
  if (!userId) return () => undefined;

  let roleNotifications: AppNotification[] = [];
  let userNotifications: AppNotification[] = [];
  let readIds = new Set<string>();

  const publish = () => {
    const notifications = new Map<string, AppNotification>();
    [...roleNotifications, ...userNotifications].forEach((item) => notifications.set(item.id, item));
    const sorted = [...notifications.values()].sort(
      (first, second) => (second.createdAt?.toMillis?.() || 0) - (first.createdAt?.toMillis?.() || 0),
    );
    onUpdate(sorted, readIds);
  };

  let roleUnsubscribe: () => void = () => undefined;
  if (role === 'admin' || role === 'staff') {
    roleUnsubscribe = onSnapshot(
      query(collection(db, 'notifications'), where('recipientRole', '==', role)),
      (snapshot) => {
        roleNotifications = mapSnapshot(snapshot);
        publish();
      },
      onError,
    );
  }
  const userUnsubscribe = onSnapshot(
    query(collection(db, 'notifications'), where('recipientUserId', '==', userId)),
    (snapshot) => {
      userNotifications = mapSnapshot(snapshot);
      publish();
    },
    onError,
  );
  const readsUnsubscribe = onSnapshot(
    collection(db, 'users', userId, 'notificationReads'),
    (snapshot) => {
      readIds = new Set(snapshot.docs.map((item) => item.id));
      publish();
    },
    onError,
  );

  return () => {
    roleUnsubscribe();
    userUnsubscribe();
    readsUnsubscribe();
  };
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  await setDoc(doc(db, 'users', userId, 'notificationReads', notificationId), {
    userId,
    notificationId,
    readAt: serverTimestamp(),
  });
}

export async function markAllNotificationsRead(userId: string, notificationIds: string[]): Promise<void> {
  for (let start = 0; start < notificationIds.length; start += 450) {
    const batch = writeBatch(db);
    notificationIds.slice(start, start + 450).forEach((notificationId) => {
      batch.set(doc(db, 'users', userId, 'notificationReads', notificationId), {
        userId,
        notificationId,
        readAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }
}
