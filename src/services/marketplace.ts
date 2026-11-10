import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type QueryConstraint,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';

import { auth, db, requireFirebase, session, storage } from '../firebase';
import type { Product, ProductCategory, StoreOrder, UserProfile } from '../types/marketplace';

function requireUser() {
  if (!session.user || !session.profile?.active) {
    throw new Error('Sign in with an active account to continue.');
  }
  return session.user;
}

function isSellerOrStaff() {
  return session.profile?.role === 'seller' || session.profile?.role === 'staff';
}

export async function uploadProductImage(file: File): Promise<string> {
  const user = requireUser();
  if (!isSellerOrStaff()) throw new Error('Only sellers and staff can upload product photos.');
  if (!storage)
    throw new Error('Firebase Storage is not configured. Add VITE_FIREBASE_STORAGE_BUCKET to your environment.');
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Choose an image smaller than 5 MB.');

  const imageRef = storageRef(storage, `product-images/${user.uid}/${crypto.randomUUID()}`);
  const uploaded = await uploadBytes(imageRef, file, { contentType: file.type });
  return getDownloadURL(uploaded.ref);
}

export function watchAvailableProducts(
  onData: (products: Product[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!db) return () => undefined;
  const productsQuery = query(
    collection(db, 'products'),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    productsQuery,
    (snapshot) => onData(snapshot.docs.map((product) => ({ id: product.id, ...product.data() }) as Product)),
    onError,
  );
}

export function watchStaffProducts(
  staffId: string,
  onData: (products: Product[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!db) return () => undefined;
  const productsQuery = query(
    collection(db, 'products'),
    where('staffId', '==', staffId),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    productsQuery,
    (snapshot) => onData(snapshot.docs.map((product) => ({ id: product.id, ...product.data() }) as Product)),
    onError,
  );
}

export function watchOrders(
  role: 'admin' | 'staff' | 'customer' | 'seller',
  uid: string,
  onData: (orders: StoreOrder[]) => void,
  onError: (error: Error) => void,
): Unsubscribe[] {
  if (!db) return [];
  const orders = collection(db, 'orders');
  const subscribe = (key: string, constraints: QueryConstraint[], collections?: Map<string, StoreOrder[]>) =>
    onSnapshot(
      query(orders, ...constraints),
      (snapshot) => {
        const values = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as StoreOrder);
        if (collections) {
          collections.set(key, values);
          const combined = new Map<string, StoreOrder>();
          collections.forEach((ordersForQuery) => ordersForQuery.forEach((order) => combined.set(order.id, order)));
          onData(
            [...combined.values()].sort((first, second) => {
              const firstDate = timestampMillis(first.createdAt);
              const secondDate = timestampMillis(second.createdAt);
              return secondDate - firstDate;
            }),
          );
        } else {
          onData(values);
        }
      },
      onError,
    );

  if (role === 'admin') return [subscribe('all', [orderBy('createdAt', 'desc')])];
  if (role === 'customer') {
    return [subscribe('buyer', [where('buyerId', '==', uid), orderBy('createdAt', 'desc')])];
  }
  if (role === 'seller') {
    return [subscribe('seller', [where('sellerId', '==', uid), orderBy('createdAt', 'desc')])];
  }
  const staffOrders = new Map<string, StoreOrder[]>();
  return [
    subscribe('pending', [where('status', '==', 'pending'), orderBy('createdAt', 'desc')], staffOrders),
    subscribe('assigned', [where('staffId', '==', uid), orderBy('createdAt', 'desc')], staffOrders),
  ];
}

function timestampMillis(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object' && value !== null && 'toMillis' in value) {
    const toMillis = value.toMillis;
    if (typeof toMillis === 'function') return toMillis.call(value) as number;
  }
  return 0;
}

export function watchStaff(onData: (staff: UserProfile[]) => void, onError: (error: Error) => void): Unsubscribe {
  if (!db) return () => undefined;
  return onSnapshot(
    query(collection(db, 'profiles'), where('role', '==', 'staff'), orderBy('displayName')),
    (snapshot) => onData(snapshot.docs.map((profile) => ({ uid: profile.id, ...profile.data() }) as UserProfile)),
    onError,
  );
}

export function watchSellerApplications(
  onData: (applications: UserProfile[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!db) return () => undefined;
  return onSnapshot(
    query(collection(db, 'profiles'), where('sellerStatus', '==', 'pending'), orderBy('createdAt', 'desc')),
    (snapshot) => onData(snapshot.docs.map((profile) => ({ uid: profile.id, ...profile.data() }) as UserProfile)),
    onError,
  );
}

export async function applyForSeller(description: string): Promise<void> {
  const { db: firestore } = requireFirebase();
  const user = requireUser();
  if (session.profile?.role !== 'customer') {
    throw new Error('Only customer accounts can apply to become a seller.');
  }
  if (session.profile.sellerStatus === 'pending') {
    throw new Error('Your seller application is already being reviewed.');
  }

  await updateDoc(doc(firestore, 'profiles', user.uid), {
    sellerStatus: 'pending',
    sellerDescription: description.trim(),
  });
  session.profile.sellerStatus = 'pending';
  session.profile.sellerDescription = description.trim();
}

export async function reviewSellerApplication(uid: string, approve: boolean): Promise<void> {
  const { db: firestore } = requireFirebase();
  requireUser();
  if (session.profile?.role !== 'admin') throw new Error('Only admins can review seller applications.');
  const application = await getDoc(doc(firestore, 'profiles', uid));
  if (!application.exists() || application.data().sellerStatus !== 'pending') {
    throw new Error('This seller application is no longer pending review.');
  }
  await updateDoc(doc(firestore, 'profiles', uid), {
    role: approve ? 'seller' : 'customer',
    sellerStatus: approve ? 'approved' : 'rejected',
    active: true,
  });
}

export async function inviteStaff(email: string, displayName: string): Promise<void> {
  const { db: firestore } = requireFirebase();
  const user = requireUser();
  if (session.profile?.role !== 'admin') throw new Error('Only admins can invite staff.');

  const normalizedEmail = email.trim().toLowerCase();
  const inviteRef = doc(firestore, 'staffInvites', normalizedEmail);
  const existingInvite = await getDoc(inviteRef);
  if (existingInvite.exists() && existingInvite.data().status !== 'revoked') {
    throw new Error('An invitation for this email already exists.');
  }

  await setDoc(inviteRef, {
    email: normalizedEmail,
    displayName: displayName.trim(),
    status: 'invited',
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  });
}

export async function registerInvitedStaff(email: string, password: string, displayName: string): Promise<UserProfile> {
  const { db: firestore } = requireFirebase();
  if (!auth) throw new Error('Firebase Authentication is not configured.');

  const normalizedEmail = email.trim().toLowerCase();
  const inviteRef = doc(firestore, 'staffInvites', normalizedEmail);
  const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  let invitationDisplayName: string | undefined;
  try {
    const invite = await getDoc(inviteRef);
    if (invite.exists() && invite.data().status === 'invited') {
      invitationDisplayName = invite.data().displayName;
    }
  } catch (error) {
    try {
      await deleteUser(credential.user);
    } catch (cleanupError) {
      throw new Error(
        `Could not verify the staff invitation, and the unused account could not be removed. Contact an admin. ${cleanupError instanceof Error ? cleanupError.message : ''}`,
        { cause: cleanupError },
      );
    }
    throw new Error(
      `Could not verify the staff invitation. The unused account was removed. ${error instanceof Error ? error.message : ''}`,
      { cause: error },
    );
  }
  if (!invitationDisplayName) {
    await deleteUser(credential.user);
    throw new Error('There is no active staff invitation for this email address. The unused account was removed.');
  }

  const profile: UserProfile = {
    uid: credential.user.uid,
    email: normalizedEmail,
    displayName: displayName.trim() || invitationDisplayName,
    role: 'staff',
    active: true,
    createdAt: new Date().toISOString(),
  };

  try {
    const batch = writeBatch(firestore);
    batch.set(doc(firestore, 'profiles', credential.user.uid), {
      ...profile,
      createdAt: serverTimestamp(),
    });
    batch.update(inviteRef, {
      status: 'claimed',
      claimedBy: credential.user.uid,
      claimedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    try {
      await deleteUser(credential.user);
    } catch (cleanupError) {
      throw new Error(
        `The staff account could not finish setup, and could not be removed. Contact an admin. ${cleanupError instanceof Error ? cleanupError.message : ''}`,
        { cause: cleanupError },
      );
    }
    throw new Error(
      `The staff invitation could not be accepted. The unused account was removed; try again or contact an admin. ${error instanceof Error ? error.message : ''}`,
      { cause: error },
    );
  }

  session.user = credential.user;
  session.profile = profile;
  return profile;
}

export async function createProduct(input: {
  name: string;
  description: string;
  category: ProductCategory;
  condition: string;
  size: string;
  price: number;
  image: string;
  brand?: string;
  color?: string;
}): Promise<void> {
  const { db: firestore } = requireFirebase();
  const user = requireUser();
  if (!isSellerOrStaff()) throw new Error('Only approved sellers and staff can list products.');

  await addDoc(collection(firestore, 'products'), {
    ...input,
    name: input.name.trim(),
    description: input.description.trim(),
    image: input.image.trim(),
    staffId: user.uid,
    status: 'active',
    createdAt: serverTimestamp(),
  });
}

export async function updateProduct(
  product: Product,
  values: Pick<
    Product,
    'name' | 'description' | 'category' | 'condition' | 'size' | 'price' | 'image' | 'brand' | 'color'
  >,
): Promise<void> {
  const { db: firestore } = requireFirebase();
  const user = requireUser();
  if (!isSellerOrStaff()) throw new Error('Only sellers and staff can edit listings.');
  if (product.staffId !== user.uid || product.status !== 'active') {
    throw new Error('Only your active listings can be edited.');
  }
  await updateDoc(doc(firestore, 'products', product.id), {
    ...values,
    name: values.name.trim(),
    description: values.description.trim(),
    image: values.image.trim(),
    brand: values.brand?.trim() ?? '',
    color: values.color?.trim() ?? '',
  });
}

export async function archiveProduct(product: Product): Promise<void> {
  const { db: firestore } = requireFirebase();
  const user = requireUser();
  if (!isSellerOrStaff()) throw new Error('Only sellers and staff can remove listings.');
  if (product.staffId !== user.uid || product.status !== 'active') {
    throw new Error('Only your active listings can be removed.');
  }
  await updateDoc(doc(firestore, 'products', product.id), { status: 'archived' });
}

export async function placeCashOrder(input: {
  products: Product[];
  buyerName: string;
  phone: string;
  address: string;
}): Promise<string[]> {
  const { db: firestore } = requireFirebase();
  const user = requireUser();
  if (session.profile?.role !== 'customer' && session.profile?.role !== 'seller') {
    throw new Error('Sign in with a buyer account to place an order.');
  }
  if (!input.products.length || input.products.length > 10) {
    throw new Error('Choose between 1 and 10 items for checkout.');
  }
  if (new Set(input.products.map((product) => product.id)).size !== input.products.length) {
    throw new Error('The shopping bag contains duplicate items. Remove duplicates and try again.');
  }
  if (input.buyerName.trim().length < 2) throw new Error('Enter your full name.');
  const phoneDigits = input.phone.replace(/\D/g, '');
  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    throw new Error('Enter a valid mobile number with 7 to 15 digits.');
  }
  if (input.address.trim().length < 8) {
    throw new Error('Enter a complete delivery address (at least 8 characters).');
  }

  const checkoutItems = input.products.map((product) => ({
    productRef: doc(firestore, 'products', product.id),
    orderRef: doc(collection(firestore, 'orders')),
  }));

  await runTransaction(firestore, async (transaction) => {
    const snapshots = await Promise.all(checkoutItems.map(({ productRef }) => transaction.get(productRef)));
    if (snapshots.some((snapshot) => !snapshot.exists() || snapshot.data().status !== 'active')) {
      throw new Error('One or more items have just been reserved or sold. Refresh your cart and try again.');
    }

    snapshots.forEach((productSnapshot, index) => {
      const { productRef, orderRef } = checkoutItems[index];
      const product = productSnapshot.data() as Omit<Product, 'id'>;
      transaction.update(productRef, {
        status: 'reserved',
        reservedFor: user.uid,
        reservedOrderId: orderRef.id,
      });
      transaction.set(orderRef, {
        buyerId: user.uid,
        buyerName: input.buyerName.trim(),
        phone: input.phone.trim(),
        address: input.address.trim(),
        item: {
          id: productSnapshot.id,
          name: product.name,
          image: product.image,
          size: product.size,
          price: product.price,
        },
        sellerId: product.staffId,
        total: product.price,
        paymentMethod: 'cash_on_delivery',
        status: 'pending',
        staffId: null,
        createdAt: serverTimestamp(),
      });
    });
  });

  return checkoutItems.map(({ orderRef }) => orderRef.id);
}

export async function claimOrder(orderId: string): Promise<void> {
  const { db: firestore } = requireFirebase();
  const user = requireUser();
  if (session.profile?.role !== 'staff') throw new Error('Only staff can claim deliveries.');

  await runTransaction(firestore, async (transaction) => {
    const orderRef = doc(firestore, 'orders', orderId);
    const order = await transaction.get(orderRef);
    if (!order.exists() || order.data().status !== 'pending') {
      throw new Error('This order has already been claimed.');
    }
    transaction.update(orderRef, {
      status: 'claimed',
      staffId: user.uid,
      claimedAt: serverTimestamp(),
    });
  });
}

export async function markOrderDelivered(orderId: string): Promise<void> {
  const { db: firestore } = requireFirebase();
  const user = requireUser();
  if (session.profile?.role !== 'staff') throw new Error('Only staff can complete deliveries.');

  await runTransaction(firestore, async (transaction) => {
    const orderRef = doc(firestore, 'orders', orderId);
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists()) throw new Error('Order not found.');

    const order = orderSnapshot.data() as Omit<StoreOrder, 'id'>;
    if (order.status !== 'claimed' || order.staffId !== user.uid) {
      throw new Error('Only the staff member who claimed this order can complete it.');
    }

    const productRef = doc(firestore, 'products', order.item.id);
    const productSnapshot = await transaction.get(productRef);
    if (!productSnapshot.exists() || productSnapshot.data().reservedOrderId !== orderId) {
      throw new Error('The reserved item could not be verified. Contact an admin.');
    }

    transaction.update(orderRef, { status: 'delivered', deliveredAt: serverTimestamp() });
    transaction.update(productRef, {
      status: 'sold',
      soldAt: serverTimestamp(),
      reservedFor: deleteField(),
      reservedOrderId: deleteField(),
    });
  });
}

export async function cancelOrder(orderId: string): Promise<void> {
  const { db: firestore } = requireFirebase();
  const user = requireUser();
  if (session.profile?.role !== 'customer') throw new Error('Only the customer can cancel this order.');

  await runTransaction(firestore, async (transaction) => {
    const orderRef = doc(firestore, 'orders', orderId);
    const orderSnapshot = await transaction.get(orderRef);
    if (
      !orderSnapshot.exists() ||
      orderSnapshot.data().buyerId !== user.uid ||
      orderSnapshot.data().status !== 'pending'
    ) {
      throw new Error('Only unclaimed orders can be cancelled.');
    }

    const productRef = doc(firestore, 'products', orderSnapshot.data().item.id);
    const productSnapshot = await transaction.get(productRef);
    if (!productSnapshot.exists() || productSnapshot.data().reservedOrderId !== orderId) {
      throw new Error('The reserved item could not be verified. Contact an admin.');
    }

    transaction.update(orderRef, { status: 'cancelled', cancelledAt: serverTimestamp() });
    transaction.update(productRef, {
      status: 'active',
      reservedFor: deleteField(),
      reservedOrderId: deleteField(),
    });
  });
}

export async function setStaffActive(staffId: string, active: boolean): Promise<void> {
  const { db: firestore } = requireFirebase();
  requireUser();
  if (session.profile?.role !== 'admin') throw new Error('Only admins can manage staff accounts.');
  await updateDoc(doc(firestore, 'profiles', staffId), { active });
}
