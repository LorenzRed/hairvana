import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';

import { authReady, session } from '../firebase';
import AdminPage from '../views/AdminPage.vue';
import BagPage from '../views/BagPage.vue';
import StaffHistoryPage from '../views/StaffHistoryPage.vue';
import StaffOrdersPage from '../views/StaffOrdersPage.vue';
import HomePage from '../views/HomePage.vue';
import StaffPage from '../views/StaffPage.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: { name: 'Home' },
  },
  {
    path: '/home',
    name: 'Home',
    component: HomePage,
  },
  {
    path: '/bag',
    name: 'Bag',
    component: BagPage,
  },
  {
    path: '/staff',
    name: 'Staff',
    component: StaffPage,
    meta: { role: 'staff' },
  },
  {
    path: '/staff/history',
    name: 'StaffHistory',
    component: StaffHistoryPage,
    meta: { role: 'staff' },
  },
  {
    path: '/staff/orders',
    name: 'StaffOrders',
    component: StaffOrdersPage,
    meta: { role: 'staff' },
  },
  {
    path: '/seller',
    name: 'Seller',
    component: StaffPage,
    meta: { role: 'seller' },
  },
  {
    path: '/admin',
    name: 'Admin',
    component: AdminPage,
    meta: { role: 'admin' },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach(async (to) => {
  if (to.name === 'Bag') {
    await authReady;
    if (session.profile?.role === 'staff') return { name: 'Home' };
  }
  if (to.meta.role !== 'staff' && to.meta.role !== 'admin' && to.meta.role !== 'seller') return true;
  await authReady;

  if (!session.user || !session.profile?.active) return { name: 'Home' };
  if (session.profile.role !== to.meta.role) {
    return {
      name:
        session.profile.role === 'admin'
          ? 'Admin'
          : session.profile.role === 'staff'
            ? 'Staff'
            : session.profile.role === 'seller'
              ? 'Seller'
              : 'Home',
    };
  }
  return true;
});

export default router;
