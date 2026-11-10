<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Customer orders</ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/staff">Staff desk</ion-button>
          <ion-button router-link="/staff/history">Delivered history</ion-button>
          <ion-button router-link="/home">Store</ion-button>
          <ion-button @click="logout">Sign out</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main class="orders-page">
        <div class="page-nav">
          <router-link class="nav-link active" to="/staff/orders">
            <ion-icon :icon="receiptOutline" aria-hidden="true" />
            Customer orders
          </router-link>
          <router-link class="nav-link" to="/staff/history">
            <ion-icon :icon="checkmarkDoneOutline" aria-hidden="true" />
            Delivered history
          </router-link>
        </div>

        <section class="page-heading">
          <div>
            <p class="eyebrow">STAFF WORKSPACE · DELIVERY DESK</p>
            <h1>Customer orders<span>.</span></h1>
            <p class="lead">Review new orders, take responsibility for delivery, and keep each customer updated.</p>
          </div>
          <div class="order-count">
            <strong>{{ activeOrders.length }}</strong>
            <span>{{ activeOrders.length === 1 ? 'active order' : 'active orders' }}</span>
          </div>
        </section>

        <p v-if="notice" class="notice success" role="status">{{ notice }}</p>
        <p v-if="error" class="notice error" role="alert">{{ error }}</p>

        <section class="orders-list" aria-label="Active customer orders">
          <article v-for="order in activeOrders" :key="order.id" class="order-card">
            <img class="product-image" :src="order.item.image" :alt="order.item.name" />
            <div class="order-info">
              <span class="status" :class="order.status">
                <ion-icon :icon="order.status === 'claimed' ? bicycleOutline : timeOutline" aria-hidden="true" />
                {{ statusLabel(order.status) }}
              </span>
              <h2>
                {{ order.item.name }} <small>· Size {{ order.item.size }}</small>
              </h2>
              <p class="customer">{{ order.buyerName }} <span>·</span> {{ order.phone }}</p>
              <p class="address">{{ order.address }}</p>
              <div class="order-meta">
                <strong>₱{{ order.total.toLocaleString('en-PH') }}</strong>
                <span>Cash on delivery</span>
              </div>
            </div>
            <button
              v-if="order.status === 'pending'"
              class="order-action"
              type="button"
              :disabled="busyOrderId === order.id"
              @click="requestOrderAction(order.id, 'claim')"
            >
              <ion-icon :icon="handRightOutline" aria-hidden="true" />
              {{ busyOrderId === order.id ? 'Please wait…' : 'Claim delivery' }}
            </button>
            <button
              v-else-if="order.status === 'claimed' && order.staffId === session.user?.uid"
              class="order-action"
              type="button"
              :disabled="busyOrderId === order.id"
              @click="requestOrderAction(order.id, 'deliver')"
            >
              <ion-icon :icon="checkmarkCircleOutline" aria-hidden="true" />
              {{ busyOrderId === order.id ? 'Please wait…' : 'Mark delivered' }}
            </button>
            <span v-else class="assigned-note">Assigned to another staff member</span>
          </article>

          <div v-if="!error && !activeOrders.length" class="empty-state">
            <span class="empty-icon"><ion-icon :icon="receiptOutline" aria-hidden="true" /></span>
            <h2>All caught up</h2>
            <p>New customer orders will appear here as soon as they are placed.</p>
            <router-link to="/staff/history">View delivered history</router-link>
          </div>
        </section>

        <div v-if="confirmation" class="confirmation-backdrop" @click.self="closeConfirmation">
          <section class="confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-heading">
            <button
              class="modal-close"
              type="button"
              aria-label="Close confirmation"
              :disabled="Boolean(busyOrderId)"
              @click="closeConfirmation"
            >
              ×
            </button>
            <span class="confirmation-icon" aria-hidden="true">
              <ion-icon :icon="confirmation.action === 'claim' ? handRightOutline : checkmarkCircleOutline" />
            </span>
            <p class="eyebrow">{{ confirmation.action === 'claim' ? 'ASSIGN DELIVERY' : 'COMPLETE DELIVERY' }}</p>
            <h2 id="confirm-heading">
              {{ confirmation.action === 'claim' ? 'Claim this delivery?' : 'Mark this order delivered?' }}
            </h2>
            <p class="confirmation-description">
              {{
                confirmation.action === 'claim'
                  ? 'This order will be assigned to you, and other staff will see that it is being handled.'
                  : 'Confirm that the customer received this item. This will move it to Delivered history.'
              }}
            </p>
            <div v-if="confirmationOrder" class="confirmation-order">
              <img :src="confirmationOrder.item.image" :alt="confirmationOrder.item.name" />
              <div>
                <strong>{{ confirmationOrder.item.name }}</strong>
                <span>{{ confirmationOrder.buyerName }} · ₱{{ confirmationOrder.total.toLocaleString('en-PH') }}</span>
              </div>
            </div>
            <div class="confirmation-actions">
              <button
                class="cancel-confirmation"
                type="button"
                :disabled="Boolean(busyOrderId)"
                @click="closeConfirmation"
              >
                Cancel
              </button>
              <button
                class="confirm-action"
                type="button"
                :disabled="Boolean(busyOrderId) || !confirmationOrder"
                @click="confirmOrderAction"
              >
                {{
                  busyOrderId
                    ? 'Please wait…'
                    : confirmation.action === 'claim'
                      ? 'Yes, claim delivery'
                      : 'Yes, mark delivered'
                }}
              </button>
            </div>
          </section>
        </div>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar } from '@ionic/vue';
import {
  bicycleOutline,
  checkmarkCircleOutline,
  checkmarkDoneOutline,
  handRightOutline,
  receiptOutline,
  timeOutline,
} from 'ionicons/icons';

import { session, signOutUser } from '../firebase';
import { claimOrder, markOrderDelivered, watchOrders } from '../services/marketplace';
import type { OrderStatus, StoreOrder } from '../types/marketplace';

const orders = ref<StoreOrder[]>([]);
const error = ref('');
const notice = ref('');
const busyOrderId = ref('');
const confirmation = ref<{ orderId: string; action: 'claim' | 'deliver' } | null>(null);
let unsubscribers: (() => void)[] = [];

const activeOrders = computed(() =>
  orders.value
    .filter((order) => order.status === 'pending' || order.status === 'claimed')
    .sort((first, second) => orderCreatedTime(second) - orderCreatedTime(first)),
);
const confirmationOrder = computed(() =>
  confirmation.value ? orders.value.find((order) => order.id === confirmation.value?.orderId) : undefined,
);

onMounted(() => {
  const uid = session.user?.uid;
  if (!uid || session.profile?.role !== 'staff') {
    error.value = 'Sign in with an active staff account to manage customer orders.';
    return;
  }

  unsubscribers = watchOrders(
    'staff',
    uid,
    (value) => {
      orders.value = value;
      error.value = '';
    },
    (reason) => {
      console.error('Could not load customer orders.', reason);
      error.value = getStaffOrderError(reason, 'load customer orders');
    },
  );
});

onUnmounted(() => unsubscribers.forEach((unsubscribe) => unsubscribe()));

async function performOrderAction(orderId: string, action: 'claim' | 'deliver') {
  error.value = '';
  notice.value = '';
  busyOrderId.value = orderId;
  try {
    if (action === 'claim') {
      await claimOrder(orderId);
      notice.value = 'Delivery assigned to you.';
    } else {
      await markOrderDelivered(orderId);
      notice.value = 'Order marked as delivered and added to delivered history.';
    }
  } catch (reason) {
    error.value = getStaffOrderError(reason, 'update this order');
  } finally {
    busyOrderId.value = '';
  }
}

function requestOrderAction(orderId: string, action: 'claim' | 'deliver') {
  confirmation.value = { orderId, action };
}

function closeConfirmation() {
  if (busyOrderId.value) return;
  confirmation.value = null;
}

async function confirmOrderAction() {
  const pendingAction = confirmation.value;
  if (!pendingAction || !confirmationOrder.value) return;
  confirmation.value = null;
  await performOrderAction(pendingAction.orderId, pendingAction.action);
}

async function logout() {
  error.value = '';
  try {
    await signOutUser();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not sign out.';
  }
}

function getStaffOrderError(reason: unknown, action: string): string {
  if (typeof reason === 'object' && reason !== null && 'code' in reason && reason.code === 'permission-denied') {
    return `Firestore denied permission to ${action}. After a staff member claims an order, the deployed rules must allow reading orders assigned to that staff account. From the project folder run: firebase deploy --only firestore:rules --project mobile-ab844. Also confirm the account is active and has the staff role.`;
  }
  return reason instanceof Error ? reason.message : `Could not ${action}.`;
}

function statusLabel(status: OrderStatus) {
  return status === 'claimed' ? 'Out for delivery' : 'New order · waiting for staff';
}

function orderCreatedTime(order: StoreOrder): number {
  const value = order.createdAt;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') return new Date(value).getTime() || 0;
  if (typeof value === 'object' && value !== null && 'toMillis' in value && typeof value.toMillis === 'function') {
    const time: unknown = value.toMillis();
    return typeof time === 'number' ? time : 0;
  }
  return 0;
}
</script>

<style scoped>
.orders-page {
  --ink: #20352c;
  --muted: #788078;
  --green: #355f49;
  --line: #e7e7df;
  max-width: 1050px;
  margin: 0 auto;
  padding: 32px 28px 70px;
  color: var(--ink);
}

.page-nav {
  display: flex;
  gap: 8px;
  margin-bottom: 32px;
}

.nav-link {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: #fff;
  color: #647066;
  font-size: 12px;
  font-weight: 650;
  text-decoration: none;
}

.nav-link ion-icon {
  font-size: 16px;
}

.nav-link.active {
  border-color: #d3e0d4;
  background: #eaf1e9;
  color: var(--green);
}

.page-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 25px;
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
  max-width: 610px;
  margin: 10px 0 0;
  color: var(--muted);
  line-height: 1.6;
}

.order-count {
  display: grid;
  min-width: 104px;
  padding: 12px 16px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fff;
  text-align: center;
}

.order-count strong {
  color: var(--green);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 27px;
  font-weight: 400;
}

.order-count span {
  color: var(--muted);
  font-size: 11px;
}

.orders-list {
  display: grid;
  gap: 12px;
}

.order-card {
  display: flex;
  align-items: center;
  gap: 17px;
  padding: 15px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fff;
  box-shadow: 0 3px 12px rgba(32, 53, 44, 0.035);
}

.product-image {
  width: 82px;
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
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border-radius: 16px;
  background: #f5efe5;
  color: #906b35;
  font-size: 10px;
  font-weight: 700;
}

.status.claimed {
  background: #e8eee8;
  color: var(--green);
}

.status ion-icon {
  font-size: 14px;
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

.order-info .customer {
  color: #4a584d;
  font-weight: 600;
}

.order-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.order-meta strong {
  color: var(--green);
  font-size: 13px;
}

.order-meta span {
  padding-left: 10px;
  border-left: 1px solid var(--line);
  color: var(--muted);
  font-size: 11px;
}

.order-action {
  display: inline-flex;
  min-height: 40px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 13px;
  border: 0;
  border-radius: 5px;
  background: var(--green);
  color: #fff;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.order-action:disabled {
  cursor: wait;
  opacity: 0.65;
}

.order-action ion-icon {
  font-size: 16px;
}

.assigned-note {
  flex: 0 0 auto;
  color: var(--muted);
  font-size: 11px;
}

.empty-state {
  padding: 55px 24px;
  border: 1px dashed #d9ddd4;
  border-radius: 7px;
  background: #fbfbf8;
  text-align: center;
}

.empty-icon {
  display: grid;
  width: 46px;
  height: 46px;
  margin: 0 auto 15px;
  place-items: center;
  border-radius: 50%;
  background: #eaf1e9;
  color: var(--green);
  font-size: 21px;
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

.notice.success {
  background: #eaf1e9;
  color: var(--green);
}

.confirmation-backdrop {
  position: fixed;
  z-index: 20;
  inset: 0;
  display: grid;
  place-items: center;
  overflow-y: auto;
  padding: 18px;
  background: rgba(18, 30, 24, 0.62);
  backdrop-filter: blur(4px);
}

.confirmation-modal {
  position: relative;
  width: min(100%, 430px);
  padding: 30px;
  border: 1px solid rgba(231, 231, 223, 0.9);
  border-radius: 10px;
  background: #fbfaf6;
  box-shadow: 0 24px 80px rgba(20, 34, 26, 0.25);
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: transparent;
  color: var(--ink);
  font-size: 21px;
  cursor: pointer;
}

.confirmation-icon {
  display: grid;
  width: 48px;
  height: 48px;
  margin-bottom: 20px;
  place-items: center;
  border-radius: 50%;
  background: #e8eee8;
  color: var(--green);
  font-size: 23px;
}

.confirmation-modal .eyebrow {
  margin-bottom: 8px;
}

.confirmation-modal h2 {
  max-width: 330px;
  margin: 0;
  color: var(--ink);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 27px;
  font-weight: 400;
  line-height: 1.2;
}

.confirmation-description {
  margin: 10px 0 18px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.confirmation-order {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff;
}

.confirmation-order img {
  width: 48px;
  height: 56px;
  flex: 0 0 auto;
  border-radius: 3px;
  background: #f0efe8;
  object-fit: cover;
}

.confirmation-order div {
  display: grid;
  gap: 5px;
}

.confirmation-order strong {
  color: var(--ink);
  font-size: 12px;
}

.confirmation-order span {
  color: var(--muted);
  font-size: 11px;
}

.confirmation-actions {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 9px;
  margin-top: 20px;
}

.confirmation-actions button {
  min-height: 44px;
  padding: 0 12px;
  border-radius: 5px;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.confirmation-actions button:disabled,
.modal-close:disabled {
  cursor: wait;
  opacity: 0.6;
}

.cancel-confirmation {
  border: 1px solid var(--line);
  background: #fff;
  color: #566157;
}

.confirm-action {
  border: 1px solid var(--green);
  background: var(--green);
  color: #fff;
}

@media (max-width: 720px) {
  .orders-page {
    padding: 26px 18px 48px;
  }

  .page-heading {
    align-items: flex-start;
  }

  .order-card {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 12px;
    padding: 12px;
  }

  .product-image {
    width: 66px;
    height: 78px;
  }

  .order-info {
    width: calc(100% - 80px);
    flex: initial;
  }

  .order-action,
  .assigned-note {
    margin-left: 78px;
  }

  .confirmation-backdrop {
    padding: 14px;
  }

  .confirmation-modal {
    width: min(100%, 400px);
    padding: 25px 20px 20px;
    border-radius: 12px;
  }

  .confirmation-actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 430px) {
  .page-nav {
    gap: 6px;
  }

  .nav-link {
    gap: 6px;
    padding: 0 10px;
    font-size: 11px;
  }

  .order-count {
    min-width: 78px;
    padding: 9px;
  }

  .order-count strong {
    font-size: 23px;
  }
}
</style>
