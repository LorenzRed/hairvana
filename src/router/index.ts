import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';

import { getCurrentUserProfile, waitForAuthState } from '../services/auth';
import AdminPage from '../views/AdminPage.vue';
import AuthPage from '../views/AuthPage.vue';
import DashboardPage from '../views/DashboardPage.vue';
import HomePage from '../views/HomePage.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  { path: '/auth', name: 'Auth', component: AuthPage, meta: { public: true } },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardPage,
  },
  {
    path: '/admin',
    name: 'Admin',
    component: AdminPage,
  },
  {
    path: '/home',
    name: 'Home',
    component: HomePage,
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach(async (to) => {
  const user = await waitForAuthState();
  if (!to.meta.public && !user) return '/auth';
  if (to.path === '/auth' && user) {
    const profile = await getCurrentUserProfile();
    return profile?.role === 'admin' ? '/admin' : '/dashboard';
  }
  if (to.path === '/dashboard' && user) {
    const profile = await getCurrentUserProfile();
    if (profile?.role === 'admin') return '/admin';
  }
  if (to.path === '/admin' && user) {
    const profile = await getCurrentUserProfile();
    if (profile?.role !== 'admin') return '/dashboard';
  }
  if (to.path === '/home' && user) return '/dashboard';
  return true;
});

export default router;
