<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ isSeller ? 'Triftmark seller' : 'Triftmark staff' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button v-if="!isSeller" router-link="/staff/orders">
            <ion-icon :icon="receiptOutline" slot="start" />
            Customer orders
          </ion-button>
          <ion-button v-if="!isSeller" router-link="/staff/history">
            <ion-icon :icon="checkmarkDoneOutline" slot="start" />
            Delivered history
          </ion-button>
          <ion-button router-link="/home">Store</ion-button>
          <ion-button @click="logout">Sign out</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main class="dashboard">
        <p class="eyebrow">{{ isSeller ? 'SELLER WORKSPACE' : 'STAFF WORKSPACE' }}</p>
        <h1>{{ isSeller ? 'Your little shop.' : 'Make a good find.' }}<span>.</span></h1>
        <p class="lead">
          {{
            isSeller
              ? 'Manage your pre-loved listings and keep up with the orders they bring in.'
              : 'List one-of-a-kind pieces and take customer orders from pickup to doorstep.'
          }}
        </p>
        <p v-if="error" class="notice error" role="alert">{{ error }}</p>
        <p v-if="notice" class="notice success" role="status">{{ notice }}</p>

        <section v-if="isSeller" class="summary-grid" aria-label="Sales summary">
          <article class="summary-card">
            <span>Active listings</span>
            <strong>{{ products.filter((product) => product.status === 'active').length }}</strong>
          </article>
          <article class="summary-card">
            <span>Orders</span>
            <strong>{{ orders.length }}</strong>
          </article>
          <article class="summary-card">
            <span>Delivered sales</span>
            <strong>₱{{ completedSales.toLocaleString('en-PH') }}</strong>
          </article>
        </section>

        <section class="panel">
          <div class="section-title">
            <div>
              <p class="eyebrow">ADD TO THE SHOP</p>
              <h2>{{ editingProduct ? 'Update your listing' : 'List a pre-loved item' }}</h2>
            </div>
          </div>
          <form class="product-form" @submit.prevent="submitProduct">
            <label>
              Item name
              <input v-model="form.name" maxlength="80" placeholder="e.g. Linen day shirt" required />
            </label>
            <label>
              Category
              <select v-model="form.category">
                <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
              </select>
            </label>
            <label>
              Price (₱)
              <input v-model.number="form.price" type="number" min="1" step="1" required />
            </label>
            <label>
              Size
              <input v-model="form.size" maxlength="30" placeholder="M, 28, One size" required />
            </label>
            <label>
              Brand
              <input v-model="form.brand" maxlength="60" placeholder="Optional" />
            </label>
            <label>
              Color
              <input v-model="form.color" maxlength="40" placeholder="Optional" />
            </label>
            <label>
              Condition
              <select v-model="form.condition">
                <option>Like new</option>
                <option>Great condition</option>
                <option>Gently loved</option>
                <option>Well loved</option>
              </select>
            </label>
            <label class="wide">
              Photo URL (optional if you upload a photo)
              <input
                v-model="form.image"
                type="url"
                placeholder="Paste a direct image link (https://…)"
                @input="usePhotoUrl"
              />
            </label>
            <label class="wide">
              Or upload a photo
              <input :key="imageInputKey" type="file" accept="image/jpeg,image/png,image/webp" @change="selectImage" />
              <span class="field-help">JPG, PNG, or WebP · maximum 5 MB</span>
            </label>
            <div v-if="previewImage" class="photo-preview wide">
              <img
                v-if="!imagePreviewError"
                :src="previewImage"
                alt="Listing photo preview"
                @error="imagePreviewError = 'This image could not be loaded. Upload a photo or use a direct image URL.'"
                @load="imagePreviewError = ''"
              />
              <p v-else class="photo-preview-error">{{ imagePreviewError }}</p>
            </div>
            <label class="wide">
              Description
              <textarea
                v-model="form.description"
                maxlength="500"
                rows="3"
                placeholder="Describe the piece, fit, and any signs of wear."
                required
              ></textarea>
            </label>
            <button type="submit" :disabled="busy">
              {{ busy ? 'Saving…' : editingProduct ? 'Save changes' : 'Publish item' }}
            </button>
            <button v-if="editingProduct" class="cancel-edit" type="button" @click="cancelEdit">Cancel editing</button>
          </form>
        </section>

        <section class="panel">
          <div class="section-title">
            <div>
              <p class="eyebrow">YOUR LISTINGS</p>
              <h2>Items in the shop</h2>
            </div>
            <span class="count">{{ shopItems.length }} items</span>
          </div>
          <div v-if="shopItems.length" class="item-grid">
            <article v-for="product in shopItems" :key="product.id" class="item">
              <div class="item-photo">
                <img
                  v-if="!failedProductImageKeys.has(`${product.id}:${product.image}`)"
                  :key="product.image"
                  :src="product.image"
                  :alt="product.name"
                  @error="markProductImageUnavailable(product.id, product.image)"
                  @load="markProductImageAvailable(product.id, product.image)"
                />
                <span v-else>Photo unavailable</span>
                <span class="status item-status" :class="product.status">{{ product.status }}</span>
              </div>
              <div class="item-details">
                <div class="item-heading">
                  <h3>{{ product.name }}</h3>
                  <span class="item-size">Size {{ product.size }}</span>
                </div>
                <p>{{ product.condition }} · {{ product.category }}</p>
                <p v-if="product.brand || product.color">
                  {{ [product.brand, product.color].filter(Boolean).join(' · ') }}
                </p>
                <strong class="item-price">₱{{ product.price.toLocaleString('en-PH') }}</strong>
                <div class="item-actions">
                  <button
                    v-if="product.status === 'active'"
                    class="remove-listing"
                    type="button"
                    @click="startEdit(product)"
                  >
                    Edit listing
                  </button>
                  <button
                    v-if="product.status === 'active'"
                    class="remove-listing"
                    type="button"
                    @click="removeProduct(product)"
                  >
                    Remove listing
                  </button>
                </div>
              </div>
            </article>
          </div>
          <p v-else class="empty">No unsold listings right now. New listings will appear here.</p>
        </section>

        <section class="panel sold-panel">
          <div class="section-title">
            <div>
              <p class="eyebrow">SECOND STORIES</p>
              <h2>Sold items</h2>
            </div>
            <span class="count">{{ soldItems.length }} sold</span>
          </div>
          <div v-if="soldItems.length" class="item-grid">
            <article v-for="product in soldItems" :key="product.id" class="item sold-item">
              <div class="item-photo">
                <img
                  v-if="!failedProductImageKeys.has(`${product.id}:${product.image}`)"
                  :key="product.image"
                  :src="product.image"
                  :alt="product.name"
                  @error="markProductImageUnavailable(product.id, product.image)"
                  @load="markProductImageAvailable(product.id, product.image)"
                />
                <span v-else>Photo unavailable</span>
                <span class="status item-status sold">Sold</span>
              </div>
              <div class="item-details">
                <div class="item-heading">
                  <h3>{{ product.name }}</h3>
                  <span class="item-size">Size {{ product.size }}</span>
                </div>
                <p>{{ product.condition }} · {{ product.category }}</p>
                <p v-if="product.brand || product.color">
                  {{ [product.brand, product.color].filter(Boolean).join(' · ') }}
                </p>
                <strong class="item-price">₱{{ product.price.toLocaleString('en-PH') }}</strong>
              </div>
            </article>
          </div>
          <div v-else class="sold-empty">
            <span class="sold-empty-icon" aria-hidden="true">✓</span>
            <div>
              <strong>No sold items yet</strong>
              <p>Completed sales will be kept here as a record.</p>
            </div>
          </div>
        </section>

        <section v-if="isSeller" class="panel">
          <div class="section-title">
            <div>
              <p class="eyebrow">DELIVERY DESK</p>
              <h2>Customer orders</h2>
            </div>
            <span class="count">{{ displayedOrders.length }} orders</span>
          </div>
          <div v-if="displayedOrders.length" class="order-list">
            <article v-for="order in displayedOrders" :key="order.id" class="order">
              <img :src="order.item.image" :alt="order.item.name" />
              <div class="order-info">
                <span class="status" :class="order.status">{{ statusLabel(order.status) }}</span>
                <h3>
                  {{ order.item.name }} <small>· Size {{ order.item.size }}</small>
                </h3>
                <p>{{ order.buyerName }} · {{ order.phone }}</p>
                <p>{{ order.address }}</p>
                <strong>₱{{ order.total.toLocaleString('en-PH') }} · Cash on delivery</strong>
              </div>
            </article>
          </div>
          <p v-else class="empty">No customer orders yet. New orders will appear here.</p>
        </section>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar } from '@ionic/vue';
import { checkmarkDoneOutline, receiptOutline } from 'ionicons/icons';

import { session, signOutUser } from '../firebase';
import {
  archiveProduct,
  createProduct,
  updateProduct,
  uploadProductImage,
  watchOrders,
  watchStaffProducts,
} from '../services/marketplace';
import type { OrderStatus, Product, ProductCategory, StoreOrder } from '../types/marketplace';

const categories: ProductCategory[] = ['Tops', 'Bottoms', 'Outerwear', 'Accessories', 'Shoes', 'Home'];
const isSeller = session.profile?.role === 'seller';
const products = ref<Product[]>([]);
const orders = ref<StoreOrder[]>([]);
const busy = ref(false);
const editingProduct = ref<Product | null>(null);
const selectedImage = ref<File | null>(null);
const imagePreview = ref('');
const imagePreviewError = ref('');
const imageInputKey = ref(0);
const failedProductImageKeys = ref(new Set<string>());
const error = ref('');
const notice = ref('');
const unsubscribers: (() => void)[] = [];
const form = reactive({
  name: '',
  category: 'Tops' as ProductCategory,
  price: 250,
  size: '',
  condition: 'Great condition',
  image: '',
  brand: '',
  color: '',
  description: '',
});
const completedSales = computed(() =>
  orders.value.filter((order) => order.status === 'delivered').reduce((total, order) => total + order.total, 0),
);
const shopItems = computed(() => products.value.filter((product) => product.status !== 'sold'));
const soldItems = computed(() => products.value.filter((product) => product.status === 'sold'));
const displayedOrders = computed(() => orders.value);
const previewImage = computed(() => imagePreview.value || form.image.trim());

onMounted(() => {
  const staffId = session.user!.uid;
  const role = session.profile?.role;
  if (role !== 'seller' && role !== 'staff') {
    error.value = 'Sign in with an approved seller or staff account to access this workspace.';
    return;
  }
  unsubscribers.push(
    watchStaffProducts(
      staffId,
      (value) => (products.value = value),
      (reason) => (error.value = reason.message),
    ),
  );
  if (role === 'seller') {
    unsubscribers.push(
      ...watchOrders(
        role,
        staffId,
        (value) => (orders.value = value),
        (reason) => (error.value = reason.message),
      ),
    );
  }
});

onUnmounted(() => {
  unsubscribers.forEach((unsubscribe) => unsubscribe());
  clearSelectedImage();
});

async function submitProduct() {
  error.value = '';
  notice.value = '';
  if (!selectedImage.value && !form.image.trim()) {
    error.value = 'Add a photo URL or upload a photo before publishing.';
    return;
  }
  if (imagePreviewError.value) {
    error.value = 'Fix the listing photo before publishing.';
    return;
  }
  busy.value = true;
  try {
    const image = selectedImage.value ? await uploadProductImage(selectedImage.value) : form.image.trim();
    const listing = { ...form, image };
    if (editingProduct.value) {
      await updateProduct(editingProduct.value, listing);
      notice.value = 'Your listing has been updated.';
    } else {
      await createProduct(listing);
      notice.value = 'Your item is now in the shop.';
    }
    editingProduct.value = null;
    clearSelectedImage();
    Object.assign(form, {
      name: '',
      category: 'Tops',
      price: 250,
      size: '',
      condition: 'Great condition',
      image: '',
      brand: '',
      color: '',
      description: '',
    });
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not publish this item.';
  } finally {
    busy.value = false;
  }
}

function startEdit(product: Product) {
  clearSelectedImage();
  editingProduct.value = product;
  Object.assign(form, {
    name: product.name,
    category: product.category,
    price: product.price,
    size: product.size,
    condition: product.condition,
    image: product.image,
    brand: product.brand ?? '',
    color: product.color ?? '',
    description: product.description,
  });
  error.value = '';
  notice.value = '';
  document.querySelector('.product-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function cancelEdit() {
  editingProduct.value = null;
  clearSelectedImage();
  Object.assign(form, {
    name: '',
    category: 'Tops',
    price: 250,
    size: '',
    condition: 'Great condition',
    image: '',
    brand: '',
    color: '',
    description: '',
  });
}

function selectImage(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    error.value = 'Choose a JPG, PNG, or WebP image.';
    input.value = '';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'Choose an image smaller than 5 MB.';
    input.value = '';
    return;
  }
  clearSelectedImage();
  selectedImage.value = file;
  imagePreview.value = URL.createObjectURL(file);
  imagePreviewError.value = '';
  error.value = '';
}

function usePhotoUrl() {
  clearSelectedImage();
}

function clearSelectedImage() {
  if (imagePreview.value.startsWith('blob:')) URL.revokeObjectURL(imagePreview.value);
  selectedImage.value = null;
  imagePreview.value = '';
  imagePreviewError.value = '';
  imageInputKey.value += 1;
}

function markProductImageUnavailable(productId: string, imageUrl: string) {
  failedProductImageKeys.value = new Set(failedProductImageKeys.value).add(`${productId}:${imageUrl}`);
}

function markProductImageAvailable(productId: string, imageUrl: string) {
  const imageKey = `${productId}:${imageUrl}`;
  if (!failedProductImageKeys.value.has(imageKey)) return;
  const failedImages = new Set(failedProductImageKeys.value);
  failedImages.delete(imageKey);
  failedProductImageKeys.value = failedImages;
}

async function removeProduct(product: Product) {
  error.value = '';
  notice.value = '';
  try {
    await archiveProduct(product);
    notice.value = `${product.name} was removed from the shop.`;
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not remove this listing.';
  }
}

async function logout() {
  try {
    await signOutUser();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not sign out.';
  }
}

function statusLabel(status: OrderStatus) {
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
h2,
h3 {
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

.lead {
  margin: 10px 0 28px;
  color: #788078;
  line-height: 1.6;
}

.panel {
  margin-top: 20px;
  padding: 26px;
  border: 1px solid #e7e7df;
  border-radius: 6px;
  background: #fff;
}

.sold-panel {
  border-color: #e4e9e2;
  background: #fcfcf9;
}

.sold-empty {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px;
  border: 1px dashed #dfe5dc;
  border-radius: 5px;
  background: #fff;
}

.sold-empty-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: #e8eee8;
  color: #355f49;
  font-size: 15px;
  font-weight: 700;
}

.sold-empty strong {
  color: #20352c;
  font-size: 13px;
}

.sold-empty p {
  margin: 4px 0 0;
  color: #788078;
  font-size: 11px;
}

.section-title {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 20px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 20px 0;
}

.summary-card {
  display: grid;
  gap: 8px;
  padding: 18px;
  border: 1px solid #e7e7df;
  border-radius: 5px;
  background: #fff;
}

.summary-card span {
  color: #788078;
  font-size: 11px;
}

.summary-card strong {
  color: #355f49;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 26px;
  font-weight: 400;
}

.product-form {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

label {
  display: grid;
  gap: 6px;
  color: #566157;
  font-size: 12px;
}

input,
select,
textarea {
  width: 100%;
  min-width: 0;
  min-height: 42px;
  padding: 10px 11px;
  border: 1px solid #dedfd7;
  border-radius: 3px;
  background: #fff;
  color: #20352c;
  font: inherit;
  font-size: 13px;
}

textarea {
  resize: vertical;
}

.wide {
  grid-column: span 3;
}

.field-help {
  color: #788078;
  font-size: 11px;
}

.photo-preview {
  display: grid;
  min-height: 120px;
  place-items: start;
}

.photo-preview img {
  width: min(100%, 300px);
  max-height: 240px;
  border-radius: 6px;
  background: #eeece5;
  object-fit: cover;
}

.photo-preview-error {
  margin: 0;
  color: #9c3d31;
  font-size: 12px;
}

.product-form > button,
.action {
  min-height: 42px;
  padding: 0 16px;
  border: 0;
  border-radius: 3px;
  background: #355f49;
  color: #fff;
  font: inherit;
  font-size: 13px;
}

.product-form > button {
  grid-column: span 3;
}

.product-form > button.cancel-edit {
  border: 1px solid #dedfd7;
  background: #fff;
  color: #566157;
}

button:disabled {
  opacity: 0.6;
}

.count,
.empty {
  color: #788078;
  font-size: 12px;
}

.item-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
  gap: 20px;
}

.item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #e7e7df;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 5px 18px rgb(32 53 44 / 6%);
  transition:
    box-shadow 160ms ease,
    transform 160ms ease;
}

.item:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 26px rgb(32 53 44 / 12%);
}

.item-photo {
  position: relative;
  display: grid;
  width: 100%;
  aspect-ratio: 4 / 3;
  place-items: center;
  overflow: hidden;
  background: #f3f1eb;
  color: #788078;
  font-size: 12px;
  text-align: center;
}

.item-photo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 220ms ease;
}

.item:hover .item-photo img {
  transform: scale(1.035);
}

.item-status {
  position: absolute;
  top: 12px;
  left: 12px;
  margin: 0;
  background: rgb(255 255 255 / 92%);
  box-shadow: 0 2px 8px rgb(32 53 44 / 8%);
}

.item-details {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: stretch;
  flex: 1;
  padding: 16px 17px 17px;
}

.item-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.item-details h3 {
  overflow: hidden;
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-size {
  flex: 0 0 auto;
  color: #788078;
  font-size: 11px;
}

.item-details p {
  margin: 6px 0 0;
  font-size: 12px;
}

.item-details strong {
  margin-top: 12px;
  font-size: 17px;
}

.item-details .item-price {
  color: #20352c;
}

.item-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #eeeee8;
}

.item h3,
.order h3 {
  margin: 3px 0 5px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 650;
}

.item p,
.order p {
  margin: 4px 0;
  color: #788078;
  font-size: 11px;
  line-height: 1.5;
}

.item strong,
.order strong {
  display: block;
  margin-top: 6px;
  color: #355f49;
  font-size: 12px;
}

.status {
  display: inline-block;
  margin-top: 5px;
  padding: 4px 7px;
  border-radius: 20px;
  background: #edf2eb;
  color: #355f49;
  font-size: 10px;
  text-transform: capitalize;
}

.status.reserved,
.status.claimed {
  background: #f5efe5;
  color: #906b35;
}

.status.sold,
.status.delivered {
  background: #e8eee8;
  color: #355f49;
}

.status.cancelled,
.status.archived {
  background: #f5ece8;
  color: #905b49;
}

.remove-listing {
  min-height: 34px;
  padding: 0 11px;
  border: 1px solid #dedfd7;
  border-radius: 5px;
  background: #fff;
  color: #566157;
  font: inherit;
  font-size: 11px;
}

.remove-listing:hover {
  border-color: #355f49;
  color: #355f49;
}

.remove-listing:last-child {
  border-color: #f0dfda;
  color: #9c3d31;
}

.remove-listing:last-child:hover {
  border-color: #9c3d31;
}

.order-list {
  display: grid;
  gap: 10px;
}

.order {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 13px;
  border: 1px solid #eeeee8;
}

.order > img {
  width: 68px;
  height: 77px;
  flex: 0 0 auto;
  object-fit: cover;
  background: #eeece5;
}

.order-info {
  flex: 1;
}

.order h3 small {
  color: #788078;
  font-weight: 400;
}

.action {
  flex: 0 0 auto;
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

  .product-form {
    grid-template-columns: repeat(2, 1fr);
  }

  .wide,
  .product-form > button {
    grid-column: span 2;
  }

  .summary-grid {
    gap: 8px;
  }

  .summary-card {
    padding: 12px 10px;
  }

  .summary-card strong {
    font-size: 20px;
  }

  .order {
    align-items: flex-start;
    flex-direction: column;
  }

  .order-info {
    min-width: calc(100% - 85px);
  }

  .action {
    margin-left: 83px;
  }
}
</style>
