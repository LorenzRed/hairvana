<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <main class="bag-page">
        <header class="bag-topbar">
          <router-link class="wordmark" to="/home" aria-label="Triftmark home">
            <span class="brand-mark">t</span>
            <span>triftmark<span class="brand-period">.</span></span>
          </router-link>
          <router-link class="continue-link" to="/home">Continue shopping</router-link>
        </header>

        <section class="bag-content" aria-labelledby="bag-heading">
          <p class="eyebrow">YOUR GOOD FINDS</p>
          <h1 id="bag-heading">Shopping bag<span class="brand-period">.</span></h1>

          <p v-if="storageError" class="storage-error" role="alert">{{ storageError }}</p>
          <div v-if="cart.length" class="bag-list">
            <article v-for="product in cart" :key="product.id" class="bag-item">
              <img :src="product.image" :alt="product.name" />
              <div class="bag-item-info">
                <h2>{{ product.name }}</h2>
                <p>Size {{ product.size }} <span>·</span> {{ product.condition }}</p>
                <strong>₱{{ product.price.toLocaleString('en-PH') }}</strong>
              </div>
              <button class="remove-button" type="button" @click="removeFromBag(product.id)">Remove</button>
            </article>

            <div class="bag-summary">
              <span>{{ cart.length }} {{ cart.length === 1 ? 'item' : 'items' }}</span>
              <strong>₱{{ total.toLocaleString('en-PH') }}</strong>
            </div>
            <router-link class="checkout-button" :to="{ name: 'Home', query: { checkout: '1' } }">
              Continue to checkout · Cash on delivery
            </router-link>
          </div>
          <div v-else class="empty-bag">
            <ion-icon :icon="bagHandleOutline" aria-hidden="true" />
            <h2>Your bag is waiting for a good find.</h2>
            <p>Add a one-of-a-kind piece from the shop and it will appear here.</p>
            <router-link class="checkout-button" to="/home">Explore the shop</router-link>
          </div>
        </section>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { IonContent, IonIcon, IonPage, onIonViewWillEnter } from '@ionic/vue';
import { bagHandleOutline } from 'ionicons/icons';

import type { Product } from '../types/marketplace';

const storageError = ref('');
const cart = ref(readStoredProducts());
const total = computed(() => cart.value.reduce((sum, product) => sum + product.price, 0));

onIonViewWillEnter(() => {
  cart.value = readStoredProducts();
});

watch(
  cart,
  (products) => {
    try {
      localStorage.setItem('triftmark-cart', JSON.stringify(products));
      storageError.value = '';
    } catch (error) {
      storageError.value =
        error instanceof Error ? `Could not save your bag: ${error.message}` : 'Could not save your bag.';
    }
  },
  { deep: true },
);

function removeFromBag(productId: string) {
  cart.value = cart.value.filter((product) => product.id !== productId);
}

function readStoredProducts(): Product[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem('triftmark-cart') ?? '[]');
    storageError.value = '';
    return Array.isArray(stored) ? stored.filter(isStoredProduct) : [];
  } catch (error) {
    console.error('Could not load the saved shopping bag.', error);
    storageError.value = 'Could not load your saved bag. Please refresh and try again.';
    return [];
  }
}

function isStoredProduct(value: unknown): value is Product {
  if (typeof value !== 'object' || value === null) return false;
  const product = value as Record<string, unknown>;
  return (
    typeof product.id === 'string' &&
    typeof product.name === 'string' &&
    typeof product.price === 'number' &&
    typeof product.image === 'string' &&
    typeof product.size === 'string' &&
    typeof product.condition === 'string'
  );
}
</script>

<style scoped>
.bag-page {
  --ink: #20352c;
  --muted: #788078;
  --green: #355f49;
  --line: #e7e7df;
  max-width: 1000px;
  min-height: 100%;
  margin: 0 auto;
  padding: 28px 48px 64px;
  color: var(--ink);
}

.bag-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--line);
}

.wordmark {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: var(--ink);
  font-size: 19px;
  font-weight: 750;
  letter-spacing: -0.8px;
  text-decoration: none;
}

.brand-mark {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 50%;
  background: var(--green);
  color: #fff;
  font-family: Georgia, serif;
  font-size: 19px;
}

.brand-period {
  color: #b88358;
}

.continue-link,
.remove-button {
  color: var(--green);
  font-size: 13px;
  font-weight: 650;
}

.bag-content {
  width: min(100%, 700px);
  margin: 54px auto 0;
}

.eyebrow {
  margin: 0 0 10px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 1.6px;
}

h1 {
  margin: 0 0 26px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(32px, 5vw, 46px);
  font-weight: 500;
  letter-spacing: -1.5px;
}

.bag-item {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px 0;
  border-top: 1px solid var(--line);
}

.bag-item > img {
  width: 86px;
  height: 100px;
  border-radius: 4px;
  background: #f3f1e9;
  object-fit: cover;
}

.bag-item-info {
  flex: 1;
}

.bag-item-info h2 {
  margin: 0 0 6px;
  font-size: 15px;
}

.bag-item-info p,
.empty-bag p {
  margin: 0 0 9px;
  color: var(--muted);
  font-size: 12px;
}

.bag-item-info p span {
  padding: 0 4px;
}

.bag-item-info strong {
  color: var(--green);
  font-size: 14px;
}

.remove-button {
  border: 0;
  background: transparent;
  cursor: pointer;
}

.bag-summary {
  display: flex;
  justify-content: space-between;
  margin: 10px 0 18px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
  font-size: 14px;
}

.checkout-button {
  display: flex;
  min-height: 46px;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
  border: 0;
  border-radius: 4px;
  background: var(--green);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
  text-decoration: none;
}

.empty-bag {
  padding: 54px 24px;
  border: 1px solid var(--line);
  border-radius: 5px;
  text-align: center;
}

.empty-bag ion-icon {
  color: var(--green);
  font-size: 34px;
}

.empty-bag h2 {
  margin: 14px 0 8px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 22px;
  font-weight: 500;
}

.empty-bag p {
  margin-bottom: 22px;
}

.storage-error {
  color: #9c3d31;
  font-size: 13px;
}

@media (max-width: 600px) {
  .bag-page {
    padding: 20px 20px 48px;
  }

  .bag-content {
    margin-top: 38px;
  }

  .bag-item {
    gap: 12px;
  }

  .bag-item > img {
    width: 68px;
    height: 80px;
  }

  .bag-item-info h2 {
    font-size: 13px;
  }

  .remove-button {
    padding: 5px 0 5px 5px;
    font-size: 11px;
  }
}
</style>
