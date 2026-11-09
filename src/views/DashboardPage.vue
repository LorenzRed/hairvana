<template>
  <ion-page>
    <ion-content :fullscreen="true" class="dashboard-content">
      <div class="dashboard-shell">
        <header class="topbar">
          <div class="brand-lockup"><div class="brand-mark">H</div><div><span class="eyebrow">HAIRVANA {{ profile.role.toUpperCase() }}</span><h1>Hi, {{ firstName }} ✦</h1></div></div>
          <button class="logout-button" @click="signOut">Sign out</button>
        </header>

        <section v-if="profile.role === 'customer'" class="customer-hero">
          <img
            src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=85"
            alt="Woman with beautifully styled hair"
          />
          <div class="customer-hero-overlay">
            <span class="eyebrow">YOUR BEAUTY MOMENT</span>
            <h2>Every day is a<br /><em>good hair day.</em></h2>
            <button class="hero-button" @click="scrollToBooking">Book your next look <span>→</span></button>
          </div>
        </section>

        <section v-if="profile.role === 'admin'" class="admin-hero">
          <div class="admin-hero-copy">
            <span class="eyebrow">HAIRVANA STUDIO / 2026</span>
            <h2>Make every<br /><em>moment beautiful.</em></h2>
            <p>Your salon, your rhythm. Everything you need to create an exceptional guest experience.</p>
            <div class="hero-meta"><span><strong>{{ appointments.length }}</strong> bookings today</span><span><strong>{{ services.length }}</strong> treatments live</span></div>
          </div>
          <div class="admin-hero-art"><div class="art-circle"></div><img src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=650&q=85" alt="Salon stylist portrait" /></div>
        </section>

        <section class="welcome-card">
          <span class="eyebrow">{{ roleLabel }}</span>
          <h2>{{ roleTitle }}</h2>
          <p>{{ roleDescription }}</p>
        </section>

        <div class="stats-grid">
          <article class="stat-card"><div class="stat-symbol blush">✦</div><strong>{{ appointments.length }}</strong><span>{{ profile.role === 'customer' ? 'My bookings' : 'Bookings' }}</span><small>{{ appointments.length ? 'Keep the glow going' : 'Ready for your first one' }}</small></article>
          <article class="stat-card"><div class="stat-symbol gold">✧</div><strong>{{ services.length }}</strong><span>Active services</span><small>Available treatments</small></article>
          <article class="stat-card"><div class="stat-symbol lilac">◌</div><strong>{{ pendingCount }}</strong><span>Needs attention</span><small>{{ pendingCount ? 'Review pending requests' : 'All caught up' }}</small></article>
        </div>

        <section v-if="profile.role === 'admin'" class="panel admin-management-panel">
          <div class="panel-heading"><div><span class="eyebrow">ADMIN MANAGEMENT</span><h3>Shape your salon menu</h3><p class="panel-intro">Create beautiful treatments your guests will love to discover.</p></div><span class="panel-badge">LIVE MENU</span></div>
          <form class="service-form" @submit.prevent="saveService">
            <label class="field-group"><span>Service name</span><input v-model.trim="newService.name" placeholder="e.g. Signature haircut" required /></label>
            <label class="field-group"><span>Price (₱)</span><input v-model.number="newService.price" type="number" min="0" placeholder="650" required /></label>
            <label class="field-group"><span>Duration</span><input v-model.number="newService.duration" type="number" min="15" placeholder="60 min" required /></label>
            <label class="image-input"><span>Service photo</span><strong>{{ newService.imageData ? 'Selected ✓' : 'Choose image' }}</strong><input type="file" accept="image/*" @change="selectServiceImage" /></label>
            <button class="primary-button" type="submit">{{ editingServiceId ? 'Save changes' : 'Add service' }}</button>
            <button v-if="editingServiceId" class="cancel-button" type="button" @click="cancelEditing">Cancel</button>
          </form>
          <div class="admin-service-grid">
            <article class="admin-service-card" v-for="service in services" :key="service.id">
              <img :src="service.imageData || fallbackServiceImage" :alt="service.name" />
              <div class="admin-service-card-body"><strong>{{ service.name }}</strong><small>{{ service.duration }} min <i>·</i> ₱{{ service.price }}</small><div class="service-actions"><button type="button" aria-label="Edit service" @click="editService(service)">✎</button><button type="button" aria-label="Delete service" @click="removeService(service.id)">⌫</button></div></div>
            </article>
          </div>
        </section>

        <section v-if="profile.role === 'admin' || profile.role === 'staff'" class="panel">
          <div class="panel-heading"><div><span class="eyebrow">{{ profile.role === 'admin' ? 'ADMIN + STAFF WORKSPACE' : 'STAFF WORKSPACE' }}</span><h3>Today’s appointments</h3></div></div>
          <article v-for="appointment in visibleAppointments" :key="appointment.id" class="booking-row"><div><strong>{{ appointment.serviceName }}</strong><small>{{ appointment.date }} at {{ appointment.time }} · {{ appointment.customerName }}</small></div><button v-if="appointment.status === 'pending'" class="pill-button" @click="changeStatus(appointment.id, 'approved')">Accept</button><button v-else-if="appointment.status === 'approved'" class="pill-button" @click="changeStatus(appointment.id, 'completed')">Complete</button><span v-else class="pill" :class="appointment.status">{{ appointment.status }}</span><button v-if="appointment.status === 'pending'" class="cancel-booking-button" @click="changeStatus(appointment.id, 'cancelled')">Cancel</button></article>
        </section>

        <section v-if="profile.role === 'staff'" class="panel admin-management-panel">
          <div class="panel-heading"><div><span class="eyebrow">MY SERVICES</span><h3>Post your own services</h3><p class="panel-intro">Create treatments that you personally provide.</p></div></div>
          <form class="service-form" @submit.prevent="saveService">
            <label class="field-group"><span>Service name</span><input v-model.trim="newService.name" placeholder="e.g. Natural hair treatment" required /></label>
            <label class="field-group"><span>Price (₱)</span><input v-model.number="newService.price" type="number" min="0" placeholder="650" required /></label>
            <label class="field-group"><span>Duration</span><input v-model.number="newService.duration" type="number" min="15" placeholder="60 min" required /></label>
            <label class="image-input"><span>Service photo</span><strong>{{ newService.imageData ? 'Selected ✓' : 'Choose image' }}</strong><input type="file" accept="image/*" @change="selectServiceImage" /></label>
            <button class="primary-button" type="submit">{{ editingServiceId ? 'Save changes' : 'Add service' }}</button>
            <button v-if="editingServiceId" class="cancel-button" type="button" @click="cancelEditing">Cancel</button>
          </form>
          <div class="admin-service-grid">
            <article class="admin-service-card" v-for="service in ownServices" :key="service.id">
              <img :src="service.imageData || fallbackServiceImage" :alt="service.name" />
              <div class="admin-service-card-body"><strong>{{ service.name }}</strong><small>{{ service.duration }} min <i>·</i> ₱{{ service.price }}</small><div class="service-actions"><button type="button" aria-label="Edit service" @click="editService(service)">✎</button><button type="button" aria-label="Delete service" @click="removeService(service.id)">⌫</button></div></div>
            </article>
          </div>
          <p v-if="!ownServices.length" class="empty-state">You have not posted a service yet.</p>
        </section>

        <section v-if="profile.role === 'customer'" class="panel service-discovery">
          <div class="panel-heading"><div><span class="eyebrow">THE HAIRVANA MENU</span><h3>Our services</h3></div></div>
          <div class="visual-service-grid">
            <article v-for="(service, index) in services.slice(0, 3)" :key="service.id" class="visual-service-card">
              <img :src="service.imageData || serviceImages[index % serviceImages.length]" :alt="service.name" />
              <div><strong>{{ service.name }}</strong><small>{{ service.duration }} min · ₱{{ service.price }}</small></div>
            </article>
          </div>
        </section>

        <section v-if="profile.role === 'customer'" id="booking-panel" class="panel customer-booking-panel">
          <div class="panel-heading"><div><span class="eyebrow">CUSTOMER EXPERIENCE</span><h3>Book a service</h3></div></div>
          <p class="panel-intro">Choose your treatment and preferred time. We’ll confirm your appointment shortly.</p>
          <form class="booking-form" @submit.prevent="bookService">
            <select v-model="booking.serviceId" required><option disabled value="">Choose a service</option><option v-for="service in services" :key="service.id" :value="service.id">{{ service.name }} · ₱{{ service.price }}</option></select>
            <input v-model="booking.date" type="date" required />
            <input v-model="booking.time" type="time" required />
            <select v-model="booking.staffId" required>
              <option disabled value="">Choose a stylist</option>
              <option v-for="member in staff" :key="member.id" :value="member.id">{{ member.name }}</option>
            </select>
            <button class="primary-button booking-submit" type="submit">Request booking</button>
          </form>
        </section>

        <section class="panel">
          <div class="panel-heading"><div><span class="eyebrow">APPOINTMENTS</span><h3>{{ profile.role === 'customer' ? 'My schedule' : 'Booking queue' }}</h3></div></div>
          <article v-for="appointment in visibleAppointments" :key="appointment.id" class="booking-row">
            <div><strong>{{ appointment.serviceName }}</strong><small>{{ appointment.date }} · {{ appointment.time }} · {{ appointment.customerName }}</small></div>
            <span class="pill" :class="appointment.status">{{ appointment.status }}</span>
            <button v-if="(profile.role === 'admin' || profile.role === 'customer') && appointment.status === 'pending'" class="pill-button" @click="changeStatus(appointment.id, 'cancelled')">Cancel booking</button>
            <button v-if="profile.role === 'admin' && appointment.status === 'pending'" class="pill-button" @click="changeStatus(appointment.id, 'approved')">Approve</button>
            <button v-if="profile.role === 'customer' && appointment.status === 'completed' && appointment.paymentStatus === 'unpaid'" class="pill-button" @click="pay(appointment)">Mark paid</button>
          </article>
          <p v-if="!appointments.length" class="empty-state">No appointments yet.</p>
        </section>

        <p v-if="message" class="message">{{ message }}</p>
      </div>
    </ion-content>
    <ion-alert
      :is-open="Boolean(serviceToDelete)"
      header="Delete service?"
      message="This service will be removed from your salon menu."
      :buttons="deleteAlertButtons"
      @did-dismiss="serviceToDelete = null"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonAlert, IonContent, IonPage } from '@ionic/vue';
import { auth } from '../firebase';
import { getCurrentUserProfile, listStaffProfiles, logout, type UserProfile } from '../services/auth';
import {
  createAppointment,
  createService,
  deleteService,
  updateService,
  listAppointments,
  listServices,
  recordPayment,
  updateAppointmentStatus,
  type Appointment,
  type SalonService,
} from '../services/salon';

const router = useRouter();
const profile = reactive<UserProfile>({ name: 'Salon owner', email: '', role: 'customer' });
const services = ref<SalonService[]>([]);
const appointments = ref<Appointment[]>([]);
const staff = ref<(UserProfile & { id: string })[]>([]);
const message = ref('');
const newService = reactive({ name: '', price: 0, duration: 60, imageData: '' });
const editingServiceId = ref('');
const serviceToDelete = ref<string | null>(null);
const deleteAlertButtons = [
  {
    text: 'Cancel',
    role: 'cancel',
  },
  {
    text: 'Delete',
    role: 'destructive',
    handler: () => {
      if (serviceToDelete.value) {
        void confirmRemoveService(serviceToDelete.value);
      }
    },
  },
];
const booking = reactive({ serviceId: '', date: '', time: '', staffId: '' });
const serviceImages = [
  'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=500&q=80',
];
const fallbackServiceImage = serviceImages[0];
const firstName = computed(() => profile.name.split(/\s+/)[0] || 'there');
const pendingCount = computed(() => appointments.value.filter((item) => item.status === 'pending').length);
const visibleAppointments = computed(() =>
  profile.role === 'admin'
    ? appointments.value
    : appointments.value.filter((item) => item.status !== 'cancelled'),
);
const ownServices = computed(() =>
  services.value.filter((service) => service.createdBy === auth.currentUser?.uid),
);
const roleLabel = computed(() => profile.role === 'admin' ? 'SALON COMMAND CENTER' : profile.role === 'staff' ? 'YOUR DAILY WORKSPACE' : 'YOUR BEAUTY JOURNEY');
const roleTitle = computed(() => profile.role === 'admin' ? 'Run your salon beautifully.' : profile.role === 'staff' ? 'Your craft, organized.' : 'Your next look awaits.');
const roleDescription = computed(() => profile.role === 'admin' ? 'Manage services, bookings, staff operations, payments, and customer feedback from one place.' : profile.role === 'staff' ? 'See your assigned appointments and keep every service moving smoothly.' : 'Discover services, request appointments, and keep your salon visits in one place.');

async function loadData() {
  const currentProfile = await getCurrentUserProfile();
  if (!currentProfile) return;
  Object.assign(profile, currentProfile);
  services.value = await listServices();
  appointments.value = await listAppointments(profile.role);
  if (profile.role === 'customer') {
    staff.value = await listStaffProfiles();
    if (staff.value.length === 1) booking.staffId = staff.value[0].id;
  }
}

async function saveService() {
  if (editingServiceId.value) {
    await updateService(editingServiceId.value, newService.name, newService.price, newService.duration, newService.imageData);
    message.value = 'Service updated successfully.';
  } else {
    await createService(newService.name, newService.price, newService.duration, newService.imageData);
    message.value = 'Service added successfully.';
  }
  cancelEditing();
  await loadData();
}

function editService(service: SalonService) {
  editingServiceId.value = service.id;
  newService.name = service.name;
  newService.price = service.price;
  newService.duration = service.duration;
  newService.imageData = service.imageData || '';
  document.querySelector('.service-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function cancelEditing() {
  editingServiceId.value = '';
  newService.name = '';
  newService.price = 0;
  newService.duration = 60;
  newService.imageData = '';
}

async function removeService(id: string) {
  serviceToDelete.value = id;
}

async function confirmRemoveService(id: string) {
  await deleteService(id);
  serviceToDelete.value = null;
  await loadData();
  message.value = 'Service deleted.';
}

function selectServiceImage(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  compressImage(file)
    .then((imageData) => {
      newService.imageData = imageData;
    })
    .catch((error) => {
      console.error('Unable to prepare service image', error);
      message.value = 'That image could not be prepared. Choose another image.';
    });
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('image-read-failed'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('image-decode-failed'));
      image.onload = () => {
        const scale = Math.min(1, 900 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('canvas-unavailable'));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.72);
        if (imageData.length > 800000) {
          reject(new Error('image-too-large'));
          return;
        }
        resolve(imageData);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function bookService() {
  const service = services.value.find((item) => item.id === booking.serviceId);
  if (!service) return;
  try {
    await createAppointment({
      customerId: '',
      customerName: profile.name,
      serviceId: service.id,
      serviceName: service.name,
      staffId: booking.staffId,
      staffName: staff.value.find((member) => member.id === booking.staffId)?.name || '',
      date: booking.date,
      time: booking.time,
    });
    await loadData();
    message.value = 'Booking requested. The salon will confirm it shortly.';
  } catch (error) {
    if (error instanceof Error && error.message === 'appointment-slot-unavailable') {
      message.value = 'That service or stylist is already booked at this time. Please choose another slot.';
      return;
    }
    console.error('Unable to create appointment', error);
    message.value = 'The booking could not be created. Please try again.';
  }
}

function scrollToBooking() {
  document.getElementById('booking-panel')?.scrollIntoView({ behavior: 'smooth' });
}

async function changeStatus(id: string, status: Appointment['status']) {
  try {
    await updateAppointmentStatus(id, status);
    await loadData();
  } catch (error) {
    if (error instanceof Error && error.message === 'invalid-appointment-transition') {
      message.value = 'That appointment has already been accepted or completed and cannot be changed.';
      return;
    }
    console.error('Unable to update appointment status', error);
    message.value = 'The appointment status could not be updated.';
  }
}

async function pay(appointment: Appointment) {
  await recordPayment(appointment.id, services.value.find((item) => item.id === appointment.serviceId)?.price || 0);
  await loadData();
  message.value = 'Payment recorded.';
}

async function signOut() {
  await logout();
  await router.replace('/auth');
}

onMounted(() => loadData().catch((error) => {
  console.error('Unable to load salon dashboard', error);
  message.value = 'Unable to load salon data. Check your Firestore rules.';
}));
</script>

<style scoped>
.dashboard-content { --background:#f9f7f5; }.dashboard-content::part(scroll) { overflow-x:hidden; scrollbar-width:none; -ms-overflow-style:none; }.dashboard-content::part(scroll)::-webkit-scrollbar { display:none; width:0; }.dashboard-shell { width:min(100% - 32px,1240px); margin:auto; padding:28px 0 70px; }.topbar,.brand-lockup,.panel-heading,.booking-row,.service-row { display:flex;align-items:center; }.topbar,.panel-heading { justify-content:space-between; }.brand-lockup { gap:12px; }.brand-mark { width:42px;height:42px;display:grid;place-items:center;border-radius:14px;background:#332d2c;color:#fff;font:700 22px Georgia,serif; }.eyebrow { color:#a16a5d;font-size:10px;font-weight:800;letter-spacing:1.6px; }h1,h2,h3,p { margin:0; }h1 { font:600 21px Georgia,serif;color:#332d2c;margin-top:3px; }.logout-button { border:0;background:#fff;color:#a85e50;border-radius:20px;padding:10px 14px;font-size:11px;font-weight:700; }.customer-hero { position:relative;height:310px;overflow:hidden;border-radius:28px;margin-top:28px;background:#b98577; }.customer-hero img { width:100%;height:100%;object-fit:cover;object-position:center 42%;filter:saturate(.75); }.customer-hero-overlay { position:absolute;inset:0;padding:38px;display:flex;flex-direction:column;justify-content:center;background:linear-gradient(90deg,rgba(49,33,30,.76),rgba(49,33,30,.15) 70%);color:#fff; }.customer-hero-overlay .eyebrow { color:#f8ddd2; }.customer-hero h2 { font:400 40px/1.05 Georgia,serif;margin:11px 0 20px; }.customer-hero h2 em { color:#f1c4b5; }.hero-button { width:max-content;border:0;border-radius:20px;padding:12px 16px;background:#fff;color:#473532;font-size:11px;font-weight:800; }.hero-button span { margin-left:9px;font-size:16px; }.welcome-card { margin-top:28px;padding:32px;border-radius:24px;background:#e8c3b5;color:#402f2b; }.welcome-card h2 { font:400 36px/1.12 Georgia,serif;margin:12px 0 12px; }.welcome-card p { max-width:620px;color:#74534b;font-size:13px;line-height:1.65; }.stats-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:20px; }.stat-card,.panel { background:#fff;border:1px solid #eee8e4;border-radius:20px;padding:20px; }.stat-card strong { display:block;color:#332d2c;font:600 28px Georgia,serif; }.stat-card span,.booking-row small,.service-row small { display:block;color:#a09692;font-size:11px;margin-top:7px;line-height:1.4; }.panel { margin-top:20px; }.panel-heading { align-items:flex-start;margin-bottom:22px; }.panel-heading h3 { line-height:1.25;margin-top:7px; }.panel-intro { color:#978a86;font-size:12px;line-height:1.55;margin:7px 0 0; }.inline-form,.staff-form,.booking-form { display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:10px;margin-bottom:16px; }.service-form { display:grid;grid-template-columns:minmax(220px,2fr) minmax(100px,1fr) minmax(100px,1fr) minmax(130px,auto) auto;gap:14px;align-items:end;margin-bottom:20px; }.booking-form { grid-template-columns:repeat(2,1fr); }.staff-form { grid-template-columns:1.3fr 1.5fr 1fr auto;align-items:end;gap:14px;margin-bottom:24px; }.field-group { display:flex;flex-direction:column;gap:7px;min-width:0; }.field-group span,.image-input span { color:#8d7e79;font-size:10px;font-weight:700;letter-spacing:.3px; }.service-form input,.staff-form input,.booking-form input,.booking-form select { box-sizing:border-box;width:100%;min-width:0;border:1px solid #e4d9d4;border-radius:11px;padding:13px 12px;background:#fdfcfb;color:#433735;outline:0;font:inherit;font-size:12px; }.service-form input:focus,.staff-form input:focus { border-color:#c88778;box-shadow:0 0 0 3px #f7e7e2; }.primary-button { min-height:42px;border:0;border-radius:12px;padding:12px 16px;background:#332d2c;color:#fff;font-size:11px;font-weight:800;white-space:nowrap; }.booking-submit { grid-column:1 / -1; width:100%; }.service-discovery { background:linear-gradient(135deg,#fff,#fbf3ef); }.visual-service-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:12px; }.visual-service-card { overflow:hidden;border-radius:15px;background:#fff;border:1px solid #eee8e4; }.visual-service-card img { width:100%;height:115px;display:block;object-fit:cover; }.visual-service-card div { padding:11px; }.visual-service-card strong,.visual-service-card small { display:block; }.visual-service-card strong { color:#3b3331;font-size:12px; }.visual-service-card small { color:#a09692;font-size:10px;margin-top:5px; }.service-row,.booking-row { gap:12px;padding:13px 0;border-top:1px solid #f1ece9; }.admin-service-thumb { width:48px;height:48px;object-fit:cover;border-radius:12px; }.service-row div,.booking-row div { flex:1; }.service-row strong,.booking-row strong { color:#3b3331;font-size:13px; }.pill { border-radius:12px;padding:6px 9px;background:#f1ece9;color:#766a66;font-size:10px;font-weight:800; }.pill.active,.pill.approved { background:#e3f0e5;color:#5f9271; }.pill.pending { background:#fff0d9;color:#a16c2c; }.pill.completed { background:#e4e6f4;color:#686e9a; }.pill-button { border:0;border-radius:12px;padding:7px 10px;background:#f7e5df;color:#a85e50;font-size:10px;font-weight:800; }.cancel-booking-button { border:1px solid #eadbd5;border-radius:12px;padding:7px 10px;background:#fff;color:#a85e50;font-size:10px;font-weight:800; }.image-input { display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;min-height:42px;border:1px dashed #d9b6aa;border-radius:11px;color:#a85e50;background:#fff8f5;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap; }.image-input strong { font-size:11px; }.image-input input { display:none; }.empty-state,.message { color:#9c918e;font-size:12px; }.message { margin:18px 0;text-align:center; }.panel-heading + .booking-row { border-top:0; }@media (max-width:700px) { .customer-hero { height:270px;margin-top:22px; }.customer-hero-overlay { padding:24px; }.customer-hero h2 { font-size:33px; }.stats-grid { grid-template-columns:1fr 1fr 1fr;gap:8px; }.stat-card { padding:13px 10px; }.stat-card strong { font-size:22px; }.welcome-card { padding:24px; }.welcome-card h2 { font-size:30px; }.service-form,.staff-form { grid-template-columns:1fr 1fr;gap:12px; }.service-form .field-group:first-child,.service-form .primary-button,.service-form .image-input,.service-form .cancel-button,.staff-form .field-group:first-child,.staff-form .primary-button { grid-column:1 / -1; }.service-form .image-input { min-height:54px; flex-direction:row; justify-content:space-between; padding:0 16px; box-sizing:border-box; }.service-form .cancel-button { width:100%; }.booking-row { align-items:flex-start;flex-wrap:wrap; }.booking-row .pill { margin-left:auto; }.admin-service-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }.admin-service-card { display:block; }.admin-service-card > img { width:100%; height:86px; object-fit:cover; object-position:center; }.admin-service-card-body { min-width:0; padding:11px; }.admin-service-card-body .pill { position:static; display:inline-block; margin-bottom:8px; }.admin-service-card-body strong { padding-right:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }.service-actions { gap:5px; }.service-actions button { width:27px; height:27px; }.visual-service-grid { grid-template-columns:1fr; }.visual-service-card { display:grid;grid-template-columns:90px 1fr; }.visual-service-card img { height:90px; } }@media (min-width:1000px) { .dashboard-shell { padding-top:42px; }.customer-hero { height:390px; }.customer-hero-overlay { padding:58px; }.customer-hero h2 { font-size:58px; }.welcome-card { padding:44px; }.welcome-card h2 { font-size:48px; } }
</style>
<style scoped>
.admin-hero { position:relative; min-height:310px; overflow:hidden; display:flex; align-items:center; margin-top:28px; padding:42px 48px; border-radius:30px; background:linear-gradient(115deg,#342c2b 0%,#58413c 58%,#8d6256 100%); color:#fff; box-shadow:0 20px 50px rgba(67,45,38,.16); }
.admin-management-panel { background:transparent; border:0; padding:0; }
.admin-management-panel .panel-heading { padding:24px; border-radius:20px; background:#fff; border:1px solid #eee8e4; }
.admin-management-panel .staff-form,
.admin-management-panel .service-form { padding:22px; border-radius:20px; background:#fff; border:1px solid #eee8e4; }
.admin-management-panel .admin-service-grid { padding:0; }
.admin-hero-copy { position:relative; z-index:1; max-width:540px; }.admin-hero .eyebrow { color:#e7b9aa; }.admin-hero h2 { margin:13px 0 12px; font:400 48px/1.03 Georgia,serif; letter-spacing:-1px; }.admin-hero h2 em { color:#e9b9a9; }.admin-hero p { max-width:430px; color:#d5c1bb; font-size:13px; line-height:1.55; }.hero-meta { display:flex; gap:28px; margin-top:28px; color:#cdb6ae; font-size:11px; }.hero-meta strong { color:#fff; font:600 19px Georgia,serif; margin-right:4px; }.admin-hero-art { position:absolute; right:40px; bottom:0; width:340px; height:100%; }.admin-hero-art .art-circle { position:absolute; width:260px; height:260px; top:35px; right:0; border-radius:50%; background:rgba(238,197,183,.2); }.admin-hero-art img { position:absolute; right:18px; bottom:0; width:230px; height:285px; object-fit:cover; object-position:center top; border-radius:130px 130px 0 0; mix-blend-mode:screen; opacity:.82; }.panel-badge { border:1px solid #e8c1b5; border-radius:20px; padding:7px 10px; color:#b2695a; font-size:9px; font-weight:800; letter-spacing:1px; }.stat-card { position:relative; overflow:hidden; min-height:112px; }.stat-card small { display:block; color:#b4a7a3; font-size:10px; margin-top:7px; }.stat-symbol { position:absolute; top:15px; right:17px; width:29px; height:29px; display:grid; place-items:center; border-radius:10px; font-size:17px; }.stat-symbol.blush { background:#f7e1da; color:#bd7969; }.stat-symbol.gold { background:#f5e8c7; color:#aa853d; }.stat-symbol.lilac { background:#e9e3f2; color:#8979a0; }.admin-service-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:14px; margin-top:10px; }.admin-service-card { overflow:hidden; border:1px solid #f0e5e0; border-radius:17px; background:#fff; transition:transform .2s,box-shadow .2s; }.admin-service-card:hover { transform:translateY(-3px); box-shadow:0 10px 24px rgba(89,61,52,.1); }.admin-service-card > img { display:block; width:100%; height:150px; object-fit:cover; object-position:center; }.admin-service-card-body { position:relative; padding:15px; }.admin-service-card-body strong { display:block; margin-bottom:6px; color:#3b3331; font-size:14px; }.admin-service-card-body small { color:#a09692; font-size:10px; }.admin-service-card-body i { font-style:normal; margin:0 3px; color:#d0b1a8; }.service-actions { display:flex; gap:6px; margin-top:13px; }.service-actions button { width:29px; height:29px; border:1px solid #eadbd5; border-radius:9px; background:#fffaf8; color:#9c6256; font-size:15px; line-height:1; cursor:pointer; }.service-actions button:last-child { color:#b25e52; }.cancel-button { min-height:42px; border:1px solid #eadbd5; border-radius:12px; padding:12px 16px; background:#fffaf8; color:#8d6259; font-size:11px; font-weight:800; white-space:nowrap; }
@media (max-width:700px) { .admin-hero { min-height:300px; margin-top:22px; padding:28px 24px; align-items:flex-start; }.admin-hero h2 { font-size:36px; }.admin-hero p { max-width:220px; font-size:11px; }.admin-hero-art { right:-50px; width:235px; opacity:.72; }.admin-hero-art img { width:175px; height:235px; right:0; }.admin-hero-art .art-circle { width:190px; height:190px; top:42px; }.hero-meta { gap:14px; margin-top:22px; flex-direction:column; }.admin-service-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }.admin-service-card { display:flex; flex-direction:column; min-width:0; }.admin-service-card > img { width:100%; height:125px; object-fit:cover; object-position:center; }.admin-service-card-body { min-width:0; padding:13px; }.admin-service-card-body strong { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }.service-actions { gap:5px; }.service-actions button { width:27px; height:27px; }.panel-badge { display:none; } }
</style>
