import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { auth, db } from '../firebase';

export type SalonService = {
  id: string;
  name: string;
  price: number;
  duration: number;
  active: boolean;
  imageData?: string;
  createdBy?: string;
};

export type Appointment = {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGender?: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  date: string;
  time: string;
  paymentMethod?: 'gcash' | 'maya' | 'bank_transfer' | 'cash_at_salon';
  paymentBank?: string;
  paymentSenderName?: string;
  paymentReference?: string;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  paymentStatus: 'unpaid' | 'paid';
};

export type ServiceFeedback = {
  id: string;
  appointmentId: string;
  customerId: string;
  serviceId: string;
  serviceName: string;
  rating: number;
  comment: string;
  createdAt?: { toMillis?: () => number } | null;
};

export async function listServices(): Promise<SalonService[]> {
  const snapshot = await getDocs(query(collection(db, 'services'), where('active', '==', true)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as SalonService);
}

export async function createService(
  name: string,
  price: number,
  duration: number,
  imageData?: string,
): Promise<void> {
  await addDoc(collection(db, 'services'), {
    name,
    price,
    duration,
    imageData: imageData || '',
    active: true,
    createdBy: auth.currentUser?.uid || '',
    createdAt: serverTimestamp(),
  });
}

export async function setServiceActive(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, 'services', id), { active });
}

export async function updateService(
  id: string,
  name: string,
  price: number,
  duration: number,
  imageData?: string,
): Promise<void> {
  await updateDoc(doc(db, 'services', id), {
    name,
    price,
    duration,
    ...(imageData ? { imageData } : {}),
  });
}

export async function deleteService(id: string): Promise<void> {
  await deleteDoc(doc(db, 'services', id));
}

export async function createAppointment(
  appointment: Omit<Appointment, 'id' | 'status' | 'paymentStatus'>,
): Promise<void> {
  const appointmentRef = doc(collection(db, 'appointments'));
  const batch = writeBatch(db);
  batch.set(appointmentRef, {
    ...appointment,
    customerId: auth.currentUser?.uid,
    status: 'pending',
    paymentStatus: 'unpaid',
    createdAt: serverTimestamp(),
  });
  (['admin', 'staff'] as const).forEach((recipientRole) => {
    const notificationRef = doc(collection(db, 'notifications'));
    batch.set(notificationRef, {
      title: 'New booking request',
      body: `${appointment.customerName} requested ${appointment.serviceName} for ${appointment.date} at ${appointment.time}.`,
      type: 'booking_created',
      appointmentId: appointmentRef.id,
      recipientRole,
      createdAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

export async function listAppointments(role: string): Promise<Appointment[]> {
  const userId = auth.currentUser?.uid;
  const appointmentsQuery =
    role === 'customer' && userId
      ? query(collection(db, 'appointments'), where('customerId', '==', userId), limit(50))
      : query(collection(db, 'appointments'), orderBy('date'), limit(50));
  const snapshot = await getDocs(appointmentsQuery);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Appointment);
}

export async function updateAppointmentStatus(
  id: string,
  status: Appointment['status'],
): Promise<void> {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('unauthenticated');

  const appointmentRef = doc(db, 'appointments', id);
  const [appointment, userProfile] = await Promise.all([
    getDoc(appointmentRef),
    getDoc(doc(db, 'users', userId)),
  ]);
  const appointmentData = appointment.data();
  const current = appointmentData?.status as Appointment['status'] | undefined;
  const actorRole = userProfile.data()?.role as string | undefined;
  const allowedTransitions: Record<Appointment['status'], Appointment['status'][]> = {
    pending: ['approved', 'cancelled'],
    approved: ['completed'],
    completed: [],
    cancelled: [],
  };
  if (!current || !allowedTransitions[current].includes(status)) {
    throw new Error('invalid-appointment-transition');
  }
  if (!appointmentData) throw new Error('appointment-not-found');

  const batch = writeBatch(db);
  batch.update(appointmentRef, { status });
  const recipientRoles = actorRole === 'customer' && status === 'cancelled'
    ? (['admin', 'staff'] as const)
    : undefined;

  if (recipientRoles) {
    recipientRoles.forEach((recipientRole) => {
      const notificationRef = doc(collection(db, 'notifications'));
      batch.set(notificationRef, {
        title: 'Booking cancelled',
        body: `${appointmentData.customerName} cancelled the ${appointmentData.serviceName} booking for ${appointmentData.date} at ${appointmentData.time}.`,
        type: 'booking_cancelled',
        appointmentId: id,
        recipientRole,
        createdAt: serverTimestamp(),
      });
    });
  } else if (actorRole === 'staff' || actorRole === 'admin') {
    const notificationRef = doc(collection(db, 'notifications'));
    batch.set(notificationRef, {
      title: 'Booking status updated',
      body: `Your ${appointmentData.serviceName} booking for ${appointmentData.date} at ${appointmentData.time} is now ${status}.`,
      type: 'booking_status',
      appointmentId: id,
      recipientUserId: appointmentData.customerId,
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

export async function recordPayment(appointmentId: string, amount: number): Promise<void> {
  const appointmentRef = doc(db, 'appointments', appointmentId);
  const appointment = await getDoc(appointmentRef);
  const appointmentData = appointment.data();
  if (!appointmentData) throw new Error('appointment-not-found');

  const batch = writeBatch(db);
  const paymentRef = doc(collection(db, 'payments'));
  batch.set(paymentRef, {
    appointmentId,
    amount,
    recordedBy: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
  });
  batch.update(appointmentRef, { paymentStatus: 'paid' });
  const notificationRef = doc(collection(db, 'notifications'));
  batch.set(notificationRef, {
    title: 'Payment recorded',
    body: `Your ${appointmentData.serviceName} booking payment has been recorded.`,
    type: 'payment_recorded',
    appointmentId,
    recipientUserId: appointmentData.customerId,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function submitFeedback(
  appointmentId: string,
  rating: number,
  comment: string,
): Promise<void> {
  const customerId = auth.currentUser?.uid;
  if (!customerId) throw new Error('unauthenticated');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('invalid-feedback-rating');
  }

  const appointment = await getDoc(doc(db, 'appointments', appointmentId));
  const appointmentData = appointment.data();
  if (!appointmentData || appointmentData.customerId !== customerId) {
    throw new Error('appointment-not-found');
  }
  if (appointmentData.status !== 'completed') {
    throw new Error('appointment-not-completed');
  }

  await setDoc(doc(db, 'feedback', appointmentId), {
    appointmentId,
    customerId,
    serviceId: appointmentData.serviceId,
    serviceName: appointmentData.serviceName,
    rating,
    comment: comment.trim().slice(0, 500),
    createdAt: serverTimestamp(),
  });
}

export async function listFeedback(): Promise<ServiceFeedback[]> {
  const snapshot = await getDocs(
    query(collection(db, 'feedback'), orderBy('createdAt', 'desc'), limit(60)),
  );
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }) as ServiceFeedback);
}
