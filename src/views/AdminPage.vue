<template>
  <ion-page>
    <ion-content :fullscreen="true" class="admin-content">
      <main class="admin-shell">
        <header class="admin-topbar">
          <div class="brand-lockup"><img class="brand-mark" src="/hairvana-logo.png" alt="Hairvana" /><div><span class="eyebrow">HAIRVANA ADMIN</span><h1>Salon command center</h1></div></div>
          <div class="admin-topbar-actions">
            <NotificationCenter
              v-if="auth.currentUser?.uid"
              :user-id="auth.currentUser.uid"
              role="admin"
              @select="openAppointmentFromNotification"
            />
            <button class="logout-button" @click="signOut">Sign out</button>
          </div>
        </header>

        <section class="admin-welcome">
          <div><span class="eyebrow">OWNER DASHBOARD</span><h2>Run your salon beautifully.</h2><p>Monitor bookings, services, sales activity, and your salon team from one place.</p></div>
          <div class="welcome-mark">✦</div>
        </section>

        <section class="metrics-grid">
          <article><span>Bookings</span><strong>{{ appointments.length }}</strong><small>All salon appointments</small></article>
          <article><span>Pending</span><strong>{{ pendingCount }}</strong><small>Need your attention</small></article>
          <article><span>Services</span><strong>{{ services.length }}</strong><small>Live menu treatments</small></article>
          <article><span>Staff</span><strong>{{ staff.length }}</strong><small>Salon team members</small></article>
        </section>

        <section class="charts-grid">
          <article class="admin-panel chart-panel">
            <div class="section-heading"><div><span class="eyebrow">BOOKING INSIGHTS</span><h3>Appointment status</h3></div><span class="chart-total">{{ appointments.length }} total</span></div>
            <div class="status-chart">
              <div v-for="item in statusChart" :key="item.label" class="chart-row">
                <div class="chart-label"><span :class="`chart-dot ${item.color}`"></span><span>{{ item.label }}</span><strong>{{ item.value }}</strong></div>
                <div class="chart-track"><span :class="`chart-bar ${item.color}`" :style="{ width: `${item.percent}%` }"></span></div>
              </div>
            </div>
          </article>
          <article class="admin-panel chart-panel">
            <div class="section-heading"><div><span class="eyebrow">POPULAR SERVICES</span><h3>What guests book</h3></div></div>
            <div class="service-chart">
              <div v-for="item in popularServices" :key="item.name" class="chart-row">
                <div class="chart-label"><span>{{ item.name }}</span><strong>{{ item.value }}</strong></div>
                <div class="chart-track"><span class="chart-bar service-bar" :style="{ width: `${item.percent}%` }"></span></div>
              </div>
              <p v-if="!popularServices.length" class="empty-state">Booking data will appear here.</p>
            </div>
          </article>
        </section>

        <div class="admin-columns">
          <section class="admin-panel">
            <div class="section-heading"><div><span class="eyebrow">TEAM MANAGEMENT</span><h3>Add a staff member</h3></div></div>
            <form class="staff-form" @submit.prevent="addStaff">
              <label><span>Full name</span><input v-model.trim="newStaff.name" placeholder="e.g. Mia Santos" required /></label>
              <label><span>Email</span><input v-model.trim="newStaff.email" type="email" placeholder="staff@hairvana.com" required /></label>
              <label><span>Temporary password</span><input v-model="newStaff.password" type="password" minlength="6" placeholder="At least 6 characters" required /></label>
              <button class="primary-button" type="submit" :disabled="addingStaff">
                {{ addingStaff ? 'Adding staff...' : 'Add staff' }}
              </button>
            </form>
            <p v-if="staffError" class="staff-error" role="alert">{{ staffError }}</p>
            <div v-if="staff.length" class="staff-list">
              <article v-for="member in staff" :key="member.id" class="staff-row">
                <div class="avatar">{{ member.name.charAt(0).toUpperCase() }}</div>
                <div><strong>{{ member.name }}</strong><small>{{ member.email }}</small></div>
                <button class="remove-button" type="button" @click="removeStaff(member.id, member.name)">Remove</button>
              </article>
            </div>
            <p v-else class="empty-state">No staff accounts yet.</p>
          </section>

          <section id="latest-appointments" class="admin-panel">
            <div class="section-heading"><div><span class="eyebrow">BOOKING MONITOR</span><h3>Latest appointments</h3></div></div>
            <article v-for="appointment in appointments.slice(0, 6)" :id="`appointment-${appointment.id}`" :key="appointment.id" class="booking-row">
              <div>
                <strong>{{ appointment.serviceName }}</strong>
                <small>{{ appointment.date }} · {{ appointment.time }} · {{ appointment.customerName }}</small>
                <small v-if="appointment.customerPhone || appointment.customerEmail">
                  {{ appointment.customerPhone }}{{ appointment.customerPhone && appointment.customerEmail ? ' · ' : '' }}{{ appointment.customerEmail }}
                </small>
                <small v-if="appointment.paymentMethod">
                  Preferred payment: {{ appointment.paymentMethod === 'bank_transfer' ? `Bank transfer · ${appointment.paymentBank || 'bank not specified'}` : appointment.paymentMethod === 'cash_at_salon' ? 'Cash at salon' : appointment.paymentMethod }}
                </small>
                <small v-if="appointment.paymentSenderName">Transfer sender: {{ appointment.paymentSenderName }}</small>
                <small v-if="appointment.paymentReference">Transfer reference: {{ appointment.paymentReference }}</small>
              </div>
              <span class="status" :class="appointment.status">{{ appointment.status }}</span>
            </article>
            <p v-if="!appointments.length" class="empty-state">No appointments yet.</p>
          </section>
        </div>

        <section class="admin-panel service-panel">
          <div class="section-heading"><div><span class="eyebrow">SERVICE MENU</span><h3>Live treatments</h3></div></div>
          <div class="service-grid">
            <article v-for="service in services" :key="service.id"><img :src="service.imageData || fallbackImage" :alt="service.name" /><div><strong>{{ service.name }}</strong><small>{{ service.duration }} min · ₱{{ service.price }}</small></div></article>
          </div>
        </section>
        <p v-if="dataError" class="staff-error" role="alert">{{ dataError }}</p>
        <p v-if="message" class="message">{{ message }}</p>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { IonContent, IonPage } from '@ionic/vue';
import { useRouter } from 'vue-router';
import NotificationCenter from '../components/NotificationCenter.vue';
import { auth } from '../firebase';
import { createStaffAccount, deleteStaffProfile, listStaffProfiles, logout, type UserProfile } from '../services/auth';
import { listAppointments, listServices, type Appointment, type SalonService } from '../services/salon';

const router = useRouter();
const staff = ref<(UserProfile & { id: string })[]>([]);
const services = ref<SalonService[]>([]);
const appointments = ref<Appointment[]>([]);
const message = ref('');
const staffError = ref('');
const dataError = ref('');
const addingStaff = ref(false);
const newStaff = reactive({ name: '', email: '', password: '' });
const fallbackImage = 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=500&q=80';
const pendingCount = computed(() => appointments.value.filter((item) => item.status === 'pending').length);
const statusChart = computed(() => {
  const statuses: Appointment['status'][] = ['pending', 'approved', 'completed', 'cancelled'];
  const colors = ['peach', 'sage', 'lavender', 'muted'];
  const total = appointments.value.length || 1;
  return statuses.map((status, index) => {
    const value = appointments.value.filter((item) => item.status === status).length;
    return {
      label: status.charAt(0).toUpperCase() + status.slice(1),
      value,
      percent: Math.round((value / total) * 100),
      color: colors[index],
    };
  });
});
const popularServices = computed(() => {
  const counts = new Map<string, number>();
  appointments.value.forEach((appointment) => {
    counts.set(appointment.serviceName, (counts.get(appointment.serviceName) || 0) + 1);
  });
  const items = [...counts.entries()]
    .sort(([, first], [, second]) => second - first)
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));
  const max = items[0]?.value || 1;
  return items.map((item) => ({ ...item, percent: Math.round((item.value / max) * 100) }));
});

async function loadData() {
  dataError.value = '';
  const [staffResult, servicesResult, appointmentsResult] = await Promise.allSettled([
    listStaffProfiles(),
    listServices(),
    listAppointments('admin'),
  ]);

  if (staffResult.status === 'fulfilled') {
    staff.value = staffResult.value;
    staffError.value = '';
  } else {
    console.error('Unable to load staff profiles', staffResult.reason);
    const error = staffResult.reason as { code?: unknown };
    const code = typeof error.code === 'string' ? error.code : '';
    staffError.value = code === 'permission-denied'
      ? 'Firestore rules are blocking the admin from reading staff profiles. Check the rules for the users collection.'
      : code
        ? `Unable to load staff profiles (${code}). Check the Firestore connection and rules.`
        : 'Unable to load staff profiles. Check the browser console and Firestore rules.';
  }

  if (servicesResult.status === 'fulfilled') {
    services.value = servicesResult.value;
  } else {
    console.error('Unable to load salon services', servicesResult.reason);
    dataError.value = 'Unable to load salon services. Check your Firestore connection and security rules.';
  }

  if (appointmentsResult.status === 'fulfilled') {
    appointments.value = appointmentsResult.value;
  } else {
    console.error('Unable to load salon appointments', appointmentsResult.reason);
    dataError.value = `${dataError.value} Unable to load appointments. Check your Firestore connection and security rules.`.trim();
  }
}

async function addStaff() {
  addingStaff.value = true;
  staffError.value = '';
  message.value = '';
  try {
    await createStaffAccount(newStaff.name, newStaff.email, newStaff.password);
    newStaff.name = '';
    newStaff.email = '';
    newStaff.password = '';
    await loadData();
    message.value = 'Staff account added successfully.';
  } catch (error) {
    const firebaseError = error as { code?: unknown; message?: unknown };
    const code = typeof firebaseError.code === 'string' ? firebaseError.code : '';
    const detail = typeof firebaseError.message === 'string' ? firebaseError.message : '';
    if (detail === 'profile-write-timeout') {
      staffError.value = 'Staff profile creation timed out. Check the Firestore connection and security rules, then try again.';
    } else if (code === 'auth/email-already-in-use') {
      staffError.value = 'That email already has an account. Use a different email address.';
    } else if (code === 'auth/weak-password') {
      staffError.value = 'Choose a stronger temporary password with at least 6 characters.';
    } else if (code === 'auth/invalid-email') {
      staffError.value = 'Enter a valid email address.';
    } else if (code === 'auth/operation-not-allowed') {
      staffError.value = 'Email and password accounts are disabled in Firebase Authentication.';
    } else if (code === 'auth/network-request-failed') {
      staffError.value = 'Network connection failed. Check your internet and try again.';
    } else if (code === 'permission-denied' || detail.includes('permission-denied')) {
      staffError.value = 'Firestore denied the staff profile write. Check the Firestore security rules for staff account creation.';
    } else {
      console.error('Unable to add staff member', error);
      staffError.value = code
        ? `Could not add staff member (${code}). Check the Firebase configuration and Firestore security rules.`
        : 'Could not add staff member. Check the Firebase configuration and try again.';
    }
  } finally {
    addingStaff.value = false;
  }
}

async function removeStaff(id: string, name: string) {
  if (!window.confirm(`Remove ${name} from the staff list?`)) return;
  await deleteStaffProfile(id);
  await loadData();
  message.value = 'Staff member removed.';
}

async function signOut() {
  await logout();
  await router.push('/auth');
}

function openAppointmentFromNotification(notification: { appointmentId?: string }) {
  window.setTimeout(() => {
    const appointment = notification.appointmentId
      ? document.getElementById(`appointment-${notification.appointmentId}`)
      : null;
    (appointment || document.getElementById('latest-appointments'))?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, 300);
}

onMounted(() => {
  void loadData();
});
</script>

<style scoped>
.admin-content { --background:#f8f5f2; }.admin-shell { width:min(100% - 32px,1240px); margin:auto; padding:28px 0 70px; color:#3b3331; }.admin-topbar,.brand-lockup,.section-heading,.staff-row,.booking-row { display:flex; align-items:center; }.admin-topbar,.section-heading { justify-content:space-between; }.admin-topbar-actions { display:flex;align-items:center;gap:10px; }.brand-lockup { gap:12px; }.brand-mark { width:42px;height:42px;display:grid;place-items:center;border-radius:14px;background:#332d2c;color:#fff;font:700 22px Georgia,serif; }.eyebrow { color:#a16a5d;font-size:10px;font-weight:800;letter-spacing:1.6px; }.admin-topbar h1 { margin:4px 0 0;font:600 21px Georgia,serif; }.logout-button,.remove-button { border:0;border-radius:20px;padding:10px 14px;background:#fff;color:#a85e50;font-size:11px;font-weight:700; }.admin-welcome { display:flex;justify-content:space-between;align-items:center;margin-top:28px;padding:36px;border-radius:25px;background:linear-gradient(115deg,#342c2b,#875d52);color:#fff; }.admin-welcome .eyebrow { color:#f0c7ba; }.admin-welcome h2 { margin:10px 0;color:#fff;font:400 38px Georgia,serif; }.admin-welcome p { max-width:500px;color:#e3ccc5;font-size:13px;line-height:1.6; }.welcome-mark { font:400 90px Georgia,serif;color:#e9b9a9; }.metrics-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:18px; }.metrics-grid article,.admin-panel { padding:20px;border:1px solid #eee8e4;border-radius:20px;background:#fff; }.metrics-grid span,.metrics-grid small,.staff-row small,.booking-row small,.service-grid small { display:block;color:#9e928e;font-size:11px; }.metrics-grid strong { display:block;margin:10px 0 5px;color:#332d2c;font:600 30px Georgia,serif; }.charts-grid { display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px; }.chart-panel { min-width:0; }.chart-total { color:#a09692;font-size:10px; }.chart-row { margin-top:15px; }.chart-label { display:flex;align-items:center;gap:8px;color:#756966;font-size:11px; }.chart-label strong { margin-left:auto;color:#3b3331;font-size:11px; }.chart-dot { width:8px;height:8px;border-radius:50%; }.chart-track { height:8px;margin-top:7px;overflow:hidden;border-radius:10px;background:#f1ece9; }.chart-bar { display:block;height:100%;min-width:3px;border-radius:10px;transition:width .3s ease; }.chart-bar.peach,.chart-dot.peach { background:#c98777; }.chart-bar.sage,.chart-dot.sage { background:#8caf91; }.chart-bar.lavender,.chart-dot.lavender { background:#9890b8; }.chart-bar.muted,.chart-dot.muted { background:#c3b4ad; }.service-bar { background:linear-gradient(90deg,#bd7b6c,#e2b2a3); }.admin-columns { display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px; }.section-heading { align-items:flex-start;margin-bottom:20px; }.section-heading h3 { margin-top:7px;font-size:18px; }.staff-form { display:grid;grid-template-columns:1fr 1fr;gap:12px; }.staff-form label { display:flex;flex-direction:column;gap:7px; }.staff-form label span { color:#8d7e79;font-size:10px;font-weight:700; }.staff-form input { width:100%;box-sizing:border-box;border:1px solid #e4d9d4;border-radius:11px;padding:13px 12px;color:#433735;font:inherit;font-size:12px; }.staff-form label:nth-child(3),.staff-form .primary-button { grid-column:1 / -1; }.primary-button { min-height:42px;border:0;border-radius:12px;padding:12px 16px;background:#332d2c;color:#fff;font-size:11px;font-weight:800; }.staff-list { margin-top:20px; }.staff-row,.booking-row { gap:12px;padding:13px 0;border-top:1px solid #f1ece9; }.staff-row > div:nth-child(2),.booking-row > div { flex:1; }.staff-row strong,.booking-row strong { display:block;color:#3b3331;font-size:13px; }.avatar { width:35px;height:35px;display:grid;place-items:center;border-radius:12px;background:#f4dfd8;color:#a85e50;font-weight:800; }.remove-button { padding:8px 10px;background:#fff5f1;color:#a85e50; }.status { padding:6px 9px;border-radius:12px;background:#f1ece9;color:#766a66;font-size:10px;font-weight:800; }.status.pending { background:#fff0d9;color:#a16c2c; }.status.approved { background:#e3f0e5;color:#5f9271; }.status.completed { background:#e4e6f4;color:#686e9a; }.service-panel { margin-top:18px; }.service-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px; }.service-grid article { overflow:hidden;border:1px solid #f0e5e0;border-radius:15px;background:#fffaf8; }.service-grid img { width:100%;height:100px;display:block;object-fit:cover; }.service-grid article div { padding:11px; }.service-grid strong { font-size:12px; }.message,.empty-state { color:#9c918e;font-size:12px; }.message { margin:18px 0;text-align:center; }@media (max-width:700px) { .admin-shell { width:min(100% - 24px,600px);padding-top:18px; }.admin-welcome { padding:25px; }.admin-welcome h2 { font-size:30px; }.welcome-mark { font-size:55px; }.metrics-grid,.charts-grid { grid-template-columns:1fr 1fr;gap:10px; }.admin-columns { grid-template-columns:1fr; }.staff-form { grid-template-columns:1fr; }.staff-form label:nth-child(3),.staff-form .primary-button { grid-column:auto; }.staff-row { align-items:flex-start; }.remove-button { margin-left:auto; }.service-grid { grid-template-columns:repeat(2,minmax(0,1fr));gap:10px; }.service-grid img { height:90px; } }
.primary-button:disabled { opacity: 0.65; cursor: wait; }
.staff-error { margin: 12px 0 0; padding: 11px 12px; border: 1px solid #f1d0ca; border-radius: 11px; background: #fff3f0; color: #a64e43; font-size: 12px; line-height: 1.5; }
.staff-form input {
  --background: #fff;
  --color: #433735;
  background-color: #fff;
  color: #433735;
  color-scheme: light;
  -webkit-appearance: none;
  appearance: none;
}
.staff-form input::placeholder { color: #a99c97; opacity: 1; }
.staff-form input:-webkit-autofill,
.staff-form input:-webkit-autofill:hover,
.staff-form input:-webkit-autofill:focus {
  -webkit-text-fill-color: #433735;
  -webkit-box-shadow: 0 0 0 1000px #fff inset;
}
.staff-form input:focus {
  border-color: #bf7a6b;
  outline: none;
  box-shadow: 0 0 0 3px rgba(191, 122, 107, 0.14);
}
.message {
  width: fit-content;
  margin: 18px auto;
  padding: 10px 14px;
  border: 1px solid #dcebdd;
  border-radius: 12px;
  background: #f1f8f1;
  color: #527a58;
}
</style>
