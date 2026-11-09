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
  updateDoc,
  where,
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
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  date: string;
  time: string;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  paymentStatus: 'unpaid' | 'paid';
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
  const [serviceSnapshot, staffSnapshot] = await Promise.all([
    getDocs(query(
      collection(db, 'appointments'),
      where('serviceId', '==', appointment.serviceId),
      where('date', '==', appointment.date),
    )),
    getDocs(query(
      collection(db, 'appointments'),
      where('staffId', '==', appointment.staffId),
      where('date', '==', appointment.date),
    )),
  ]);
  const activeAppointments = [...serviceSnapshot.docs, ...staffSnapshot.docs]
    .map((item) => item.data() as Appointment)
    .filter((item) => item.time === appointment.time && item.status !== 'cancelled');
  if (activeAppointments.length) {
    throw new Error('appointment-slot-unavailable');
  }

  await addDoc(collection(db, 'appointments'), {
    ...appointment,
    customerId: auth.currentUser?.uid,
    status: 'pending',
    paymentStatus: 'unpaid',
    createdAt: serverTimestamp(),
  });
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
  const appointment = await getDoc(doc(db, 'appointments', id));
  const current = appointment.data()?.status as Appointment['status'] | undefined;
  const allowedTransitions: Record<Appointment['status'], Appointment['status'][]> = {
    pending: ['approved', 'cancelled'],
    approved: ['completed'],
    completed: [],
    cancelled: [],
  };
  if (!current || !allowedTransitions[current].includes(status)) {
    throw new Error('invalid-appointment-transition');
  }
  await updateDoc(doc(db, 'appointments', id), { status });
}

export async function recordPayment(appointmentId: string, amount: number): Promise<void> {
  await addDoc(collection(db, 'payments'), {
    appointmentId,
    amount,
    recordedBy: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'appointments', appointmentId), { paymentStatus: 'paid' });
}

export async function submitFeedback(
  appointmentId: string,
  rating: number,
  comment: string,
): Promise<void> {
  await addDoc(collection(db, 'feedback'), {
    appointmentId,
    customerId: auth.currentUser?.uid,
    rating,
    comment,
    createdAt: serverTimestamp(),
  });
}
