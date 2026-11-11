<template>
  <ion-page>
    <ion-content :fullscreen="true" class="auth-content">
      <div class="auth-page">
        <aside class="branding-panel" aria-label="Hairvana salon platform overview">
          <div class="brand-header">
            <img class="brand-mark" src="/hairvana-logo.png" alt="Hairvana" />
            <span>HAIRVANA</span>
          </div>

          <div class="hero-copy">
            <span class="panel-label">SALON OPERATIONS</span>
            <h2>Turn everyday appointments into a premium client experience.</h2>
            <p>Manage bookings, styling services, and client relationships in one elegant workspace.</p>
          </div>

          <div class="feature-stack">
            <div class="feature-item">
              <span class="feature-icon">✦</span>
              <div>
                <strong>Smart scheduling</strong>
                <small>Keep the studio running smoothly</small>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">✦</span>
              <div>
                <strong>Service insights</strong>
                <small>Track your bestselling treatments</small>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">✦</span>
              <div>
                <strong>Client-first care</strong>
                <small>Deliver polished experiences every time</small>
              </div>
            </div>
          </div>
        </aside>

        <section class="auth-card">
          <span class="card-kicker">{{ isRegistering ? 'CREATE YOUR SPACE' : 'WELCOME BACK' }}</span>
          <h1>{{ isRegistering ? 'Start managing beautifully.' : 'Good to see you again.' }}</h1>
          <p class="intro">{{ isRegistering ? 'Create your salon owner account to get started.' : 'Sign in to manage your salon with ease.' }}</p>

          <form @submit.prevent="submit">
            <label v-if="isRegistering" class="field-label" for="name">Full name</label>
            <input v-if="isRegistering" id="name" v-model.trim="name" class="field" type="text" autocomplete="name" placeholder="Olivia Santos" />
            <label class="field-label" for="email">Email address</label>
            <input id="email" v-model.trim="email" class="field" type="email" autocomplete="email" placeholder="you@salon.com" required />
            <label class="field-label" for="password">Password</label>
            <div class="password-field">
              <input
                id="password"
                v-model="password"
                class="field"
                :type="passwordVisible ? 'text' : 'password'"
                :autocomplete="isRegistering ? 'new-password' : 'current-password'"
                placeholder="At least 6 characters"
                minlength="6"
                required
              />
              <button
                class="password-toggle"
                type="button"
                :aria-label="passwordVisible ? 'Hide password' : 'Show password'"
                :aria-pressed="passwordVisible"
                @click="passwordVisible = !passwordVisible"
              >
                <ion-icon :icon="passwordVisible ? eyeOffOutline : eyeOutline" />
              </button>
            </div>
            <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
            <button class="submit-button" type="submit" :disabled="loading">
              {{ loading ? 'Please wait...' : isRegistering ? 'Create customer account' : 'Sign in to dashboard' }}
              <ion-icon v-if="!loading" :icon="arrowForwardOutline" />
            </button>
          </form>

          <button class="switch-button" @click="toggleMode">
            {{ isRegistering ? 'Already have an account? Sign in' : 'New salon owner? Create an account' }}
          </button>
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
import { arrowForwardOutline, eyeOffOutline, eyeOutline, shieldCheckmarkOutline } from 'ionicons/icons';

import { login, registerUser } from '../services/auth';

const router = useRouter();
const isRegistering = ref(false);
const loading = ref(false);
const name = ref('');
const email = ref('');
const password = ref('');
const passwordVisible = ref(false);
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
.auth-content {
  --background: linear-gradient(135deg, #f4efe9 0%, #f8f5f2 32%, #fbf6f2 100%);
}

.auth-page {
  min-height: 100%;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  align-items: center;
  gap: 32px;
  max-width: 1180px;
  margin: 0 auto;
  padding: 40px 32px 32px;
}

.branding-panel {
  position: relative;
  overflow: hidden;
  min-height: 620px;
  border-radius: 32px;
  padding: 32px 30px;
  background: linear-gradient(160deg, #2f2623 0%, #493a34 38%, #6d4d42 100%);
  box-shadow: 0 28px 80px rgba(56, 36, 30, 0.2);
}

.branding-panel::before,
.branding-panel::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}

.branding-panel::before {
  width: 260px;
  height: 260px;
  right: -50px;
  top: -90px;
}

.branding-panel::after {
  width: 340px;
  height: 340px;
  left: -120px;
  bottom: -140px;
}

.brand-header,
.hero-copy,
.feature-stack {
  position: relative;
  z-index: 1;
}

.brand-header {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #f9efe9;
  font-size: 12px;
  letter-spacing: 2px;
  font-weight: 800;
}

.brand-mark {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  object-fit: cover;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
}

.hero-copy {
  margin-top: 104px;
  max-width: 440px;
}

.panel-label,
.card-kicker {
  display: inline-block;
  letter-spacing: 1.8px;
  font-size: 10px;
  font-weight: 800;
}

.panel-label {
  color: #e7cfc7;
}

.hero-copy h2 {
  margin: 14px 0 12px;
  color: #fff8f5;
  font-size: clamp(2.2rem, 4vw, 3.8rem);
  line-height: 1.02;
  letter-spacing: -0.06em;
  font-weight: 700;
}

.hero-copy p {
  margin: 0;
  max-width: 360px;
  color: rgba(255, 245, 241, 0.8);
  font-size: 15px;
  line-height: 1.7;
}

.feature-stack {
  display: grid;
  gap: 14px;
  margin-top: 42px;
  max-width: 390px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
}

.feature-icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 16px;
}

.feature-item strong {
  display: block;
  color: #fff7f3;
  font-size: 0.94rem;
}

.feature-item small {
  display: block;
  color: rgba(255, 245, 241, 0.75);
  margin-top: 2px;
}

.auth-card {
  position: relative;
  z-index: 1;
  width: min(100%, 480px);
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(95, 75, 67, 0.08);
  border-radius: 30px;
  padding: 30px 26px 24px;
  box-shadow: 0 24px 70px rgba(76, 55, 47, 0.08);
  backdrop-filter: blur(16px);
}

.card-kicker {
  color: #b57060;
  font-weight: 800;
}

h1 {
  margin: 12px 0 10px;
  color: #2d2524;
  font-size: clamp(2.1rem, 3vw, 3rem);
  line-height: 1.04;
  letter-spacing: -0.06em;
  font-weight: 700;
}

.intro {
  margin: 0 0 26px;
  color: #867971;
  font-size: 14px;
  line-height: 1.6;
}

form {
  display: block;
}

.field-label {
  display: block;
  color: #584d4a;
  font-size: 12px;
  font-weight: 700;
  margin: 16px 0 8px;
}

.field {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid #e8deda;
  border-radius: 14px;
  background-color: #fff;
  color: #2d2524;
  color-scheme: light;
  outline: none;
  padding: 14px 14px;
  font: inherit;
  font-size: 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  -webkit-appearance: none;
  appearance: none;
}

.field:-webkit-autofill,
.field:-webkit-autofill:hover,
.field:-webkit-autofill:focus {
  -webkit-text-fill-color: #2d2524;
  -webkit-box-shadow: 0 0 0 1000px #fff inset;
}

.field::placeholder {
  color: #b4a9a4;
  opacity: 1;
}

.field:focus {
  border-color: #c8806f;
  box-shadow: 0 0 0 4px rgba(198, 126, 103, 0.12);
  transform: translateY(-1px);
}

.password-field {
  position: relative;
}

.password-field .field {
  padding-right: 48px;
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 12px;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #8d7f79;
  font-size: 19px;
  transform: translateY(-50%);
  cursor: pointer;
}

.password-toggle:focus-visible {
  outline: 2px solid #c8806f;
  outline-offset: 2px;
}

.submit-button {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 16px;
  padding: 15px 18px;
  margin-top: 22px;
  color: #fff;
  background: linear-gradient(135deg, #292321 0%, #51413d 100%);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.02em;
  box-shadow: 0 16px 30px rgba(38, 29, 25, 0.18);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 18px 32px rgba(38, 29, 25, 0.22);
}

.submit-button:disabled {
  opacity: 0.7;
  cursor: wait;
}

.switch-button {
  display: block;
  border: 0;
  background: transparent;
  color: #a86252;
  font-size: 12px;
  font-weight: 700;
  margin: 20px auto 0;
  cursor: pointer;
}

.error-message {
  color: #b34848;
  background: #fdf0f0;
  border: 1px solid rgba(179, 72, 72, 0.12);
  padding: 11px 12px;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.5;
  margin: 16px 0 0;
}

.secure-note {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  color: #867971;
  font-size: 11px;
  letter-spacing: 0.02em;
}

.secure-note ion-icon {
  color: #7ba583;
  font-size: 15px;
}

@media (max-width: 860px) {
  .auth-page {
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 24px 18px 36px;
  }

  .branding-panel {
    min-height: unset;
    padding: 24px 22px 26px;
  }

  .hero-copy {
    margin-top: 50px;
  }

  .hero-copy h2 {
    max-width: 320px;
  }

  .auth-card {
    width: 100%;
  }
}
</style>
