<template>
  <div class="notification-center">
    <button
      class="notification-trigger"
      type="button"
      aria-label="Open notifications"
      @click="isOpen = true"
    >
      <ion-icon :icon="notificationsOutline" />
      <span v-if="unreadCount" class="notification-count">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
    </button>

    <ion-modal
      class="notification-modal"
      :is-open="isOpen"
      :breakpoints="[0, 0.72, 0.95]"
      :initial-breakpoint="0.72"
      @did-dismiss="isOpen = false"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>Notifications</ion-title>
          <ion-buttons slot="end">
            <ion-button
              v-if="unreadCount"
              aria-label="Mark all notifications as read"
              @click="markAllRead"
            >
              <ion-icon slot="icon-only" :icon="checkmarkDoneOutline" />
            </ion-button>
            <ion-button aria-label="Close notifications" @click="isOpen = false">
              <ion-icon slot="icon-only" :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="notification-content">
        <p v-if="errorMessage" class="notification-error" role="alert">{{ errorMessage }}</p>
        <div v-else-if="!notifications.length" class="notification-empty">
          <ion-icon :icon="notificationsOutline" />
          <strong>You’re all caught up</strong>
          <span>Updates about your salon activity will show here.</span>
        </div>
        <div v-else class="notification-list">
          <article
            v-for="notification in notifications"
            :key="notification.id"
            class="notification-item"
            :class="{ unread: !readIds.has(notification.id) }"
            role="button"
            tabindex="0"
            @click="selectNotification(notification)"
            @keydown.enter.prevent="selectNotification(notification)"
            @keydown.space.prevent="selectNotification(notification)"
          >
            <span class="notification-indicator" aria-hidden="true"></span>
            <div class="notification-copy">
              <strong>{{ notification.title }}</strong>
              <p>{{ notification.body }}</p>
              <time>{{ formatDate(notification.createdAt?.toMillis?.()) }}</time>
            </div>
            <button
              v-if="!readIds.has(notification.id)"
              class="mark-read"
              type="button"
              :aria-label="`Mark ${notification.title} as read`"
              @click.stop="markRead(notification.id)"
              @keydown.stop
            >
              <ion-icon :icon="checkmarkOutline" />
            </button>
          </article>
        </div>
      </ion-content>
    </ion-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { checkmarkDoneOutline, checkmarkOutline, closeOutline, notificationsOutline } from 'ionicons/icons';

import {
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
  type AppNotification,
  type AppRole,
} from '../services/notifications';

const emit = defineEmits<{
  select: [notification: AppNotification];
}>();

const props = defineProps<{
  userId: string;
  role: AppRole;
}>();

const isOpen = ref(false);
const notifications = ref<AppNotification[]>([]);
const readIds = ref(new Set<string>());
const errorMessage = ref('');
const unreadCount = computed(() => notifications.value.filter((item) => !readIds.value.has(item.id)).length);
let unsubscribe: (() => void) | undefined;

watch(
  () => [props.userId, props.role] as const,
  ([userId, role]) => {
    unsubscribe?.();
    notifications.value = [];
    readIds.value = new Set();
    errorMessage.value = '';
    if (!userId) return;

    unsubscribe = subscribeNotifications(
      userId,
      role,
      (items, reads) => {
        notifications.value = items;
        readIds.value = reads;
      },
      (error) => {
        console.error('Unable to load notifications', error);
        errorMessage.value = 'Notifications are unavailable. Check your connection and Firestore rules.';
      },
    );
  },
  { immediate: true },
);

onUnmounted(() => unsubscribe?.());

function formatDate(timestamp?: number): string {
  if (!timestamp) return 'Just now';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp);
}

async function markRead(notificationId: string) {
  try {
    await markNotificationRead(props.userId, notificationId);
  } catch (error) {
    console.error('Unable to mark notification as read', error);
    errorMessage.value = 'Could not update this notification. Please try again.';
  }
}

async function markAllRead() {
  try {
    await markAllNotificationsRead(
      props.userId,
      notifications.value.filter((item) => !readIds.value.has(item.id)).map((item) => item.id),
    );
  } catch (error) {
    console.error('Unable to mark all notifications as read', error);
    errorMessage.value = 'Could not update notifications. Please try again.';
  }
}

async function selectNotification(notification: AppNotification) {
  if (!readIds.value.has(notification.id)) {
    await markRead(notification.id);
  }
  isOpen.value = false;
  emit('select', notification);
}
</script>

<style scoped>
.notification-center {
  display: inline-flex;
}

.notification-trigger {
  position: relative;
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid #eee4e0;
  border-radius: 14px;
  background: #fff;
  color: #74534b;
  font-size: 20px;
  cursor: pointer;
}

.notification-count {
  position: absolute;
  top: -5px;
  right: -5px;
  display: grid;
  min-width: 18px;
  height: 18px;
  place-items: center;
  padding: 0 4px;
  border: 2px solid #fff;
  border-radius: 12px;
  background: #b76758;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
}

.notification-content {
  --background: #faf7f5;
}

.notification-list {
  display: grid;
  gap: 10px;
  padding: 14px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 14px;
  border: 1px solid #eee7e3;
  border-radius: 15px;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.notification-item:hover,
.notification-item:focus-visible {
  border-color: #d9b2a7;
  outline: 0;
  box-shadow: 0 5px 16px rgba(67, 45, 38, 0.08);
  transform: translateY(-1px);
}

.notification-item.unread {
  border-color: #e8c9bf;
  background: #fffaf8;
}

.notification-indicator {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  margin-top: 5px;
  border-radius: 50%;
  background: transparent;
}

.unread .notification-indicator {
  background: #bb7564;
}

.notification-copy {
  min-width: 0;
  flex: 1;
}

.notification-copy strong {
  display: block;
  color: #3b3331;
  font-size: 13px;
}

.notification-copy p {
  margin: 5px 0 8px;
  color: #766a66;
  font-size: 12px;
  line-height: 1.45;
}

.notification-copy time {
  color: #a09692;
  font-size: 10px;
}

.mark-read {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  place-items: center;
  border: 0;
  border-radius: 9px;
  background: #f7e9e4;
  color: #a85e50;
  font-size: 17px;
  cursor: pointer;
}

.notification-empty {
  display: grid;
  justify-items: center;
  gap: 9px;
  padding: 56px 24px;
  color: #8d7e79;
  text-align: center;
}

.notification-empty ion-icon {
  color: #bd7969;
  font-size: 32px;
}

.notification-empty strong {
  color: #3b3331;
}

.notification-empty span {
  font-size: 12px;
}

.notification-error {
  margin: 16px;
  padding: 12px;
  border-radius: 12px;
  background: #fff0ef;
  color: #a64e43;
  font-size: 12px;
}

:global(ion-modal.notification-modal) {
  --height: min(700px, 85%);
  --width: min(540px, 100%);
  --border-radius: 22px;
  --backdrop-opacity: 0.45;
}

@media (max-width: 560px) {
  :global(ion-modal.notification-modal) {
    --height: 78%;
    --width: 100%;
    --border-radius: 22px 22px 0 0;
    align-items: end;
  }
}
</style>
