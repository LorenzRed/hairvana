<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Triftmark admin</ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/home">Store</ion-button>
          <ion-button @click="logout">Sign out</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main class="dashboard">
        <p class="eyebrow">ADMIN WORKSPACE</p>
        <h1>People &amp; orders<span>.</span></h1>
        <p class="lead">Invite your team, manage staff access, and keep an eye on every delivery.</p>

        <p v-if="error" class="notice error" role="alert">{{ error }}</p>
        <p v-if="notice" class="notice success" role="status">{{ notice }}</p>

        <section class="panel invite-panel">
          <div>
            <p class="eyebrow">GROW YOUR TEAM</p>
            <h2>Invite a staff member</h2>
            <p class="muted">They can create an account with this email to activate their staff access.</p>
          </div>
          <form class="invite-form" @submit.prevent="invite">
            <label>
              Full name
              <input v-model="inviteName" autocomplete="name" required />
            </label>
            <label>
              Email address
              <input v-model="inviteEmail" type="email" autocomplete="email" required />
            </label>
            <button type="submit" :disabled="busy">{{ busy ? 'Sending…' : 'Create staff invitation' }}</button>
          </form>
        </section>

        <section class="panel">
          <div class="section-title">
            <div>
              <p class="eyebrow">SELLER ONBOARDING</p>
              <h2>Seller applications</h2>
            </div>
            <span class="count">{{ applications.length }} awaiting review</span>
          </div>
          <div v-if="applications.length" class="application-list">
            <article v-for="application in applications" :key="application.uid" class="application">
              <div>
                <h3>{{ application.displayName }}</h3>
                <p>{{ application.email }}</p>
                <p class="application-description">{{ application.sellerDescription }}</p>
              </div>
              <div class="application-actions">
                <button type="button" class="text-button" @click="reviewApplication(application, true)">
                  Approve seller
                </button>
                <button type="button" class="text-button reject" @click="reviewApplication(application, false)">
                  Decline
                </button>
              </div>
            </article>
          </div>
          <p v-else class="empty">No seller applications are waiting for review.</p>
        </section>

        <section class="panel">
          <div class="section-title">
            <div>
              <p class="eyebrow">YOUR TEAM</p>
              <h2>Staff accounts</h2>
            </div>
            <span class="count">{{ staff.length }} team members</span>
          </div>
          <div v-if="staff.length" class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Access</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="member in staff" :key="member.uid">
                  <td>{{ member.displayName }}</td>
                  <td>{{ member.email }}</td>
                  <td>
                    <span class="status" :class="{ inactive: !member.active }">{{
                      member.active ? 'Active' : 'Paused'
                    }}</span>
                  </td>
                  <td>
                    <button class="text-button" type="button" @click="changeAccess(member)">
                      {{ member.active ? 'Pause access' : 'Restore access' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="empty">No staff accounts yet. Your invitations will appear here after they sign up.</p>
        </section>

        <section class="panel">
          <div class="section-title">
            <div>
              <p class="eyebrow">STORE ACTIVITY</p>
              <h2>Recent orders</h2>
            </div>
            <span class="count">{{ orders.length }} orders</span>
          </div>
          <div v-if="orders.length" class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="order in orders" :key="order.id">
                  <td>{{ order.item.name }}</td>
                  <td>
                    {{ order.buyerName }}<small>{{ order.phone }}</small>
                  </td>
                  <td>₱{{ order.total.toLocaleString('en-PH') }}</td>
                  <td>Cash on delivery</td>
                  <td>
                    <span class="status">{{ statusLabel(order.status) }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="empty">No orders yet. Customer orders will show up here.</p>
        </section>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { IonButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue';

import { signOutUser, session } from '../firebase';
import {
  inviteStaff,
  reviewSellerApplication,
  setStaffActive,
  watchOrders,
  watchSellerApplications,
  watchStaff,
} from '../services/marketplace';
import type { StoreOrder, UserProfile } from '../types/marketplace';

const staff = ref<UserProfile[]>([]);
const applications = ref<UserProfile[]>([]);
const orders = ref<StoreOrder[]>([]);
const inviteName = ref('');
const inviteEmail = ref('');
const busy = ref(false);
const error = ref('');
const notice = ref('');
const unsubscribers: (() => void)[] = [];

onMounted(() => {
  unsubscribers.push(
    watchStaff(
      (value) => (staff.value = value),
      (reason) => (error.value = reason.message),
    ),
    watchSellerApplications(
      (value) => (applications.value = value),
      (reason) => (error.value = reason.message),
    ),
    ...watchOrders(
      'admin',
      session.user!.uid,
      (value) => (orders.value = value),
      (reason) => (error.value = reason.message),
    ),
  );
});

onUnmounted(() => unsubscribers.forEach((unsubscribe) => unsubscribe()));

async function invite() {
  error.value = '';
  notice.value = '';
  busy.value = true;
  try {
    await inviteStaff(inviteEmail.value, inviteName.value);
    notice.value = `Invitation created for ${inviteEmail.value.trim()}. Ask them to sign up using that email.`;
    inviteName.value = '';
    inviteEmail.value = '';
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not create the invitation.';
  } finally {
    busy.value = false;
  }
}

async function reviewApplication(application: UserProfile, approve: boolean) {
  error.value = '';
  notice.value = '';
  try {
    await reviewSellerApplication(application.uid, approve);
    notice.value = `${application.displayName}'s seller application was ${approve ? 'approved' : 'declined'}.`;
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not review this seller application.';
  }
}

async function changeAccess(member: UserProfile) {
  error.value = '';
  notice.value = '';
  try {
    await setStaffActive(member.uid, !member.active);
    notice.value = `${member.displayName}'s access is now ${member.active ? 'paused' : 'active'}.`;
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not update staff access.';
  }
}

async function logout() {
  try {
    await signOutUser();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not sign out.';
  }
}

function statusLabel(status: StoreOrder['status']) {
  return {
    pending: 'Order received · waiting for staff',
    claimed: 'Out for delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  }[status];
}
</script>

<style scoped>
.dashboard {
  max-width: 1050px;
  margin: 0 auto;
  padding: 48px 28px 70px;
  color: #20352c;
}

.eyebrow {
  margin: 0 0 8px;
  color: #788078;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 1.5px;
}

h1,
h2 {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-weight: 400;
}

h1 {
  font-size: clamp(38px, 6vw, 56px);
  letter-spacing: -1.5px;
}

h1 span {
  color: #b0774f;
}

h2 {
  font-size: 25px;
}

.lead,
.muted {
  color: #788078;
  line-height: 1.6;
}

.lead {
  margin: 10px 0 28px;
}

.panel {
  margin-top: 20px;
  padding: 26px;
  border: 1px solid #e7e7df;
  border-radius: 6px;
  background: #fff;
}

.invite-panel {
  display: grid;
  grid-template-columns: 0.8fr 1.2fr;
  gap: 30px;
  align-items: start;
}

.muted {
  margin: 9px 0 0;
  font-size: 13px;
}

.invite-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 13px;
}

label {
  display: grid;
  gap: 6px;
  color: #566157;
  font-size: 12px;
}

input {
  min-width: 0;
  height: 42px;
  padding: 0 11px;
  border: 1px solid #dedfd7;
  border-radius: 3px;
  background: #fff;
  color: #20352c;
  font: inherit;
}

button[type='submit'] {
  min-height: 42px;
  grid-column: 1 / -1;
  border: 0;
  border-radius: 3px;
  background: #355f49;
  color: #fff;
  font: inherit;
  font-size: 13px;
}

button:disabled {
  opacity: 0.6;
}

.section-title {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 20px;
}

.count,
.empty {
  color: #788078;
  font-size: 12px;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13px;
}

th,
td {
  padding: 13px 10px;
  border-bottom: 1px solid #eeeee8;
  white-space: nowrap;
}

th {
  color: #788078;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.7px;
  text-transform: uppercase;
}

td small {
  display: block;
  margin-top: 4px;
  color: #788078;
}

.status {
  display: inline-block;
  padding: 5px 8px;
  border-radius: 20px;
  background: #edf2eb;
  color: #355f49;
  font-size: 11px;
}

.status.inactive {
  background: #f5ece8;
  color: #905b49;
}

.text-button {
  border: 0;
  background: transparent;
  color: #355f49;
  font: inherit;
  font-size: 12px;
}

.text-button.reject {
  color: #9c3d31;
}

.application-list {
  display: grid;
  gap: 12px;
}

.application {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 14px;
  border: 1px solid #eeeee8;
}

.application h3 {
  margin: 0 0 4px;
  font-size: 14px;
}

.application p {
  margin: 4px 0;
  color: #788078;
  font-size: 12px;
}

.application p.application-description {
  max-width: 620px;
  margin-top: 10px;
  color: #526055;
  line-height: 1.6;
  white-space: pre-wrap;
}

.application-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 12px;
}

.empty {
  margin: 20px 0 4px;
}

.notice {
  margin: 14px 0;
  padding: 11px 13px;
  border-radius: 4px;
  font-size: 13px;
}

.notice.error {
  background: #f7e9e6;
  color: #9c3d31;
}

.notice.success {
  background: #eaf1e9;
  color: #355f49;
}

@media (max-width: 720px) {
  .dashboard {
    padding: 34px 18px 50px;
  }

  .panel {
    padding: 19px 15px;
  }

  .invite-panel {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .invite-form {
    grid-template-columns: 1fr;
  }

  .application {
    flex-direction: column;
  }

  button[type='submit'] {
    grid-column: auto;
  }
}
</style>
