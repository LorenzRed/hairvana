<template>
  <ion-page>
    <ion-content :fullscreen="true" class="home-content">
      <div class="page-shell">
        <header class="topbar">
          <div class="brand-lockup">
            <img class="brand-mark" src="/hairvana-logo.png" alt="Hairvana" />
            <div>
              <span class="eyebrow">WELCOME BACK</span>
              <h1>Hi, {{ firstName }} <span aria-hidden="true">✦</span></h1>
            </div>
          </div>
          <button class="icon-button notification-button" aria-label="Notifications" @click="showNotice">
            <ion-icon :icon="notificationsOutline" />
            <span class="notification-dot" />
          </button>
        </header>

        <main>
          <section class="hero-card">
            <div class="hero-copy">
              <span class="eyebrow hero-eyebrow">YOUR NEXT LOOK AWAITS</span>
              <h2>Feel <em>beautiful,</em><br />inside &amp; out.</h2>
              <button class="primary-button" @click="activeTab = 'book'">
                Book an appointment
                <ion-icon :icon="arrowForwardOutline" />
              </button>
            </div>
            <div class="hero-art" aria-hidden="true">
              <div class="sun-disc" />
              <div class="hair-shape" />
              <div class="hero-sparkle">✦</div>
            </div>
          </section>

          <section class="section-block">
            <div class="section-heading">
              <div>
                <span class="eyebrow">AT A GLANCE</span>
                <h3>Your salon day</h3>
              </div>
              <button class="text-button" @click="activeTab = 'appointments'">View all</button>
            </div>
            <div class="stats-grid">
              <article class="stat-card">
                <div class="stat-icon peach"><ion-icon :icon="calendarOutline" /></div>
                <strong>02</strong>
                <span>Upcoming bookings</span>
              </article>
              <article class="stat-card">
                <div class="stat-icon lavender"><ion-icon :icon="sparklesOutline" /></div>
                <strong>120</strong>
                <span>Glow points</span>
              </article>
            </div>
          </section>

          <section v-if="activeTab === 'home'" class="section-block">
            <div class="section-heading">
              <div>
                <span class="eyebrow">EXPLORE</span>
                <h3>Popular services</h3>
              </div>
              <button class="text-button" @click="activeTab = 'services'">See all</button>
            </div>
            <div class="service-list">
              <button v-for="service in services.slice(0, 3)" :key="service.name" class="service-card" @click="selectService(service)">
                <div class="service-image" :class="service.color">
                  <ion-icon :icon="service.icon" />
                </div>
                <div class="service-details">
                  <h4>{{ service.name }}</h4>
                  <p>{{ service.duration }} · From ₱{{ service.price }}</p>
                  <span class="service-link">Book now <ion-icon :icon="arrowForwardOutline" /></span>
                </div>
              </button>
            </div>
          </section>

          <section v-if="activeTab === 'appointments'" class="section-block">
            <div class="section-heading">
              <div><span class="eyebrow">YOUR SCHEDULE</span><h3>Upcoming appointments</h3></div>
            </div>
            <article v-for="appointment in appointments" :key="`${appointment.month}-${appointment.day}`" class="appointment-card">
              <div class="date-badge"><strong>{{ appointment.day }}</strong><span>{{ appointment.month }}</span></div>
              <div class="appointment-info"><h4>{{ appointment.service }}</h4><p>{{ appointment.time }} · with {{ appointment.stylist }}</p></div>
              <span class="status-pill">{{ appointment.status }}</span>
            </article>
          </section>

          <section v-if="activeTab === 'services'" class="section-block">
            <div class="section-heading">
              <div><span class="eyebrow">THE HAIRVANA MENU</span><h3>All services</h3></div>
            </div>
            <div class="service-list">
              <button v-for="service in services" :key="service.name" class="service-card" @click="selectService(service)">
                <div class="service-image" :class="service.color"><ion-icon :icon="service.icon" /></div>
                <div class="service-details"><h4>{{ service.name }}</h4><p>{{ service.duration }} · From ₱{{ service.price }}</p><span class="service-link">Book now <ion-icon :icon="arrowForwardOutline" /></span></div>
              </button>
            </div>
          </section>

          <section v-if="activeTab === 'book'" class="booking-panel section-block">
            <div class="section-heading">
              <div><span class="eyebrow">MAKE IT YOURS</span><h3>Book an appointment</h3></div>
            </div>
            <label class="field-label" for="service-select">Choose a service</label>
            <select id="service-select" v-model="selectedService" class="select-field">
              <option v-for="service in services" :key="service.name">{{ service.name }}</option>
            </select>
            <label class="field-label" for="date-select">Preferred date</label>
            <select id="date-select" class="select-field"><option>Friday, Nov 14</option><option>Saturday, Nov 15</option><option>Monday, Nov 17</option></select>
            <label class="field-label" for="time-select">Preferred time</label>
            <select id="time-select" class="select-field"><option>10:00 AM</option><option>1:30 PM</option><option>4:00 PM</option></select>
            <button class="primary-button full-button" @click="confirmBooking">Confirm booking <ion-icon :icon="checkmarkOutline" /></button>
          </section>

          <section v-if="activeTab === 'profile'" class="profile-card section-block">
            <div class="profile-avatar">OS</div>
            <span class="eyebrow">MY PROFILE</span>
            <h3>{{ profile.name }}</h3>
            <p>{{ profile.email }}</p>
            <button class="secondary-button" @click="signOut">Sign out</button>
          </section>
        </main>
      </div>
    </ion-content>

    <nav class="bottom-nav" aria-label="Main navigation">
      <button v-for="tab in tabs" :key="tab.id" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">
        <ion-icon :icon="tab.icon" />
        <span>{{ tab.label }}</span>
      </button>
    </nav>
    <ion-toast :is-open="toastOpen" :message="toastMessage" :duration="2600" position="top" @didDismiss="toastOpen = false" />
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonContent, IonIcon, IonPage, IonToast } from '@ionic/vue';
import {
  arrowForwardOutline,
  calendarOutline,
  checkmarkOutline,
  heartOutline,
  homeOutline,
  notificationsOutline,
  personOutline,
  cutOutline,
  sparklesOutline,
} from 'ionicons/icons';
import { getCurrentUserProfile, logout, type UserProfile } from '../services/auth';

type Service = { name: string; duration: string; price: number; color: string; icon: string };

const activeTab = ref('home');
const router = useRouter();
const profile = reactive<UserProfile>({
  name: 'Salon owner',
  email: '',
  role: 'admin',
});
const firstName = ref('there');
const toastOpen = ref(false);
const toastMessage = ref('');
const selectedService = ref('Signature Haircut');

const services: Service[] = [
  { name: 'Signature Haircut', duration: '60 min', price: 65, color: 'rose', icon: cutOutline },
  { name: 'Color & Gloss', duration: '90 min', price: 120, color: 'gold', icon: sparklesOutline },
  { name: 'Blowout & Style', duration: '45 min', price: 45, color: 'lilac', icon: heartOutline },
  { name: 'Deep Conditioning', duration: '30 min', price: 35, color: 'peach', icon: sparklesOutline },
];

const appointments = [
  { day: '14', month: 'NOV', service: 'Signature Haircut', time: '10:00 AM', stylist: 'Mia', status: 'Confirmed' },
  { day: '28', month: 'NOV', service: 'Color & Gloss', time: '1:30 PM', stylist: 'Sofia', status: 'Confirmed' },
];

const tabs = [
  { id: 'home', label: 'Home', icon: homeOutline },
  { id: 'services', label: 'Services', icon: sparklesOutline },
  { id: 'book', label: 'Book', icon: calendarOutline },
  { id: 'appointments', label: 'Bookings', icon: heartOutline },
  { id: 'profile', label: 'Profile', icon: personOutline },
];

onMounted(async () => {
  try {
    const currentProfile = await getCurrentUserProfile();
    if (!currentProfile) return;
    profile.name = currentProfile.name;
    profile.email = currentProfile.email;
    profile.role = currentProfile.role;
    firstName.value = currentProfile.name.trim().split(/\s+/)[0] || 'there';
  } catch (error) {
    console.error('Unable to load Hairvana profile', error);
  }
});

function selectService(service: Service) {
  selectedService.value = service.name;
  activeTab.value = 'book';
}

function showNotice() {
  toastMessage.value = 'You are all caught up ✦';
  toastOpen.value = true;
}

function confirmBooking() {
  toastMessage.value = `${selectedService.value} booked successfully ✦`;
  toastOpen.value = true;
  activeTab.value = 'appointments';
}

async function signOut() {
  await logout();
  await router.replace('/auth');
}
</script>

<style scoped>
.home-content { --background: #f9f7f5; }
.home-content::part(scroll) {
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.home-content::part(scroll)::-webkit-scrollbar {
  display: none;
  width: 0;
}
.page-shell { width: 100%; max-width: none; box-sizing: border-box; margin: 0; padding: 28px 20px 110px; }
.topbar, .brand-lockup, .section-heading, .appointment-card { display: flex; align-items: center; }
.topbar { justify-content: space-between; margin-bottom: 28px; }
.brand-lockup { gap: 12px; }
.eyebrow { color: #9c8b87; font-size: 10px; font-weight: 700; letter-spacing: 1.8px; }
h1, h2, h3, h4, p { margin: 0; }
h1 { color: #2f2929; font: 600 21px Georgia, serif; margin-top: 3px; }
h1 span { color: #c98372; font-size: 15px; }
.icon-button { border: 0; background: #fff; color: #413837; width: 42px; height: 42px; border-radius: 50%; font-size: 20px; position: relative; }
.notification-dot { width: 7px; height: 7px; background: #c98372; border: 2px solid #fff; border-radius: 50%; position: absolute; top: 9px; right: 10px; }
.hero-card { min-height: 220px; overflow: hidden; border-radius: 28px; padding: 28px 24px; position: relative; background: #e8c3b5; color: #402f2b; }
.hero-copy { position: relative; z-index: 1; }
.hero-eyebrow { color: #806058; }
h2 { font: 400 34px/1.05 Georgia, serif; letter-spacing: -1px; margin: 10px 0 20px; }
h2 em { color: #9b5547; font-weight: 600; }
.primary-button, .secondary-button { border: 0; border-radius: 24px; padding: 13px 17px; font-size: 12px; font-weight: 700; display: inline-flex; gap: 10px; align-items: center; }
.primary-button { background: #342d2c; color: #fff; }
.primary-button ion-icon { font-size: 16px; }
.hero-art { position: absolute; inset: 0 0 0 55%; }
.sun-disc { width: 180px; height: 180px; border-radius: 50%; background: #f6d8c8; position: absolute; right: -25px; top: 26px; }
.hair-shape { position: absolute; width: 150px; height: 180px; right: 15px; top: 55px; border-radius: 60% 40% 50% 50%; background: #88605a; transform: rotate(20deg); box-shadow: -38px 18px 0 #75504e; }
.hero-sparkle { position: absolute; right: 34px; top: 32px; color: #fff; font-size: 26px; }
.section-block { margin-top: 30px; }
.section-heading { justify-content: space-between; margin-bottom: 15px; }
h3 { color: #332d2c; font: 600 21px Georgia, serif; margin-top: 5px; }
.text-button { color: #ae6759; background: transparent; border: 0; font-size: 12px; font-weight: 700; }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.stat-card { background: #fff; border: 1px solid #eee8e4; border-radius: 20px; padding: 15px; }
.stat-icon { width: 31px; height: 31px; display: grid; place-items: center; border-radius: 10px; margin-bottom: 12px; }
.stat-icon.peach { background: #f9e2d9; color: #bd7765; }
.stat-icon.lavender { background: #e8e1f1; color: #85719e; }
.stat-icon ion-icon { font-size: 17px; }
.stat-card strong { display: block; color: #332d2c; font: 600 25px Georgia, serif; }
.stat-card span { color: #9c918e; display: block; font-size: 11px; margin-top: 3px; }
.service-list { display: grid; gap: 11px; }
.service-card { display: flex; text-align: left; gap: 14px; width: 100%; padding: 9px; background: #fff; border: 1px solid #eee8e4; border-radius: 19px; }
.service-image { width: 80px; height: 80px; flex: 0 0 80px; display: grid; place-items: center; border-radius: 14px; font-size: 29px; }
.service-image.rose { background: #f2d6d2; color: #aa685f; }
.service-image.gold { background: #f2dfb6; color: #a37c32; }
.service-image.lilac { background: #ded8eb; color: #7d7198; }
.service-image.peach { background: #f5ded1; color: #b77862; }
.service-details { padding: 5px 0; }
h4 { color: #3b3331; font-size: 14px; font-weight: 700; }
.service-details p, .appointment-info p, .profile-card p { color: #a09692; font-size: 11px; margin-top: 6px; }
.service-link { color: #b46b5d; font-size: 11px; font-weight: 700; display: flex; gap: 5px; align-items: center; margin-top: 10px; }
.service-link ion-icon { font-size: 13px; }
.bottom-nav { position: fixed; z-index: 10; bottom: 0; left: 50%; width: min(100%, 720px); transform: translateX(-50%); display: grid; grid-template-columns: repeat(5, 1fr); padding: 11px 8px max(11px, env(safe-area-inset-bottom)); background: rgba(255,255,255,.96); border-top: 1px solid #eee8e4; }
.bottom-nav button { border: 0; background: none; color: #afa5a1; display: grid; gap: 4px; place-items: center; font-size: 10px; }
.bottom-nav button ion-icon { font-size: 21px; }
.bottom-nav button.active { color: #b76758; }
.appointment-card { background: #fff; border: 1px solid #eee8e4; border-radius: 18px; padding: 13px; gap: 12px; margin-bottom: 10px; }
.date-badge { text-align: center; min-width: 43px; padding: 7px 4px; background: #f7e5df; border-radius: 11px; color: #a85e50; }
.date-badge strong { display: block; font: 600 18px Georgia, serif; }.date-badge span { font-size: 9px; font-weight: 700; }
.appointment-info { flex: 1; }.status-pill { color: #5f9271; background: #e3f0e5; border-radius: 12px; padding: 5px 8px; font-size: 9px; font-weight: 700; }
.booking-panel, .profile-card { background: #fff; border-radius: 22px; padding: 20px; border: 1px solid #eee8e4; }
.field-label { color: #635653; display: block; font-size: 12px; font-weight: 700; margin: 16px 0 7px; }
.select-field { width: 100%; padding: 13px; border: 1px solid #e8dfdb; border-radius: 12px; color: #413735; background: #fdfcfb; font-size: 13px; }
.full-button { width: 100%; justify-content: center; margin-top: 22px; }
.profile-card { text-align: center; }.profile-avatar { width: 72px; height: 72px; display: grid; place-items: center; background: #e8c3b5; color: #88564b; border-radius: 50%; margin: 0 auto 15px; font: 600 22px Georgia, serif; }.profile-card h3 { margin-top: 8px; }.secondary-button { margin-top: 18px; background: #f7e5df; color: #a85e50; }
@media (min-width: 700px) {
  .page-shell { padding: 42px 5vw 110px; }
  .topbar { margin-bottom: 34px; }
  .hero-card { min-height: 290px; padding: 42px 48px; }
  .hero-art { inset: 0 4% 0 55%; }
  .sun-disc { width: 250px; height: 250px; right: 12px; top: 20px; }
  .hair-shape { width: 205px; height: 235px; right: 62px; top: 63px; }
  .hero-sparkle { right: 84px; top: 30px; }
  h2 { font-size: 48px; }
  .section-block { margin-top: 38px; }
  .service-list { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  .service-card { min-height: 104px; }
  .service-image { width: 96px; height: 96px; flex-basis: 96px; }
  .bottom-nav { width: min(calc(100% - 76px), 1100px); bottom: 18px; border: 1px solid #eee8e4; border-radius: 22px; box-shadow: 0 12px 30px rgba(89, 61, 52, .1); padding: 10px 24px; }
  .bottom-nav button { display: flex; justify-content: center; flex-direction: row; gap: 8px; padding: 8px 14px; border-radius: 12px; }
  .bottom-nav button.active { background: #f7e5df; }
}

@media (min-width: 1050px) {
  .page-shell { padding-left: 5vw; padding-right: 5vw; }
  main { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr); column-gap: 34px; align-items: start; }
  .hero-card { grid-column: 1 / -1; }
  .hero-card + .section-block { grid-column: 1; }
  .hero-card + .section-block:last-child { grid-column: 1 / -1; }
  .hero-card + .section-block + .section-block { grid-column: 2; grid-row: 2 / span 2; }
  .hero-card + .section-block + .section-block .service-list { grid-template-columns: 1fr; }
  .hero-card + .section-block + .section-block .service-image { width: 86px; height: 86px; flex-basis: 86px; }
  .stats-grid { gap: 16px; }
  .stat-card { padding: 20px; }
  .hero-card + .section-block + .section-block,
  .hero-card + .section-block { margin-top: 34px; }
}
</style>
