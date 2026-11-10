<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Delivered history</ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/staff">Staff desk</ion-button>
          <ion-button router-link="/staff/orders">Customer orders</ion-button>
          <ion-button router-link="/home">Store</ion-button>
          <ion-button @click="logout">Sign out</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main class="history-page">
        <router-link class="back-link" to="/staff">← Back to Staff desk</router-link>

        <section class="history-heading">
          <div>
            <p class="eyebrow">STAFF WORKSPACE · ORDER RECORDS</p>
            <h1>Delivered with care<span>.</span></h1>
            <p class="lead">A record of the orders successfully delivered by you.</p>
          </div>
          <div class="history-count" aria-label="Completed deliveries">
            <strong>{{ deliveredOrders.length }}</strong>
            <span>{{ deliveredOrders.length === 1 ? 'delivery' : 'deliveries' }}</span>
          </div>
        </section>

        <p v-if="error" class="notice error" role="alert">{{ error }}</p>
        <section class="history-list" aria-label="Successfully delivered orders">
          <article v-for="order in deliveredOrders" :key="order.id" class="history-card">
            <img :src="order.item.image" :alt="order.item.name" />
            <div class="order-info">
              <span class="status delivered">Successfully delivered</span>
              <h2>
                {{ order.item.name }} <small>· Size {{ order.item.size }}</small>
              </h2>
              <p class="buyer">{{ order.buyerName }} · {{ order.phone }}</p>
              <p>{{ order.address }}</p>
              <div class="order-footer">
                <strong>₱{{ order.total.toLocaleString('en-PH') }} · Cash on delivery</strong>
                <time
                  v-if="deliveredDate(order.deliveredAt)"
                  :datetime="deliveredDate(order.deliveredAt)?.toISOString()"
                >
                  {{ formatDeliveredDate(order.deliveredAt) }}
                </time>
              </div>
            </div>
            <span class="complete-mark" aria-hidden="true">✓</span>
          </article>
          <div v-if="!error && !deliveredOrders.length" class="empty-state">
            <span class="empty-mark" aria-hidden="true">✓</span>
            <h2>No completed deliveries yet</h2>
            <p>Orders you mark as delivered will be kept here for your records.</p>
            <router-link to="/staff">Go to Staff desk</router-link>
          </div>
        </section>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { IonButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue';

import { session, signOutUser } from '../firebase';
import { watchOrders } from '../services/marketplace';
import type { StoreOrder } from '../types/marketplace';

const orders = ref<StoreOrder[]>([]);
const error = ref('');
let unsubscribe: (() => void)[] = [];

const deliveredOrders = computed(() =>
  orders.value
    .filter((order) => order.status === 'delivered')
    .sort((first, second) => {
      const firstDate = deliveredDate(first.deliveredAt)?.getTime() ?? 0;
      const secondDate = deliveredDate(second.deliveredAt)?.getTime() ?? 0;
      return secondDate - firstDate;
    }),
);

onMounted(() => {
  const uid = session.user?.uid;
  if (!uid || session.profile?.role !== 'staff') {
    error.value = 'Sign in with an active staff account to view delivered history.';
    return;
  }

  unsubscribe = watchOrders(
    'staff',
    uid,
    (value) => {
      orders.value = value;
      error.value = '';
    },
    (reason) => {
      console.error('Could not load delivered order history.', reason);
      error.value = reason.message;
    },
  );
});

onUnmounted(() => unsubscribe.forEach((stop) => stop()));

async function logout() {
  error.value = '';
  try {
    await signOutUser();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not sign out.';
  }
}

function deliveredDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
    const date: unknown = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }
  return null;
}

function formatDeliveredDate(value: unknown): string {
  const date = deliveredDate(value);
  if (!date) return 'Delivery complete';
  return `Delivered ${new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)}`;
}
</script>

<style scoped>
.history-page {
  --ink: #20352c;
  --muted: #788078;
  --green: #355f49;
  --line: #e7e7df;
  max-width: 1050px;
  margin: 0 auto;
  padding: 38px 28px 70px;
  color: var(--ink);
}

.back-link {
  display: inline-block;
  margin-bottom: 28px;
  color: var(--green);
  font-size: 13px;
  font-weight: 650;
  text-decoration: none;
}

.history-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
}

.eyebrow {
  margin: 0 0 9px;
  color: var(--muted);
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
  font-size: clamp(35px, 6vw, 52px);
  letter-spacing: -1.5px;
}

h1 span {
  color: #b0774f;
}

.lead {
  margin: 10px 0 0;
  color: var(--muted);
  line-height: 1.6;
}

.history-count {
  display: grid;
  min-width: 100px;
  padding: 13px 18px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff;
  text-align: center;
}

.history-count strong {
  color: var(--green);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 28px;
  font-weight: 400;
}

.history-count span {
  color: var(--muted);
  font-size: 11px;
}

.history-list {
  display: grid;
  gap: 12px;
}

.history-card {
  display: flex;
  align-items: center;
  gap: 17px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fff;
  box-shadow: 0 3px 12px rgba(32, 53, 44, 0.035);
}

.history-card > img {
  width: 84px;
  height: 96px;
  flex: 0 0 auto;
  border-radius: 4px;
  background: #f0efe8;
  object-fit: cover;
}

.order-info {
  min-width: 0;
  flex: 1;
}

.status {
  display: inline-flex;
  padding: 5px 9px;
  border-radius: 16px;
  background: #e8eee8;
  color: var(--green);
  font-size: 10px;
  font-weight: 700;
}

.order-info h2 {
  margin: 8px 0 5px;
  font-family: inherit;
  font-size: 15px;
  font-weight: 650;
}

.order-info h2 small {
  color: var(--muted);
  font-weight: 400;
}

.order-info p {
  margin: 4px 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}

.order-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  margin-top: 9px;
}

.order-footer strong {
  color: var(--green);
  font-size: 12px;
}

.order-footer time {
  color: var(--muted);
  font-size: 11px;
}

.complete-mark,
.empty-mark {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: #e8eee8;
  color: var(--green);
  font-size: 17px;
  font-weight: 700;
}

.empty-state {
  padding: 54px 24px;
  border: 1px dashed #d9ddd4;
  border-radius: 7px;
  background: #fbfbf8;
  text-align: center;
}

.empty-mark {
  width: 44px;
  height: 44px;
  margin: 0 auto 15px;
}

.empty-state h2 {
  font-size: 23px;
}

.empty-state p {
  margin: 9px 0 18px;
  color: var(--muted);
  font-size: 13px;
}

.empty-state a {
  color: var(--green);
  font-size: 13px;
  font-weight: 700;
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

@media (max-width: 600px) {
  .history-page {
    padding: 28px 18px 48px;
  }

  .history-heading {
    align-items: flex-start;
  }

  .history-count {
    min-width: 78px;
    padding: 10px;
  }

  .history-card {
    align-items: flex-start;
    gap: 11px;
    padding: 12px;
  }

  .history-card > img {
    width: 66px;
    height: 78px;
  }

  .complete-mark {
    display: none;
  }

  .order-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
