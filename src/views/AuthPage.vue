<template>
  <ion-page>
    <ion-content :fullscreen="true" class="auth-content">
      <div class="auth-shell">
        <div class="auth-brand"><div class="brand-mark">H</div><span>HAIRVANA</span></div>
        <section class="auth-card">
          <span class="eyebrow">{{ isRegistering ? 'CREATE YOUR SPACE' : 'WELCOME BACK' }}</span>
          <h1>{{ isRegistering ? 'Start managing beautifully.' : 'Good to see you again.' }}</h1>
          <p class="intro">{{ isRegistering ? 'Create your salon owner account to get started.' : 'Sign in to manage your salon with ease.' }}</p>
          <form @submit.prevent="submit">
            <label v-if="isRegistering" class="field-label" for="name">Full name</label>
            <input v-if="isRegistering" id="name" v-model.trim="name" class="field" type="text" autocomplete="name" placeholder="Olivia Santos" />
            <label class="field-label" for="email">Email address</label>
            <input id="email" v-model.trim="email" class="field" type="email" autocomplete="email" placeholder="you@salon.com" required />
            <label class="field-label" for="password">Password</label>
            <input id="password" v-model="password" class="field" type="password" autocomplete="current-password" placeholder="At least 6 characters" minlength="6" required />
            <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
            <button class="submit-button" type="submit" :disabled="loading">{{ loading ? 'Please wait...' : isRegistering ? 'Create customer account' : 'Sign in to dashboard' }}<ion-icon v-if="!loading" :icon="arrowForwardOutline" /></button>
          </form>
          <button class="switch-button" @click="toggleMode">{{ isRegistering ? 'Already have an account? Sign in' : 'New salon owner? Create an account' }}</button>
        </section>
        <p class="secure-note"><ion-icon :icon="shieldCheckmarkOutline" /> Your account is protected by Firebase Authentication.</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonContent, IonIcon, IonPage } from '@ionic/vue';
import { arrowForwardOutline, shieldCheckmarkOutline } from 'ionicons/icons';

import { login, registerUser } from '../services/auth';

const router = useRouter();
const isRegistering = ref(false);
const loading = ref(false);
const name = ref('');
const email = ref('');
const password = ref('');
const errorMessage = ref('');

function toggleMode() {
  isRegistering.value = !isRegistering.value;
  errorMessage.value = '';
}

function getErrorMessage(error: unknown): string {
  const firebaseError = error as { code?: string; message?: string };
  const code = firebaseError.code ?? '';
  const message = firebaseError.message ?? '';

  if (message === 'profile-write-timeout') {
    return 'Account creation is taking too long. Confirm Firestore is enabled, then try signing in again.';
  }
  if (code === 'permission-denied' || message.includes('permission-denied')) {
    return 'Firestore rejected the customer profile. Publish the project firestore.rules file, then try again.';
  }
  if (code === 'auth/network-request-failed' || message.includes('network-request-failed')) {
    return 'Network connection failed. Check your internet and try again.';
  }
  if (code === 'auth/invalid-credential') return 'The email or password is incorrect.';
  if (code === 'auth/email-already-in-use') return 'An account already exists for this email.';
  if (code === 'auth/weak-password') return 'Use a stronger password with at least 6 characters.';
  if (code === 'auth/invalid-email') return 'Enter a valid email address.';
  if (code === 'auth/operation-not-allowed') return 'Email/password sign-in is disabled. Enable it in Firebase Authentication.';
  if (code === 'auth/invalid-api-key') return 'The Firebase API key is invalid. Check your .env values.';
  if (code === 'auth/configuration-not-found') return 'Firebase Authentication is not enabled for this project.';
  if (code === 'auth/too-many-requests') return 'Too many attempts. Wait a few minutes and try again.';
  if (code === 'auth/internal-error') return 'Firebase returned an internal error. Check the Firebase Console and try again.';
  console.error('Hairvana authentication error', error);
  return code ? `Firebase error (${code}). Check your Firebase setup and try again.` : 'Unable to complete that request. Please try again.';
}

async function submit() {
  if (isRegistering.value && !name.value) {
    errorMessage.value = 'Enter your full name.';
    return;
  }
  loading.value = true;
  errorMessage.value = '';
  try {
    if (isRegistering.value) await registerUser(name.value, email.value, password.value, 'customer');
    else await login(email.value, password.value);
    await router.replace('/dashboard');
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-content { --background: #f9f7f5; }.auth-shell { min-height: 100%; max-width: 470px; margin: auto; padding: 46px 24px 28px; display: flex; flex-direction: column; }.auth-brand { display: flex; align-items: center; gap: 10px; color: #332d2c; font-size: 13px; font-weight: 800; letter-spacing: 2px; margin-bottom: 70px; }.brand-mark { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 14px; background: #332d2c; color: #fff; font: 700 22px Georgia, serif; }.auth-card { background: #fff; border: 1px solid #eee8e4; border-radius: 26px; padding: 26px 22px; box-shadow: 0 15px 40px rgba(89, 61, 52, .06); }.eyebrow { color: #a16a5d; font-size: 10px; font-weight: 800; letter-spacing: 1.8px; }h1 { color: #332d2c; font: 600 31px/1.1 Georgia, serif; margin: 10px 0; }.intro { color: #9c918e; font-size: 13px; line-height: 1.5; margin-bottom: 25px; }.field-label { display: block; color: #5b4b47; font-size: 12px; font-weight: 700; margin: 15px 0 7px; }.field { box-sizing: border-box; width: 100%; border: 1px solid #e8dfdb; border-radius: 12px; background: #fdfcfb; color: #332d2c; outline: none; padding: 13px; font: inherit; font-size: 13px; }.field:focus { border-color: #bf7a6b; box-shadow: 0 0 0 3px #f6e5df; }.submit-button { width: 100%; display: flex; justify-content: center; align-items: center; gap: 9px; border: 0; border-radius: 14px; padding: 14px; margin-top: 23px; color: #fff; background: #332d2c; font-size: 12px; font-weight: 800; }.submit-button:disabled { opacity: .6; }.switch-button { display: block; border: 0; background: transparent; color: #b26759; font-size: 12px; font-weight: 700; margin: 20px auto 0; }.error-message { color: #b34848; background: #fceded; padding: 10px; border-radius: 9px; font-size: 12px; line-height: 1.4; margin: 15px 0 0; }.secure-note { color: #a69b97; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 10px; margin-top: auto; padding-top: 30px; }.secure-note ion-icon { color: #7d9d84; font-size: 15px; }
</style>
