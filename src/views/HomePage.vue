<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <main class="storefront">
        <header class="topbar">
          <a class="wordmark" href="/home" aria-label="Triftmark home">
            <span class="brand-mark">t</span>
            <span>triftmark<span class="brand-period">.</span></span>
          </a>
          <p class="topbar-note">A little less new. A lot more you.</p>
          <div class="top-actions">
            <router-link v-if="session.profile?.role === 'admin'" class="workspace-link" to="/admin">Admin</router-link>
            <router-link v-else-if="session.profile?.role === 'staff'" class="workspace-link" to="/staff">
              <ion-icon :icon="clipboardOutline" aria-hidden="true" />
              Staff desk
            </router-link>
            <router-link v-if="session.profile?.role === 'staff'" class="workspace-link" to="/staff/orders">
              <ion-icon :icon="receiptOutline" aria-hidden="true" />
              Customer orders
            </router-link>
            <router-link v-if="session.profile?.role === 'staff'" class="workspace-link" to="/staff/history">
              <ion-icon :icon="checkmarkDoneOutline" aria-hidden="true" />
              Delivered history
            </router-link>
            <router-link v-else-if="session.profile?.role === 'seller'" class="workspace-link" to="/seller">
              Seller desk
            </router-link>
            <button
              v-if="canShop"
              class="account-button"
              type="button"
              aria-controls="orders-section"
              :aria-expanded="showOrders"
              @click="toggleOrders"
            >
              My orders
            </button>
            <button
              v-if="session.profile?.role !== 'staff'"
              class="account-button cart-trigger"
              type="button"
              @click="openBag"
            >
              <ion-icon :icon="bagHandleOutline" />
              Bag <span>{{ cart.length }}</span>
            </button>
            <button
              v-if="session.profile?.role !== 'staff'"
              class="account-button cart-trigger"
              type="button"
              :aria-label="showFavoritesOnly ? 'Show all finds' : 'Show saved finds'"
              :aria-pressed="showFavoritesOnly"
              @click="showFavoritesOnly = !showFavoritesOnly"
            >
              <ion-icon :icon="showFavoritesOnly ? heart : heartOutline" />
              Saved <span>{{ favoriteIds.length }}</span>
            </button>
            <button
              v-if="session.profile?.role === 'customer' && session.profile.sellerStatus !== 'pending'"
              class="account-button"
              type="button"
              @click="openSellerApplication"
            >
              Sell with us
            </button>
            <span v-else-if="session.profile?.sellerStatus === 'pending'" class="seller-pending">
              Seller application pending
            </span>
            <button v-if="session.user" class="account-button" type="button" @click="logout">Sign out</button>
            <button v-else class="account-button" type="button" @click="openAuth('signin')">Sign in</button>
          </div>
        </header>

        <section class="intro">
          <div class="intro-copy">
            <p class="eyebrow"><span class="eyebrow-dot"></span> GOOD FINDS, SECOND TIME AROUND</p>
            <h1>Find your next<br /><span>favorite thing.</span></h1>
            <p class="intro-description">
              One-of-a-kind pieces, ready for a new story. Find something that feels like you.
            </p>
          </div>
          <div class="intro-art" aria-hidden="true">
            <div class="sun-shape"></div>
            <div class="art-caption">PRE-LOVED<br />&amp; PICKED FOR YOU</div>
            <span class="art-star star-one">✳</span>
            <span class="art-star star-two">✳</span>
            <span class="art-squiggle">〰</span>
            <img
              class="hero-image"
              src="https://images.unsplash.com/photo-1551232864-3f0890e580d9?auto=format&amp;fit=crop&amp;w=620&amp;q=85"
              alt=""
            />
          </div>
        </section>

        <p v-if="!isFirebaseConfigured" class="setup-notice" role="status">
          <strong>Preview mode.</strong> Connect your Firebase project to activate customer accounts, staff listings,
          and real orders. These sample items are for preview only.
        </p>
        <p v-if="storeError" class="setup-notice error" role="alert">{{ storeError }}</p>
        <p v-if="cartError" class="setup-notice error" role="alert">{{ cartError }}</p>
        <p v-if="authNotice && !showOrders" class="setup-notice" role="status">{{ authNotice }}</p>
        <p v-if="session.error" class="setup-notice error" role="alert">{{ session.error }}</p>

        <section v-if="sellerApplyOpen" class="auth-panel" aria-labelledby="seller-apply-heading">
          <div class="auth-heading">
            <div>
              <p class="eyebrow">SELL ON TRIFTMARK</p>
              <h2 id="seller-apply-heading">Got good things to pass on?</h2>
            </div>
            <button
              class="close-button"
              type="button"
              aria-label="Close seller application"
              @click="sellerApplyOpen = false"
            >
              ×
            </button>
          </div>
          <form class="auth-form" @submit.prevent="submitSellerApplication">
            <label>
              Tell us about your shop and the items you plan to sell
              <textarea
                v-model="sellerDescription"
                minlength="20"
                maxlength="1000"
                rows="4"
                required
                placeholder="Share what you sell and how you source pre-loved pieces."
              ></textarea>
            </label>
            <p v-if="sellerError" class="form-error" role="alert">{{ sellerError }}</p>
            <button class="primary-button" type="submit" :disabled="sellerBusy">
              {{ sellerBusy ? 'Submitting…' : 'Submit for admin review' }}
            </button>
          </form>
        </section>

        <div v-if="authOpen && session.profile?.role !== 'staff'" class="auth-backdrop" @click.self="closeAuth">
          <section
            class="auth-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-heading"
            :aria-label="authMode === 'signin' ? 'Sign in to Triftmark' : undefined"
          >
            <div class="auth-heading">
              <div>
                <p class="eyebrow">
                  {{
                    checkoutSignInRequired
                      ? 'SECURE CHECKOUT'
                      : authMode === 'staff'
                        ? 'STAFF INVITATION'
                        : 'YOUR TRIFTMARK ACCOUNT'
                  }}
                </p>
                <h2 id="auth-heading">
                  {{
                    checkoutSignInRequired
                      ? 'Sign in before checkout.'
                      : authMode === 'signin'
                        ? 'Welcome back.'
                        : authMode === 'staff'
                          ? 'Join the team.'
                          : 'Find your people.'
                  }}
                </h2>
                <p v-if="checkoutSignInRequired" class="auth-help">
                  Sign in or create a customer account to continue. Your bag will be saved.
                </p>
              </div>
              <button class="close-button" type="button" aria-label="Close sign in" @click="closeAuth">×</button>
            </div>
            <div class="auth-tabs" aria-label="Account options">
              <button :class="{ active: authMode === 'signin' }" type="button" @click="authMode = 'signin'">
                Sign in
              </button>
              <button :class="{ active: authMode === 'customer' }" type="button" @click="authMode = 'customer'">
                Create customer account
              </button>
              <button
                v-if="!checkoutSignInRequired"
                :class="{ active: authMode === 'staff' }"
                type="button"
                @click="authMode = 'staff'"
              >
                Accept staff invite
              </button>
            </div>
            <form class="auth-form" @submit.prevent="submitAuth">
              <label v-if="authMode !== 'signin'">
                Full name
                <input v-model="authName" autocomplete="name" required />
              </label>
              <label>
                Email address
                <input v-model="authEmail" type="email" autocomplete="email" required />
              </label>
              <label>
                Password
                <input v-model="authPassword" type="password" autocomplete="current-password" minlength="6" required />
              </label>
              <p v-if="authError" class="form-error" role="alert">{{ authError }}</p>
              <button class="primary-button" type="submit" :disabled="authBusy || !isFirebaseConfigured">
                {{
                  authBusy
                    ? 'Please wait…'
                    : authMode === 'signin'
                      ? 'Sign in'
                      : authMode === 'staff'
                        ? 'Accept invitation & create account'
                        : 'Create account'
                }}
              </button>
            </form>
            <p v-if="authMode === 'staff'" class="auth-help">
              Staff access is only available to email addresses invited by an admin.
            </p>
            <p v-else-if="authMode === 'customer'" class="auth-help">
              Customer accounts can order from the shop and follow delivery progress.
            </p>
          </section>
        </div>

        <section class="finds-section" aria-labelledby="finds-heading">
          <div class="section-heading">
            <div>
              <p class="eyebrow">THE GOOD STUFF</p>
              <h2 id="finds-heading">Today’s finds<span class="brand-period">.</span></h2>
            </div>
            <p class="item-count">{{ filteredProducts.length }} pieces to love</p>
          </div>

          <label class="search-box">
            <ion-icon :icon="searchOutline" aria-hidden="true" />
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Search vintage, denim, bags..."
              aria-label="Search items"
            />
            <button
              v-if="searchQuery"
              class="clear-search"
              type="button"
              aria-label="Clear search"
              @click="searchQuery = ''"
            >
              <ion-icon :icon="closeCircleOutline" />
            </button>
          </label>

          <div class="filter-options" aria-label="Filter products">
            <label>
              Size
              <select v-model="selectedSize">
                <option value="">All sizes</option>
                <option v-for="size in availableSizes" :key="size" :value="size">{{ size }}</option>
              </select>
            </label>
            <label>
              Condition
              <select v-model="selectedCondition">
                <option value="">Any condition</option>
                <option v-for="condition in availableConditions" :key="condition" :value="condition">
                  {{ condition }}
                </option>
              </select>
            </label>
            <label>
              Brand
              <input v-model="selectedBrand" placeholder="Any brand" />
            </label>
            <label>
              Color
              <input v-model="selectedColor" placeholder="Any color" />
            </label>
            <label>
              Min ₱
              <input v-model.number="minimumPrice" type="number" min="0" placeholder="0" />
            </label>
            <label>
              Max ₱
              <input v-model.number="maximumPrice" type="number" min="0" placeholder="No limit" />
            </label>
          </div>

          <div class="filter-row" aria-label="Filter by category">
            <button
              v-for="category in categories"
              :key="category"
              class="filter-chip"
              :class="{ active: selectedCategory === category }"
              type="button"
              :aria-pressed="selectedCategory === category"
              @click="selectedCategory = category"
            >
              {{ category }}
            </button>
          </div>

          <div v-if="!isStaff" class="wishlist-toggle-row">
            <button
              class="wishlist-toggle"
              type="button"
              :aria-pressed="showFavoritesOnly"
              @click="showFavoritesOnly = !showFavoritesOnly"
            >
              <ion-icon :icon="showFavoritesOnly ? heart : heartOutline" />
              {{ showFavoritesOnly ? 'Showing saved finds' : 'Show saved finds' }}
            </button>
          </div>

          <div v-if="filteredProducts.length" class="product-grid">
            <article v-for="product in filteredProducts" :key="product.id" class="product-card">
              <div class="product-photo">
                <img :src="product.image" :alt="product.name" loading="lazy" />
                <span v-if="product.tag" class="product-tag">{{ product.tag }}</span>
                <button
                  v-if="!isStaff"
                  class="favorite-button"
                  type="button"
                  :aria-label="`${favoriteIds.includes(product.id) ? 'Remove' : 'Save'} ${product.name} ${favoriteIds.includes(product.id) ? 'from' : 'to'} wishlist`"
                  :aria-pressed="favoriteIds.includes(product.id)"
                  @click="toggleFavorite(product.id)"
                >
                  <ion-icon :icon="favoriteIds.includes(product.id) ? heart : heartOutline" />
                </button>
              </div>
              <div class="product-details">
                <div class="product-name-row">
                  <h3>{{ product.name }}</h3>
                  <span class="product-size">Size {{ product.size }}</span>
                </div>
                <p class="product-description">{{ product.condition }} <span>·</span> {{ product.category }}</p>
                <p v-if="product.brand || product.color" class="product-description product-meta">
                  {{ [product.brand, product.color].filter(Boolean).join(' · ') }}
                </p>
                <div class="purchase-row">
                  <p class="product-price">₱{{ product.price.toLocaleString('en-PH') }}</p>
                  <button v-if="!isStaff" class="buy-button" type="button" @click="addToCart(product)">
                    Add to bag
                  </button>
                </div>
              </div>
            </article>
          </div>
          <div v-else class="empty-state">
            <span class="empty-icon"><ion-icon :icon="searchOutline" /></span>
            <h3>{{ isFirebaseConfigured ? 'No finds this time.' : 'The shop is getting ready.' }}</h3>
            <p>
              {{
                isFirebaseConfigured
                  ? 'Try a different search or pick another category.'
                  : 'Items added by staff will appear here.'
              }}
            </p>
            <button type="button" @click="clearFilters">See everything</button>
          </div>
        </section>

        <section
          v-if="showOrders && canShop"
          id="orders-section"
          class="orders-section"
          aria-labelledby="orders-heading"
        >
          <div class="section-heading">
            <div>
              <p class="eyebrow">FROM CHECKOUT TO YOUR DOOR</p>
              <h2 id="orders-heading">My orders<span class="brand-period">.</span></h2>
            </div>
          </div>
          <p v-if="orderNotice" class="order-notice" role="status">{{ orderNotice }}</p>
          <article v-for="order in customerOrders" :key="order.id" class="customer-order">
            <img :src="order.item.image" :alt="order.item.name" />
            <div class="customer-order-info">
              <span class="order-status" :class="order.status">{{ orderStatus(order.status) }}</span>
              <h3>
                {{ order.item.name }} <small>· Size {{ order.item.size }}</small>
              </h3>
              <p>{{ order.address }}</p>
              <strong>₱{{ order.total.toLocaleString('en-PH') }} · Cash on delivery</strong>
              <div v-if="order.status !== 'cancelled'" class="order-progress" aria-label="Order progress">
                <div
                  v-for="(step, index) in orderProgressSteps"
                  :key="step"
                  class="order-progress-step"
                  :class="{
                    complete: index <= orderProgressIndex(order.status),
                    current: index === orderProgressIndex(order.status),
                  }"
                >
                  <span class="progress-dot"></span>
                  <span>{{ step }}</span>
                </div>
              </div>
            </div>
            <button
              v-if="session.profile?.role === 'customer' && order.status === 'pending'"
              class="cancel-button"
              type="button"
              @click="cancelCustomerOrder(order.id)"
            >
              Cancel order
            </button>
          </article>
          <p v-if="!customerOrders.length" class="no-orders">Your orders will show up here.</p>
        </section>

        <footer class="store-footer">
          <a class="wordmark footer-wordmark" href="/home">
            <span class="brand-mark">t</span>
            <span>triftmark<span class="brand-period">.</span></span>
          </a>
          <p>Good clothes deserve another go.</p>
          <span>Cash on delivery · Staff-handled delivery</span>
        </footer>

        <div v-if="selectedProducts.length || checkoutComplete" class="modal-backdrop" @click.self="closeCheckout">
          <section class="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-heading">
            <button class="close-button modal-close" type="button" aria-label="Close checkout" @click="closeCheckout">
              ×
            </button>
            <template v-if="checkoutComplete">
              <p class="eyebrow">ORDER CONFIRMED</p>
              <h2 id="checkout-heading">Order placed successfully<span class="brand-period">.</span></h2>
              <div class="order-success">
                <span class="success-mark" aria-hidden="true">✓</span>
                <p>Your order has been recorded. Pay by cash when your delivery arrives.</p>
              </div>
              <button class="primary-button" type="button" @click="viewOrdersAfterCheckout">Track your order</button>
            </template>
            <template v-else>
              <p class="eyebrow">{{ checkoutStep === 'details' ? 'DELIVERY DETAILS' : 'CHECK YOUR ORDER' }}</p>
              <h2 id="checkout-heading">
                {{ checkoutStep === 'details' ? 'Almost yours.' : 'Ready to order.'
                }}<span class="brand-period">.</span>
              </h2>
              <div class="checkout-items">
                <div v-for="product in selectedProducts" :key="product.id" class="checkout-item">
                  <img :src="product.image" :alt="product.name" />
                  <div>
                    <strong>{{ product.name }}</strong>
                    <span>Size {{ product.size }}</span>
                    <b>₱{{ product.price.toLocaleString('en-PH') }}</b>
                  </div>
                </div>
              </div>
              <div class="cart-total checkout-total">
                <strong>{{ selectedProducts.length }} {{ selectedProducts.length === 1 ? 'item' : 'items' }}</strong>
                <strong>₱{{ selectedTotal.toLocaleString('en-PH') }}</strong>
              </div>
              <form v-if="checkoutStep === 'details'" class="checkout-form" @submit.prevent="reviewCheckout">
                <label>
                  Your name
                  <input v-model="checkoutName" autocomplete="name" minlength="2" maxlength="100" required />
                </label>
                <label>
                  Mobile number
                  <input
                    v-model="checkoutPhone"
                    type="tel"
                    autocomplete="tel"
                    inputmode="tel"
                    minlength="7"
                    maxlength="20"
                    required
                  />
                </label>
                <label>
                  Delivery address
                  <textarea
                    v-model="checkoutAddress"
                    autocomplete="street-address"
                    minlength="8"
                    maxlength="500"
                    rows="3"
                    required
                  ></textarea>
                </label>
                <fieldset class="payment-options">
                  <legend>Payment method</legend>
                  <label class="payment-option">
                    <input v-model="paymentMethod" type="radio" value="cash_on_delivery" required />
                    <span>
                      <strong>Cash on delivery</strong>
                      <small>Pay in cash when your order arrives.</small>
                    </span>
                  </label>
                </fieldset>
                <p v-if="checkoutError" class="form-error" role="alert">{{ checkoutError }}</p>
                <button class="primary-button" type="submit">Review order</button>
              </form>
              <div v-else class="checkout-review">
                <dl>
                  <div>
                    <dt>Name</dt>
                    <dd>{{ checkoutName.trim() }}</dd>
                  </div>
                  <div>
                    <dt>Mobile</dt>
                    <dd>{{ checkoutPhone.trim() }}</dd>
                  </div>
                  <div>
                    <dt>Deliver to</dt>
                    <dd>{{ checkoutAddress.trim() }}</dd>
                  </div>
                  <div>
                    <dt>Payment</dt>
                    <dd>Cash on delivery</dd>
                  </div>
                </dl>
                <p v-if="checkoutError" class="form-error" role="alert">{{ checkoutError }}</p>
                <button class="primary-button" type="button" :disabled="checkoutBusy" @click="placeOrder">
                  {{ checkoutBusy ? 'Placing order…' : 'Confirm and place order' }}
                </button>
                <button class="back-button" type="button" :disabled="checkoutBusy" @click="checkoutStep = 'details'">
                  Edit details
                </button>
              </div>
            </template>
          </section>
        </div>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { IonContent, IonIcon, IonPage } from '@ionic/vue';
import { useRoute, useRouter } from 'vue-router';
import {
  bagHandleOutline,
  checkmarkDoneOutline,
  clipboardOutline,
  closeCircleOutline,
  heart,
  heartOutline,
  receiptOutline,
  searchOutline,
} from 'ionicons/icons';

import { isFirebaseConfigured, authReady, session, signOutUser, signIn, registerCustomer } from '../firebase';
import { products as sampleProducts } from '../data/products';
import {
  applyForSeller,
  cancelOrder,
  placeCashOrder,
  registerInvitedStaff as acceptStaffInvitation,
  watchAvailableProducts,
  watchOrders,
} from '../services/marketplace';
import type { Product, ProductCategory, OrderStatus, StoreOrder } from '../types/marketplace';

const categories: Array<'Everything' | ProductCategory> = [
  'Everything',
  'Tops',
  'Bottoms',
  'Outerwear',
  'Accessories',
  'Shoes',
  'Home',
];
const router = useRouter();
const route = useRoute();
const searchQuery = ref('');
const selectedCategory = ref<(typeof categories)[number]>('Everything');
const selectedSize = ref('');
const selectedCondition = ref('');
const selectedBrand = ref('');
const selectedColor = ref('');
const minimumPrice = ref<number | null>(null);
const maximumPrice = ref<number | null>(null);
const products = ref<Product[]>([]);
const customerOrders = ref<StoreOrder[]>([]);
const showOrders = ref(false);
const showFavoritesOnly = ref(false);
const checkoutComplete = ref(false);
const checkoutSignInRequired = ref(false);
const orderNotice = ref('');
const cartError = ref('');
const cart = ref<Product[]>(readStoredProducts('triftmark-cart'));
const favoriteIds = ref<string[]>(readStoredIds('triftmark-wishlist'));
const authOpen = ref(false);
const sellerApplyOpen = ref(false);
const sellerDescription = ref('');
const sellerError = ref('');
const sellerBusy = ref(false);
const authMode = ref<'signin' | 'customer' | 'staff'>('signin');
const authEmail = ref('');
const authPassword = ref('');
const authName = ref('');
const authError = ref('');
const authNotice = ref('');
const authBusy = ref(false);
const storeError = ref('');
const selectedProducts = ref<Product[]>([]);
const checkoutName = ref('');
const checkoutPhone = ref('');
const checkoutAddress = ref('');
const checkoutError = ref('');
const checkoutBusy = ref(false);
const checkoutStep = ref<'details' | 'review'>('details');
const paymentMethod = ref<'' | 'cash_on_delivery'>('');
const orderProgressSteps = ['Order placed', 'Delivery assigned', 'Delivered'];
let unsubscribeProducts: (() => void) | undefined;
let unsubscribeOrders: (() => void)[] = [];

const demoProducts: Product[] = sampleProducts.map((product) => ({
  ...product,
  description: 'A carefully selected pre-loved find.',
  status: 'active',
  staffId: 'preview',
}));

const filteredProducts = computed(() => {
  const source = isFirebaseConfigured ? products.value : demoProducts;
  const query = searchQuery.value.trim().toLocaleLowerCase();
  return source.filter((product) => {
    const matchesCategory = selectedCategory.value === 'Everything' || product.category === selectedCategory.value;
    const searchable =
      `${product.name} ${product.category} ${product.condition} ${product.size} ${product.description}`.toLocaleLowerCase();
    const matchesPrice =
      (minimumPrice.value === null || product.price >= minimumPrice.value) &&
      (maximumPrice.value === null || product.price <= maximumPrice.value);
    return (
      matchesCategory &&
      (!query || searchable.includes(query)) &&
      (!selectedSize.value || product.size.toLocaleLowerCase() === selectedSize.value.toLocaleLowerCase()) &&
      (!selectedCondition.value || product.condition === selectedCondition.value) &&
      (!selectedBrand.value ||
        product.brand?.toLocaleLowerCase().includes(selectedBrand.value.trim().toLocaleLowerCase())) &&
      (!selectedColor.value ||
        product.color?.toLocaleLowerCase().includes(selectedColor.value.trim().toLocaleLowerCase())) &&
      (!showFavoritesOnly.value || favoriteIds.value.includes(product.id)) &&
      matchesPrice
    );
  });
});
const canShop = computed(() => session.profile?.role === 'customer' || session.profile?.role === 'seller');
const isStaff = computed(() => session.profile?.role === 'staff');
const availableSizes = computed(() =>
  [...new Set((isFirebaseConfigured ? products.value : demoProducts).map((product) => product.size))].sort(),
);
const availableConditions = computed(() =>
  [...new Set((isFirebaseConfigured ? products.value : demoProducts).map((product) => product.condition))].sort(),
);
const selectedTotal = computed(() => selectedProducts.value.reduce((sum, product) => sum + product.price, 0));

watch(
  () => route.query.checkout,
  async (checkout) => {
    if (checkout !== '1') return;
    await router.replace({ name: 'Home' });
    checkoutCart();
  },
  { immediate: true },
);

watch(
  cart,
  (items) => {
    try {
      localStorage.setItem('triftmark-cart', JSON.stringify(items));
    } catch (error) {
      cartError.value =
        error instanceof Error ? `Could not save your bag: ${error.message}` : 'Could not save your bag.';
    }
  },
  { deep: true },
);

watch(
  favoriteIds,
  (ids) => {
    try {
      localStorage.setItem('triftmark-wishlist', JSON.stringify(ids));
    } catch (error) {
      storeError.value =
        error instanceof Error ? `Could not save your wishlist: ${error.message}` : 'Could not save your wishlist.';
    }
  },
  { deep: true },
);

onMounted(async () => {
  await authReady;
  if (isFirebaseConfigured) {
    unsubscribeProducts = watchAvailableProducts(
      (value) => {
        products.value = value;
        storeError.value = '';
      },
      (error) => {
        console.error('Failed to load available products.', error);
        storeError.value = error.message.includes('requires an index')
          ? 'Products are temporarily unavailable. Please try again later.'
          : error.message;
      },
    );
  }
});

watch(
  () => [session.user?.uid, session.profile?.role] as const,
  ([uid, role]) => {
    unsubscribeOrders.forEach((unsubscribe) => unsubscribe());
    unsubscribeOrders = [];
    customerOrders.value = [];
    if (uid && (role === 'customer' || role === 'seller')) {
      unsubscribeOrders = watchOrders(
        role,
        uid,
        (value) => (customerOrders.value = value),
        (error) => (storeError.value = error.message),
      );
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  unsubscribeProducts?.();
  unsubscribeOrders.forEach((unsubscribe) => unsubscribe());
});

function openAuth(mode: 'signin' | 'customer' | 'staff') {
  authMode.value = mode;
  authError.value = '';
  authNotice.value = '';
  authOpen.value = true;
}

function closeAuth() {
  authOpen.value = false;
  checkoutSignInRequired.value = false;
}

function openSellerApplication() {
  if (!session.user || session.profile?.role !== 'customer') return;
  sellerError.value = '';
  sellerApplyOpen.value = true;
}

async function submitSellerApplication() {
  sellerError.value = '';
  sellerBusy.value = true;
  try {
    await applyForSeller(sellerDescription.value);
    sellerApplyOpen.value = false;
    sellerDescription.value = '';
    authNotice.value = 'Seller application submitted. An admin will review it soon.';
  } catch (reason) {
    sellerError.value = reason instanceof Error ? reason.message : 'Could not submit your seller application.';
  } finally {
    sellerBusy.value = false;
  }
}

async function submitAuth() {
  authError.value = '';
  authNotice.value = '';
  authBusy.value = true;
  try {
    if (authMode.value === 'signin') {
      await signIn(authEmail.value, authPassword.value);
    } else if (authMode.value === 'customer') {
      await registerCustomer(authEmail.value, authPassword.value, authName.value);
    } else {
      await acceptStaffInvitation(authEmail.value, authPassword.value, authName.value);
    }

    if (session.user && !session.profile) {
      authError.value = 'Your account has no assigned role. Ask an admin to finish setting it up.';
      return;
    }
    if (checkoutSignInRequired.value && !canShop.value) {
      checkoutSignInRequired.value = false;
      authOpen.value = false;
      authPassword.value = '';
      authNotice.value = 'A customer account is required to place an order.';
      return;
    }
    const resumeCheckout = checkoutSignInRequired.value;
    checkoutSignInRequired.value = false;
    authOpen.value = false;
    authPassword.value = '';
    authNotice.value = `Signed in${session.profile?.displayName ? ` as ${session.profile.displayName}` : ''}.`;
    if (resumeCheckout) checkoutCart();
  } catch (reason) {
    authError.value = reason instanceof Error ? reason.message : 'Could not complete sign in.';
  } finally {
    authBusy.value = false;
  }
}

async function addToCart(product: Product) {
  if (isStaff.value) return;
  cartError.value = '';
  if (!cart.value.some((item) => item.id === product.id)) {
    if (cart.value.length >= 10) {
      cartError.value = 'Your bag can hold up to 10 one-of-a-kind items at a time.';
      return;
    }
    cart.value = [...cart.value, product];
  }
  await nextTick();
  if (cartError.value) return;
  await router.push({ name: 'Bag' });
}

function openBag() {
  if (!isStaff.value) void router.push({ name: 'Bag' });
}

function toggleFavorite(productId: string) {
  favoriteIds.value = favoriteIds.value.includes(productId)
    ? favoriteIds.value.filter((id) => id !== productId)
    : [...favoriteIds.value, productId];
}

function checkoutCart() {
  if (isStaff.value) return;
  if (!isFirebaseConfigured) {
    authNotice.value = 'Preview only — connect Firebase to place real orders.';
    return;
  }
  if (!canShop.value) {
    checkoutSignInRequired.value = true;
    openAuth('signin');
    return;
  }
  const profile = session.profile;
  if (!profile) return;
  checkoutError.value = '';
  checkoutName.value = profile.displayName;
  checkoutPhone.value = profile.phone ?? '';
  checkoutAddress.value = profile.address ?? '';
  checkoutStep.value = 'details';
  paymentMethod.value = '';
  checkoutError.value = '';
  selectedProducts.value = [...cart.value];
}

function reviewCheckout() {
  checkoutError.value = '';
  if (checkoutName.value.trim().length < 2) {
    checkoutError.value = 'Enter your full name.';
    return;
  }
  const phoneDigits = checkoutPhone.value.replace(/\D/g, '');
  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    checkoutError.value = 'Enter a valid mobile number with 7 to 15 digits.';
    return;
  }
  if (checkoutAddress.value.trim().length < 8) {
    checkoutError.value = 'Enter a complete delivery address (at least 8 characters).';
    return;
  }
  if (paymentMethod.value !== 'cash_on_delivery') {
    checkoutError.value = 'Select Cash on delivery to continue.';
    return;
  }
  checkoutStep.value = 'review';
}

async function placeOrder() {
  if (!selectedProducts.value.length) return;
  if (checkoutStep.value !== 'review' || paymentMethod.value !== 'cash_on_delivery') {
    checkoutError.value = 'Review your delivery details and select Cash on delivery first.';
    checkoutStep.value = 'details';
    return;
  }
  checkoutError.value = '';
  checkoutBusy.value = true;
  try {
    await placeCashOrder({
      products: selectedProducts.value,
      buyerName: checkoutName.value,
      phone: checkoutPhone.value,
      address: checkoutAddress.value,
    });
    const orderedIds = new Set(selectedProducts.value.map((product) => product.id));
    cart.value = cart.value.filter((product) => !orderedIds.has(product.id));
    selectedProducts.value = [];
    checkoutComplete.value = true;
    showOrders.value = true;
    checkoutStep.value = 'details';
    paymentMethod.value = '';
    orderNotice.value = 'Your order is placed. Track its progress here as staff accepts and delivers it.';
    authNotice.value = '';
    await nextTick();
    document.getElementById('orders-heading')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  } catch (reason) {
    checkoutError.value = reason instanceof Error ? reason.message : 'Could not place this order.';
  } finally {
    checkoutBusy.value = false;
  }
}

function closeCheckout() {
  checkoutComplete.value = false;
  selectedProducts.value = [];
  checkoutStep.value = 'details';
  paymentMethod.value = '';
  checkoutError.value = '';
}

async function viewOrdersAfterCheckout() {
  checkoutComplete.value = false;
  await nextTick();
  document.getElementById('orders-heading')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
}

async function cancelCustomerOrder(orderId: string) {
  storeError.value = '';
  try {
    await cancelOrder(orderId);
  } catch (reason) {
    storeError.value = reason instanceof Error ? reason.message : 'Could not cancel this order.';
  }
}

async function logout() {
  storeError.value = '';
  try {
    await signOutUser();
    authNotice.value = 'You have signed out.';
    showOrders.value = false;
  } catch (reason) {
    storeError.value = reason instanceof Error ? reason.message : 'Could not sign out.';
  }
}

async function toggleOrders() {
  showOrders.value = !showOrders.value;
  if (showOrders.value) {
    await nextTick();
    document.getElementById('orders-heading')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }
}

function clearFilters() {
  searchQuery.value = '';
  selectedCategory.value = 'Everything';
  selectedSize.value = '';
  selectedCondition.value = '';
  selectedBrand.value = '';
  selectedColor.value = '';
  minimumPrice.value = null;
  maximumPrice.value = null;
  showFavoritesOnly.value = false;
}

function orderStatus(status: OrderStatus) {
  return {
    pending: 'Order received · waiting for staff',
    claimed: 'Out for delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  }[status];
}

function orderProgressIndex(status: OrderStatus): number {
  return { pending: 0, claimed: 1, delivered: 2, cancelled: -1 }[status];
}

function readStoredProducts(key: string): Product[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? value.filter(isStoredProduct) : [];
  } catch (error) {
    console.error(`Could not load saved products for ${key}.`, error);
    return [];
  }
}

function readStoredIds(key: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch (error) {
    console.error(`Could not load saved IDs for ${key}.`, error);
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
    typeof product.category === 'string' &&
    typeof product.condition === 'string' &&
    typeof product.status === 'string' &&
    typeof product.staffId === 'string'
  );
}
</script>

<style scoped>
.storefront {
  --ink: #20352c;
  --muted: #788078;
  --green: #355f49;
  --line: #e7e7df;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 64px;
  color: var(--ink);
}

.topbar {
  min-height: 82px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-bottom: 1px solid var(--line);
}

.wordmark {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 9px;
  color: var(--ink);
  font-size: 21px;
  font-weight: 750;
  letter-spacing: -1.1px;
  text-decoration: none;
}

.brand-mark {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 10px 10px 10px 3px;
  background: var(--green);
  color: white;
  font-family: Georgia, serif;
  font-size: 23px;
  font-weight: 700;
  font-style: italic;
  line-height: 1;
}

.brand-period {
  color: #b0774f;
}

.topbar-note,
.item-count {
  color: var(--muted);
  font-size: 13px;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.account-button,
.workspace-link {
  border: 0;
  background: transparent;
  color: var(--green);
  font: inherit;
  font-size: 12px;
  text-decoration: none;
}

.intro {
  min-height: 355px;
  display: grid;
  grid-template-columns: 1fr 0.78fr;
  align-items: center;
  gap: 60px;
  padding: 42px 0 48px;
}

.eyebrow {
  margin: 0;
  color: #747a6f;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 1.65px;
}

.intro-copy .eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
}

.eyebrow-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #b8794e;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

h1 {
  margin: 19px 0 15px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(43px, 5.2vw, 68px);
  font-weight: 400;
  letter-spacing: -2.9px;
  line-height: 0.99;
}

h1 span {
  color: var(--green);
  font-style: italic;
}

.intro-description {
  max-width: 380px;
  margin-bottom: 0;
  color: #73796f;
  font-size: 14px;
  line-height: 1.7;
}

.intro-art {
  position: relative;
  height: 265px;
  overflow: hidden;
  border-radius: 5px 78px 5px 5px;
  background: #e7e4d8;
}

.sun-shape {
  position: absolute;
  top: 25px;
  right: 32px;
  width: 115px;
  height: 115px;
  border-radius: 50%;
  background: #e8c28c;
}

.hero-image {
  position: absolute;
  right: 15%;
  bottom: -41%;
  width: 57%;
  height: 135%;
  border-radius: 48% 48% 0 0;
  object-fit: cover;
  object-position: center 38%;
  mix-blend-mode: multiply;
}

.art-caption {
  position: absolute;
  z-index: 1;
  top: 34px;
  left: 28px;
  color: var(--green);
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 1.3px;
  line-height: 1.7;
}

.art-star {
  position: absolute;
  z-index: 1;
  color: #a76e48;
}

.star-one {
  top: 84px;
  left: 42%;
  font-size: 21px;
}

.star-two {
  right: 13%;
  bottom: 42px;
  font-size: 15px;
}

.art-squiggle {
  position: absolute;
  top: 65px;
  right: 20%;
  z-index: 1;
  color: #71806a;
  font-size: 31px;
}

.setup-notice {
  margin: 0 0 15px;
  padding: 12px 15px;
  border: 1px solid #e8e4d7;
  border-radius: 4px;
  background: #f2f0e7;
  color: #5a5c4c;
  font-size: 12px;
  line-height: 1.6;
}

.setup-notice.error {
  border-color: #efd8d2;
  background: #f7e9e6;
  color: #9c3d31;
}

.auth-panel {
  width: min(100%, 470px);
  max-height: calc(100dvh - 40px);
  overflow-y: auto;
  padding: 30px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fbfaf6;
  box-shadow: 0 24px 80px rgba(20, 34, 26, 0.24);
}

.auth-backdrop {
  position: fixed;
  z-index: 20;
  inset: 0;
  display: grid;
  place-items: center;
  overflow-y: auto;
  padding: 20px;
  background: rgba(18, 30, 24, 0.62);
  backdrop-filter: blur(4px);
}

.cart-total {
  display: flex;
  justify-content: space-between;
  margin: 16px 0;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  font-size: 13px;
}

.cart-trigger {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.cart-trigger span {
  display: inline-grid;
  min-width: 17px;
  height: 17px;
  place-items: center;
  border-radius: 50%;
  background: var(--green);
  color: white;
  font-size: 9px;
}

.auth-heading,
.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 15px;
}

.auth-heading {
  align-items: start;
}

.auth-heading .eyebrow {
  margin-bottom: 8px;
}

.auth-heading h2 {
  margin-bottom: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 31px;
  font-weight: 400;
}

.auth-heading .auth-help {
  margin: 9px 0 0;
  line-height: 1.5;
}

.close-button {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: transparent;
  color: var(--ink);
  font-size: 21px;
}

.auth-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 22px 0;
}

.auth-tabs button {
  min-height: 36px;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: transparent;
  color: #6b736b;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.auth-tabs button.active {
  border-color: var(--green);
  background: var(--green);
  color: #fff;
}

.auth-form,
.checkout-form {
  display: grid;
  gap: 12px;
}

.auth-form label,
.checkout-form label {
  display: grid;
  gap: 6px;
  color: #566157;
  font-size: 12px;
}

.auth-form input,
.checkout-form input,
.checkout-form textarea {
  width: 100%;
  min-height: 42px;
  padding: 10px 11px;
  border: 1px solid #dedfd7;
  border-radius: 3px;
  background: #fff;
  color: var(--ink);
  font: inherit;
  font-size: 13px;
}

.checkout-form textarea {
  resize: vertical;
}

.payment-options {
  display: grid;
  gap: 9px;
  margin: 2px 0;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 4px;
}

.payment-options legend {
  padding: 0 4px;
  color: #566157;
  font-size: 12px;
  font-weight: 650;
}

.payment-options .payment-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 4px;
}

.payment-option input {
  width: 16px;
  min-height: 16px;
  flex: 0 0 auto;
  margin: 2px 0 0;
  accent-color: var(--green);
}

.payment-option span {
  display: grid;
  gap: 4px;
}

.payment-option small {
  color: var(--muted);
  font-size: 11px;
  font-weight: 400;
}

.checkout-review {
  display: grid;
  gap: 12px;
}

.checkout-review dl {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 15px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: #fff;
}

.checkout-review dl div {
  display: grid;
  gap: 3px;
}

.checkout-review dt {
  color: var(--muted);
  font-size: 11px;
}

.checkout-review dd {
  margin: 0;
  color: var(--ink);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.back-button {
  min-height: 40px;
  border: 1px solid var(--line);
  border-radius: 3px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 12px;
}

.order-success {
  display: grid;
  justify-items: center;
  gap: 12px;
  margin: 20px 0;
  padding: 22px 18px;
  border: 1px solid #dce8dc;
  border-radius: 6px;
  background: #edf4ed;
  text-align: center;
}

.success-mark {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 50%;
  background: var(--green);
  color: #fff;
  font-size: 25px;
}

.order-success p {
  margin: 0;
  color: var(--ink);
  font-size: 13px;
  line-height: 1.5;
}

.primary-button {
  min-height: 44px;
  padding: 0 16px;
  border: 0;
  border-radius: 3px;
  background: var(--green);
  color: white;
  font: inherit;
  font-size: 13px;
}

.primary-button:disabled {
  opacity: 0.6;
}

.form-error {
  margin: 0;
  color: #9c3d31;
  font-size: 12px;
  line-height: 1.5;
}

.auth-help {
  margin: 12px 0 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.5;
}

.finds-section {
  padding: 13px 0 55px;
}

.section-heading {
  margin-bottom: 22px;
}

.section-heading .eyebrow {
  margin-bottom: 8px;
}

h2 {
  margin-bottom: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 34px;
  font-weight: 400;
  letter-spacing: -1px;
}

.item-count {
  margin-bottom: 4px;
}

.search-box {
  display: flex;
  height: 50px;
  align-items: center;
  gap: 12px;
  padding: 0 15px;
  border: 1px solid #e5e5dd;
  border-radius: 4px;
  background: #fff;
  color: #858b82;
}

.search-box > ion-icon {
  flex: 0 0 auto;
  font-size: 19px;
}

.search-box input {
  width: 100%;
  height: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 13px;
}

.search-box input::placeholder {
  color: #999e96;
}

.filter-options {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.filter-options label {
  display: grid;
  min-width: 0;
  gap: 5px;
  color: #73796f;
  font-size: 10px;
}

.filter-options input,
.filter-options select,
.auth-form textarea {
  width: 100%;
  min-width: 0;
  min-height: 38px;
  padding: 8px 9px;
  border: 1px solid #e5e5dd;
  border-radius: 3px;
  background: #fff;
  color: var(--ink);
  font: inherit;
  font-size: 11px;
}

.auth-form textarea {
  resize: vertical;
  font-size: 13px;
}

.seller-pending {
  color: #906b35;
  font-size: 11px;
}

.clear-search {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  place-items: center;
  border: 0;
  background: transparent;
  color: #858b82;
  font-size: 19px;
}

.filter-row {
  display: flex;
  gap: 8px;
  margin: 16px 0 25px;
  overflow-x: auto;
  scrollbar-width: none;
}

.filter-row::-webkit-scrollbar {
  display: none;
}

.filter-chip {
  flex: 0 0 auto;
  padding: 9px 15px;
  border: 1px solid #e5e5dd;
  border-radius: 3px;
  background: transparent;
  color: #72786f;
  font: inherit;
  font-size: 12px;
}

.filter-chip.active {
  border-color: var(--green);
  background: var(--green);
  color: white;
}

.wishlist-toggle-row {
  display: flex;
  justify-content: flex-end;
  margin: -10px 0 16px;
}

.wishlist-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  color: var(--green);
  font: inherit;
  font-size: 11px;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 34px 20px;
}

.product-card {
  min-width: 0;
}

.product-photo {
  position: relative;
  aspect-ratio: 0.91;
  overflow: hidden;
  background: #eeece5;
}

.product-photo > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 300ms ease;
}

.product-card:hover .product-photo > img {
  transform: scale(1.035);
}

.product-tag {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 6px 8px;
  background: rgba(248, 247, 242, 0.95);
  color: var(--green);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.55px;
  text-transform: uppercase;
}

.favorite-button {
  position: absolute;
  top: 10px;
  right: 10px;
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: rgba(248, 247, 242, 0.95);
  color: #47574c;
  font-size: 18px;
}

.favorite-button[aria-pressed='true'] {
  color: #a74b43;
}

.product-details {
  padding: 12px 1px 0;
}

.product-name-row,
.purchase-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.product-name-row h3 {
  overflow: hidden;
  margin-bottom: 5px;
  font-size: 13px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-size {
  flex: 0 0 auto;
  color: var(--muted);
  font-size: 11px;
}

.product-description {
  margin-bottom: 8px;
  color: var(--muted);
  font-size: 11px;
}

.product-description span {
  padding: 0 3px;
}

.product-meta {
  margin-top: -3px;
}

.product-price {
  margin-bottom: 0;
  color: var(--green);
  font-size: 13px;
  font-weight: 750;
}

.buy-button {
  padding: 7px 10px;
  border: 1px solid var(--green);
  border-radius: 3px;
  background: transparent;
  color: var(--green);
  font: inherit;
  font-size: 10px;
}

.buy-button.secondary {
  background: var(--green);
  color: #fff;
}

.empty-state {
  display: flex;
  min-height: 250px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.empty-icon {
  display: grid;
  width: 42px;
  height: 42px;
  margin-bottom: 13px;
  place-items: center;
  border-radius: 50%;
  background: #eeeee7;
  color: var(--green);
  font-size: 20px;
}

.empty-state h3 {
  margin-bottom: 6px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 22px;
  font-weight: 400;
}

.empty-state p,
.no-orders {
  margin-bottom: 15px;
  color: var(--muted);
  font-size: 13px;
}

.empty-state button,
.cancel-button {
  padding: 9px 14px;
  border: 1px solid var(--green);
  border-radius: 3px;
  background: transparent;
  color: var(--green);
  font: inherit;
  font-size: 12px;
}

.orders-section {
  padding: 25px 0 55px;
  border-top: 1px solid var(--line);
}

.order-notice {
  margin: 0 0 16px;
  padding: 12px 14px;
  border: 1px solid #dce8dc;
  border-radius: 4px;
  background: #edf4ed;
  color: var(--green);
  font-size: 13px;
  line-height: 1.5;
}

.customer-order {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
  padding: 13px;
  border: 1px solid var(--line);
  background: #fff;
}

.customer-order > img {
  width: 68px;
  height: 78px;
  flex: 0 0 auto;
  object-fit: cover;
}

.customer-order-info {
  flex: 1;
}

.customer-order-info h3 {
  margin: 7px 0 4px;
  font-size: 13px;
}

.customer-order-info small {
  color: var(--muted);
  font-weight: 400;
}

.customer-order-info p {
  margin: 3px 0;
  color: var(--muted);
  font-size: 11px;
}

.customer-order-info strong {
  display: block;
  margin-top: 6px;
  color: var(--green);
  font-size: 12px;
}

.order-progress {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
  margin-top: 14px;
}

.order-progress-step {
  display: grid;
  justify-items: start;
  gap: 6px;
  color: #9a9f98;
  font-size: 10px;
}

.progress-dot {
  width: 9px;
  height: 9px;
  border: 2px solid #d5d9d2;
  border-radius: 50%;
  background: #fff;
}

.order-progress-step.complete {
  color: var(--green);
}

.order-progress-step.complete .progress-dot {
  border-color: var(--green);
  background: var(--green);
}

.order-status {
  display: inline-block;
  padding: 5px 8px;
  border-radius: 20px;
  background: #edf2eb;
  color: var(--green);
  font-size: 10px;
}

.order-status.claimed {
  background: #f5efe5;
  color: #906b35;
}

.order-status.cancelled {
  background: #f5ece8;
  color: #905b49;
}

.store-footer {
  display: flex;
  min-height: 92px;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  border-top: 1px solid var(--line);
}

.footer-wordmark {
  font-size: 17px;
}

.footer-wordmark .brand-mark {
  width: 25px;
  height: 25px;
  border-radius: 8px 8px 8px 3px;
  font-size: 19px;
}

.store-footer p,
.store-footer > span {
  margin-bottom: 0;
  color: var(--muted);
  font-size: 11px;
}

.modal-backdrop {
  position: fixed;
  z-index: 10;
  inset: 0;
  display: grid;
  place-items: center;
  overflow-y: auto;
  padding: 20px;
  background: rgba(23, 35, 29, 0.48);
}

.checkout-modal {
  position: relative;
  width: min(100%, 470px);
  max-height: calc(100dvh - 40px);
  overflow-y: auto;
  padding: 28px;
  border-radius: 5px;
  background: #f8f7f2;
}

.checkout-modal > .eyebrow {
  margin-bottom: 8px;
}

.checkout-modal h2 {
  margin-bottom: 18px;
  font-size: 30px;
}

.modal-close {
  position: absolute;
  top: 18px;
  right: 18px;
}

.checkout-item {
  display: flex;
  gap: 13px;
  margin-bottom: 18px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--line);
}

.checkout-items {
  max-height: 220px;
  overflow-y: auto;
}

.checkout-total {
  margin: 12px 0;
}

.checkout-item img {
  width: 67px;
  height: 75px;
  object-fit: cover;
}

.checkout-item div {
  display: grid;
  align-content: center;
  gap: 4px;
  font-size: 13px;
}

.checkout-item span {
  color: var(--muted);
  font-size: 11px;
}

.checkout-item b {
  color: var(--green);
}

@media (max-width: 850px) {
  .storefront {
    padding: 0 32px;
  }

  .intro {
    gap: 32px;
  }

  .product-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .storefront {
    padding: 0 20px;
  }

  .topbar {
    min-height: 66px;
  }

  .topbar-note {
    display: none;
  }

  .top-actions {
    gap: 8px;
  }

  .account-button,
  .workspace-link {
    font-size: 11px;
  }

  .intro {
    min-height: unset;
    grid-template-columns: 1fr;
    gap: 23px;
    padding: 38px 0 35px;
  }

  h1 {
    margin-top: 16px;
    font-size: clamp(46px, 12vw, 61px);
  }

  .intro-description {
    max-width: 340px;
    font-size: 13px;
  }

  .intro-art {
    height: 190px;
    border-top-right-radius: 58px;
  }

  .sun-shape {
    top: 18px;
    right: 25px;
    width: 93px;
    height: 93px;
  }

  .hero-image {
    right: 17%;
    bottom: -59%;
    width: 49%;
    height: 155%;
  }

  .finds-section {
    padding: 7px 0 42px;
  }

  .section-heading {
    margin-bottom: 17px;
  }

  h2 {
    font-size: 29px;
  }

  .item-count {
    font-size: 11px;
  }

  .filter-row {
    margin: 13px -20px 20px;
    padding: 0 20px;
  }

  .filter-options {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 27px 12px;
  }

  .product-photo {
    aspect-ratio: 0.82;
  }

  .product-name-row h3 {
    font-size: 12px;
  }

  .product-size,
  .product-description {
    font-size: 10px;
  }

  .buy-button {
    padding: 6px 7px;
  }

  .purchase-row {
    flex-wrap: wrap;
    align-items: center;
  }

  .purchase-row .product-price {
    flex: 1 0 100%;
  }

  .customer-order {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .customer-order-info {
    min-width: calc(100% - 85px);
  }

  .cancel-button {
    margin-left: 83px;
  }

  .store-footer {
    flex-wrap: wrap;
    justify-content: center;
    padding: 22px 0;
    text-align: center;
  }

  .store-footer p {
    order: 1;
    flex-basis: 100%;
  }

  .checkout-modal {
    padding: 24px 18px;
  }

  .auth-backdrop {
    padding: 14px;
  }

  .auth-panel {
    max-height: calc(100dvh - 28px);
    padding: 24px 20px;
  }

  .auth-heading h2 {
    font-size: 27px;
  }
}
</style>
