<template>
  <ion-page>
    <ion-content :fullscreen="true" class="dashboard-content" :scroll-y="!bookingModalOpen">
      <div class="dashboard-shell">
        <header class="topbar">
          <div class="brand-lockup"><img class="brand-mark" src="/hairvana-logo.png" alt="Hairvana" /><div><span class="eyebrow">HAIRVANA {{ profile.role.toUpperCase() }}</span><h1>Hi, {{ firstName }} ✦</h1></div></div>
          <div class="topbar-actions">
            <NotificationCenter
              v-if="auth.currentUser?.uid"
              :user-id="auth.currentUser.uid"
              :role="profile.role"
              @select="openAppointmentFromNotification"
            />
            <button class="logout-button" @click="signOut">Sign out</button>
          </div>
        </header>

        <section v-if="profile.role === 'customer'" class="customer-hero">
          <img
            src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=85"
            alt="Woman with beautifully styled hair"
          />
          <div class="customer-hero-overlay">
            <span class="eyebrow">YOUR BEAUTY MOMENT</span>
            <h2>Every day is a<br /><em>good hair day.</em></h2>
            <button class="hero-button" @click="scrollToBooking">Book your next look <span>→</span></button>
          </div>
        </section>

        <section v-if="profile.role === 'admin'" class="admin-hero">
          <div class="admin-hero-copy">
            <span class="eyebrow">HAIRVANA STUDIO / 2026</span>
            <h2>Make every<br /><em>moment beautiful.</em></h2>
            <p>Your salon, your rhythm. Everything you need to create an exceptional guest experience.</p>
            <div class="hero-meta"><span><strong>{{ appointments.length }}</strong> bookings today</span><span><strong>{{ services.length }}</strong> treatments live</span></div>
          </div>
          <div class="admin-hero-art"><div class="art-circle"></div><img src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=650&q=85" alt="Salon stylist portrait" /></div>
        </section>

        <section class="welcome-card">
          <span class="eyebrow">{{ roleLabel }}</span>
          <h2>{{ roleTitle }}</h2>
          <p>{{ roleDescription }}</p>
        </section>

        <div class="stats-grid">
          <article class="stat-card"><div class="stat-symbol blush">✦</div><strong>{{ appointments.length }}</strong><span>{{ profile.role === 'customer' ? 'My bookings' : 'Bookings' }}</span><small>{{ appointments.length ? 'Keep the glow going' : 'Ready for your first one' }}</small></article>
          <article class="stat-card"><div class="stat-symbol gold">✧</div><strong>{{ services.length }}</strong><span>Active services</span><small>Available treatments</small></article>
          <article class="stat-card"><div class="stat-symbol lilac">◌</div><strong>{{ pendingCount }}</strong><span>Needs attention</span><small>{{ pendingCount ? 'Review pending requests' : 'All caught up' }}</small></article>
        </div>

        <section v-if="profile.role === 'admin'" class="panel admin-management-panel">
          <div class="panel-heading"><div><span class="eyebrow">ADMIN MANAGEMENT</span><h3>Shape your salon menu</h3><p class="panel-intro">Create beautiful treatments your guests will love to discover.</p></div><span class="panel-badge">LIVE MENU</span></div>
          <form class="service-form" @submit.prevent="saveService">
            <label class="field-group"><span>Service name</span><input v-model.trim="newService.name" placeholder="e.g. Signature haircut" required /></label>
            <label class="field-group"><span>Price (₱)</span><input v-model.number="newService.price" type="number" min="0" placeholder="650" required /></label>
            <label class="field-group"><span>Duration</span><input v-model.number="newService.duration" type="number" min="15" placeholder="60 min" required /></label>
            <label class="image-input"><span>Service photo</span><strong>{{ newService.imageData ? 'Selected ✓' : 'Choose image' }}</strong><input type="file" accept="image/*" @change="selectServiceImage" /></label>
            <button class="primary-button" type="submit">{{ editingServiceId ? 'Save changes' : 'Add service' }}</button>
            <button v-if="editingServiceId" class="cancel-button" type="button" @click="cancelEditing">Cancel</button>
          </form>
          <div class="admin-service-grid">
            <article class="admin-service-card" v-for="service in services" :key="service.id">
              <img :src="service.imageData || fallbackServiceImage" :alt="service.name" />
              <div class="admin-service-card-body"><strong>{{ service.name }}</strong><small>{{ service.duration }} min <i>·</i> ₱{{ service.price }}</small><div class="service-actions"><button type="button" aria-label="Edit service" @click="editService(service)">✎</button><button type="button" aria-label="Delete service" @click="removeService(service.id)">⌫</button></div></div>
            </article>
          </div>
        </section>

        <section v-if="profile.role === 'admin' || profile.role === 'staff'" id="staff-appointments" class="panel">
          <div class="panel-heading"><div><span class="eyebrow">{{ profile.role === 'admin' ? 'ADMIN + STAFF WORKSPACE' : 'STAFF WORKSPACE' }}</span><h3>Today’s appointments</h3></div></div>
          <article v-for="appointment in visibleAppointments" :id="`appointment-${appointment.id}`" :key="appointment.id" class="booking-row"><div><strong>{{ appointment.serviceName }}</strong><small>{{ appointment.date }} at {{ appointment.time }} · {{ appointment.customerName }}</small></div><button v-if="appointment.status === 'pending'" class="pill-button" @click="changeStatus(appointment.id, 'approved')">Accept</button><button v-else-if="appointment.status === 'approved'" class="pill-button" @click="requestCompletionConfirmation(appointment)">Complete</button><span v-else class="pill" :class="appointment.status">{{ appointment.status }}</span><button v-if="appointment.status === 'pending'" class="cancel-booking-button" @click="changeStatus(appointment.id, 'cancelled')">Cancel</button></article>
        </section>

        <section v-if="profile.role === 'staff'" class="panel admin-management-panel">
          <div class="panel-heading"><div><span class="eyebrow">MY SERVICES</span><h3>Post your own services</h3><p class="panel-intro">Create treatments that you personally provide.</p></div></div>
          <form class="service-form" @submit.prevent="saveService">
            <label class="field-group"><span>Service name</span><input v-model.trim="newService.name" placeholder="e.g. Natural hair treatment" required /></label>
            <label class="field-group"><span>Price (₱)</span><input v-model.number="newService.price" type="number" min="0" placeholder="650" required /></label>
            <label class="field-group"><span>Duration</span><input v-model.number="newService.duration" type="number" min="15" placeholder="60 min" required /></label>
            <label class="image-input"><span>Service photo</span><strong>{{ newService.imageData ? 'Selected ✓' : 'Choose image' }}</strong><input type="file" accept="image/*" @change="selectServiceImage" /></label>
            <button class="primary-button" type="submit">{{ editingServiceId ? 'Save changes' : 'Add service' }}</button>
            <button v-if="editingServiceId" class="cancel-button" type="button" @click="cancelEditing">Cancel</button>
          </form>
          <div class="admin-service-grid">
            <article class="admin-service-card" v-for="service in ownServices" :key="service.id">
              <img :src="service.imageData || fallbackServiceImage" :alt="service.name" />
              <div class="admin-service-card-body"><strong>{{ service.name }}</strong><small>{{ service.duration }} min <i>·</i> ₱{{ service.price }}</small><div class="service-actions"><button type="button" aria-label="Edit service" @click="editService(service)">✎</button><button type="button" aria-label="Delete service" @click="removeService(service.id)">⌫</button></div></div>
            </article>
          </div>
          <p v-if="!ownServices.length" class="empty-state">You have not posted a service yet.</p>
        </section>

        <section v-if="profile.role === 'customer'" class="panel service-discovery">
          <div class="panel-heading"><div><span class="eyebrow">THE HAIRVANA MENU</span><h3>Our services</h3></div></div>
          <div class="visual-service-grid">
            <article v-for="(service, index) in services.slice(0, 3)" :key="service.id" class="visual-service-card">
              <img :src="service.imageData || serviceImages[index % serviceImages.length]" :alt="service.name" />
              <div class="visual-service-card-body">
                <strong>{{ service.name }}</strong>
                <small>{{ service.duration }} min · ₱{{ service.price }}</small>
                <div v-if="serviceRating(service.id).count" class="service-rating" :aria-label="`${serviceRating(service.id).average} out of 5 stars`">
                  <span class="star-display" aria-hidden="true">★</span>
                  <strong>{{ serviceRating(service.id).average }}</strong>
                  <small>{{ serviceRating(service.id).count }} recent {{ serviceRating(service.id).count === 1 ? 'review' : 'reviews' }}</small>
                </div>
                <div v-else class="service-rating-empty">Be the first to review</div>
              </div>
            </article>
          </div>
        </section>

        <section v-if="profile.role === 'customer'" class="panel guest-feedback">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">KIND WORDS</span>
              <h3>Guests love their Hairvana moments</h3>
              <p class="panel-intro">Real ratings and notes from guests after their completed appointments.</p>
            </div>
          </div>
          <div v-if="recentFeedback.length" class="feedback-grid">
            <article v-for="review in recentFeedback" :key="review.id" class="feedback-card">
              <div class="feedback-card-top">
                <span class="feedback-service">{{ review.serviceName || 'Salon experience' }}</span>
                <span class="verified-guest">Verified guest</span>
              </div>
              <div class="feedback-stars" :aria-label="`${review.rating} out of 5 stars`">
                <span v-for="star in 5" :key="star" :class="{ 'star-muted': star > review.rating }" aria-hidden="true">★</span>
                <strong>{{ review.rating }}.0</strong>
              </div>
              <p class="feedback-comment">{{ review.comment || `Rated this service ${review.rating} stars.` }}</p>
              <time v-if="review.createdAt?.toMillis" class="feedback-date">{{ formatFeedbackDate(review.createdAt.toMillis()) }}</time>
            </article>
          </div>
          <div v-else class="feedback-empty">
            <span class="feedback-empty-star" aria-hidden="true">★</span>
            <strong>Be the first to share the love</strong>
            <p>Guest reviews will appear here after completed appointments.</p>
          </div>
        </section>

        <section v-if="profile.role === 'customer'" id="booking-panel" class="panel customer-booking-panel">
          <div class="panel-heading"><div><span class="eyebrow">CUSTOMER EXPERIENCE</span><h3>Book a service</h3></div></div>
          <p class="panel-intro">Choose your treatment and preferred time. We’ll confirm your appointment shortly.</p>
          <form class="booking-form" @submit.prevent="bookService">
            <label class="booking-field">
              <span>Service</span>
              <select v-model="booking.serviceId" required>
                <option disabled value="">Choose a service</option>
                <option v-for="service in services" :key="service.id" :value="service.id">{{ service.name }} · ₱{{ service.price }}</option>
              </select>
            </label>
            <label class="booking-field">
              <span>Date</span>
              <input v-model="booking.date" type="date" aria-label="Appointment date" required />
            </label>
            <label class="booking-field">
              <span>Time</span>
              <input v-model="booking.time" type="time" aria-label="Appointment time" required />
            </label>
            <label class="booking-field">
              <span>Stylist</span>
              <select v-model="booking.staffId" required>
                <option disabled value="">Choose a stylist</option>
                <option v-for="member in staff" :key="member.id" :value="member.id">{{ member.name }}</option>
              </select>
            </label>
            <button class="primary-button booking-submit" type="submit">Request booking</button>
          </form>
        </section>

        <section id="appointment-list" class="panel">
          <div class="panel-heading"><div><span class="eyebrow">APPOINTMENTS</span><h3>{{ profile.role === 'customer' ? 'My schedule' : 'Booking queue' }}</h3></div></div>
          <template v-for="appointment in visibleAppointments" :key="appointment.id">
            <article :id="profile.role === 'staff' || profile.role === 'admin' ? undefined : `appointment-${appointment.id}`" class="booking-row">
              <div><strong>{{ appointment.serviceName }}</strong><small>{{ appointment.date }} · {{ appointment.time }} · {{ appointment.customerName }}</small></div>
              <span class="pill" :class="appointment.status">{{ appointment.status }}</span>
              <button v-if="(profile.role === 'admin' || profile.role === 'customer') && appointment.status === 'pending'" class="pill-button" @click="changeStatus(appointment.id, 'cancelled')">Cancel booking</button>
              <button v-if="profile.role === 'admin' && appointment.status === 'pending'" class="pill-button" @click="changeStatus(appointment.id, 'approved')">Approve</button>
              <button v-if="profile.role === 'customer' && appointment.status === 'completed' && appointment.paymentStatus === 'unpaid'" class="pill-button" @click="pay(appointment)">Mark paid</button>
            </article>
            <section
              v-if="profile.role === 'customer' && appointment.status === 'completed'"
              class="appointment-review"
              :aria-label="`Review ${appointment.serviceName}`"
            >
              <template v-if="feedbackByAppointment.has(appointment.id)">
                <div class="review-thanks">
                  <div class="feedback-stars" :aria-label="`${feedbackByAppointment.get(appointment.id)?.rating} out of 5 stars`">
                    <span v-for="star in 5" :key="star" :class="{ 'star-muted': star > (feedbackByAppointment.get(appointment.id)?.rating || 0) }" aria-hidden="true">★</span>
                  </div>
                  <div>
                    <strong>Thanks for sharing your experience</strong>
                    <p v-if="feedbackByAppointment.get(appointment.id)?.comment">{{ feedbackByAppointment.get(appointment.id)?.comment }}</p>
                  </div>
                </div>
              </template>
              <form v-else class="review-form" @submit.prevent="rateAppointment(appointment)">
                <div class="review-prompt">
                  <strong>How was your visit?</strong>
                  <span>Your rating helps other guests choose with confidence.</span>
                </div>
                <div class="rating-picker" role="group" :aria-label="`Choose a rating for ${appointment.serviceName}`">
                  <button
                    v-for="star in 5"
                    :key="star"
                    type="button"
                    :aria-label="`${star} ${star === 1 ? 'star' : 'stars'}`"
                    :aria-pressed="reviewRatings[appointment.id] === star"
                    :class="{ selected: star <= (reviewRatings[appointment.id] || 0) }"
                    @click="reviewRatings[appointment.id] = star"
                  >★</button>
                </div>
                <label class="review-comment">
                  <span>Your feedback <small>(optional)</small></span>
                  <textarea v-model.trim="reviewComments[appointment.id]" maxlength="500" rows="3" placeholder="What did you enjoy about your visit?"></textarea>
                </label>
                <p v-if="reviewErrors[appointment.id]" class="feedback-error" role="alert">{{ reviewErrors[appointment.id] }}</p>
                <button class="primary-button review-submit" type="submit" :disabled="feedbackSubmittingId === appointment.id || !reviewRatings[appointment.id]">
                  {{ feedbackSubmittingId === appointment.id ? 'Submitting…' : 'Share rating' }}
                </button>
              </form>
            </section>
          </template>
          <p v-if="!appointments.length" class="empty-state">No appointments yet.</p>
        </section>

        <p v-if="message" class="message">{{ message }}</p>
      </div>
    </ion-content>
    <div
      v-if="bookingModalOpen"
      class="booking-modal-backdrop"
      @click.self="closeBookingModal"
    >
      <section
        class="booking-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
      >
        <header class="booking-modal-header">
          <div>
            <span class="eyebrow">ALMOST THERE</span>
            <h2 id="booking-modal-title">Your booking details</h2>
          </div>
          <button class="modal-close" type="button" aria-label="Close" @click="closeBookingModal">×</button>
        </header>

        <div v-if="selectedBookingService" class="booking-summary">
          <strong>{{ selectedBookingService.name }}</strong>
          <span>{{ booking.date }} · {{ booking.time }} · {{ selectedBookingStaff }}</span>
          <strong>₱{{ selectedBookingService.price }}</strong>
        </div>

        <form class="booking-details-form" @submit.prevent="confirmBooking">
          <label>
            <span>Full name</span>
            <input v-model.trim="customerDetails.name" autocomplete="name" required />
          </label>
          <label>
            <span>Email address</span>
            <input v-model.trim="customerDetails.email" type="email" autocomplete="email" required />
          </label>
          <label>
            <span>Mobile number</span>
            <input v-model.trim="customerDetails.phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="09XX XXX XXXX" required />
          </label>
          <label>
            <span>Address <small>Optional</small></span>
            <input v-model.trim="customerDetails.address" autocomplete="street-address" placeholder="City or barangay" />
          </label>
          <label>
            <span>Gender <small>Optional</small></span>
            <select v-model="customerDetails.gender">
              <option value="">Prefer not to say</option>
              <option value="woman">Woman</option>
              <option value="man">Man</option>
              <option value="non-binary">Non-binary</option>
              <option value="self-described">Other / self-described</option>
            </select>
          </label>

          <fieldset class="payment-methods">
            <legend>Preferred payment method</legend>
            <div class="payment-method-grid">
              <label class="payment-option">
                <input v-model="paymentMethod" type="radio" name="payment-method" value="gcash" required />
                <span class="payment-logo gcash-logo" aria-hidden="true">G</span>
                <span>GCash</span>
              </label>
              <label class="payment-option">
                <input v-model="paymentMethod" type="radio" name="payment-method" value="maya" />
                <span class="payment-logo maya-logo" aria-hidden="true">M</span>
                <span>Maya</span>
              </label>
              <label class="payment-option">
                <input v-model="paymentMethod" type="radio" name="payment-method" value="bank_transfer" />
                <span class="payment-logo bank-logo" aria-hidden="true"><ion-icon :icon="businessOutline" /></span>
                <span>Bank transfer</span>
              </label>
              <label class="payment-option">
                <input v-model="paymentMethod" type="radio" name="payment-method" value="cash_at_salon" />
                <span class="payment-logo cash-logo" aria-hidden="true"><ion-icon :icon="cashOutline" /></span>
                <span>Cash at salon</span>
              </label>
            </div>
          </fieldset>

          <label v-if="paymentMethod === 'bank_transfer'">
            <span>Bank</span>
            <select v-model="paymentBank" required>
              <option disabled value="">Choose a bank</option>
              <option v-for="bank in philippineBanks" :key="bank.value" :value="bank.value">{{ bank.label }}</option>
            </select>
          </label>
          <label v-if="paymentMethod === 'bank_transfer' && paymentBank === 'Other Philippine bank'">
            <span>Bank name</span>
            <input v-model.trim="otherBankName" placeholder="Enter your bank" required />
          </label>

          <label v-if="isOnlinePayment" class="payment-detail-field">
            <span>Sender / account holder name</span>
            <input v-model.trim="paymentSenderName" autocomplete="name" placeholder="Name used for the transfer" required />
          </label>
          <label v-if="isOnlinePayment" class="payment-detail-field">
            <span>Transfer reference number</span>
            <input v-model.trim="paymentReference" placeholder="Enter the transfer reference" required />
          </label>

          <p class="payment-note">This saves your preference only. No payment is collected now; the salon will confirm your booking and share payment instructions.</p>
          <p v-if="bookingError" class="booking-error" role="alert">{{ bookingError }}</p>
          <div class="booking-modal-actions">
            <button class="modal-cancel" type="button" @click="closeBookingModal">Cancel</button>
            <button class="primary-button" type="submit" :disabled="bookingSubmitting">
              {{ bookingSubmitting ? 'Sending request...' : 'Confirm booking request' }}
            </button>
          </div>
        </form>
      </section>
    </div>
    <ion-alert
      :is-open="Boolean(serviceToDelete)"
      header="Delete service?"
      message="This service will be removed from your salon menu."
      :buttons="deleteAlertButtons"
      @did-dismiss="serviceToDelete = null"
    />
    <ion-alert
      :is-open="Boolean(completionAppointment)"
      header="Complete this appointment?"
      :message="completionAppointment ? `Confirm that ${completionAppointment.customerName}'s ${completionAppointment.serviceName} appointment is finished.` : ''"
      :buttons="completionAlertButtons"
      @did-dismiss="completionAppointment = null"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonAlert, IonContent, IonIcon, IonPage } from '@ionic/vue';
import NotificationCenter from '../components/NotificationCenter.vue';
import { businessOutline, cashOutline } from 'ionicons/icons';
import { auth } from '../firebase';
import { getCurrentUserProfile, listStaffProfiles, logout, type UserProfile } from '../services/auth';
import {
  createAppointment,
  createService,
  deleteService,
  updateService,
  listFeedback,
  listAppointments,
  listServices,
  recordPayment,
  submitFeedback,
  updateAppointmentStatus,
  type Appointment,
  type SalonService,
  type ServiceFeedback,
} from '../services/salon';

const router = useRouter();
const profile = reactive<UserProfile>({ name: 'Salon owner', email: '', role: 'customer' });
const services = ref<SalonService[]>([]);
const appointments = ref<Appointment[]>([]);
const feedback = ref<ServiceFeedback[]>([]);
const staff = ref<(UserProfile & { id: string })[]>([]);
const message = ref('');
const newService = reactive({ name: '', price: 0, duration: 60, imageData: '' });
const editingServiceId = ref('');
const serviceToDelete = ref<string | null>(null);
const completionAppointment = ref<Appointment | null>(null);
const bookingModalOpen = ref(false);
const bookingSubmitting = ref(false);
const bookingError = ref('');
const feedbackSubmittingId = ref('');
const reviewRatings = reactive<Record<string, number>>({});
const reviewComments = reactive<Record<string, string>>({});
const reviewErrors = reactive<Record<string, string>>({});
const paymentMethod = ref<'' | 'gcash' | 'maya' | 'bank_transfer' | 'cash_at_salon'>('');
const paymentBank = ref('');
const otherBankName = ref('');
const paymentSenderName = ref('');
const paymentReference = ref('');
const customerDetails = reactive({ name: '', email: '', phone: '', address: '', gender: '' });
const philippineBanks = [
  { value: 'BDO Unibank', label: 'BDO Unibank' },
  { value: 'BPI', label: 'BPI' },
  { value: 'Metrobank', label: 'Metrobank' },
  { value: 'Land Bank of the Philippines', label: 'LandBank' },
  { value: 'PNB', label: 'PNB' },
  { value: 'UnionBank', label: 'UnionBank' },
  { value: 'Security Bank', label: 'Security Bank' },
  { value: 'RCBC', label: 'RCBC' },
  { value: 'China Bank', label: 'China Bank' },
  { value: 'EastWest Bank', label: 'EastWest Bank' },
  { value: 'GoTyme Bank', label: 'GoTyme Bank' },
  { value: 'Other Philippine bank', label: 'Other Philippine bank' },
];
const deleteAlertButtons = [
  {
    text: 'Cancel',
    role: 'cancel',
  },
  {
    text: 'Delete',
    role: 'destructive',
    handler: () => {
      if (serviceToDelete.value) {
        void confirmRemoveService(serviceToDelete.value);
      }
    },
  },
];
const completionAlertButtons = [
  {
    text: 'No, go back',
    role: 'cancel',
  },
  {
    text: 'Yes, complete',
    handler: () => {
      if (completionAppointment.value) {
        void changeStatus(completionAppointment.value.id, 'completed');
      }
    },
  },
];
const booking = reactive({ serviceId: '', date: '', time: '', staffId: '' });
const serviceImages = [
  'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=500&q=80',
];
const fallbackServiceImage = serviceImages[0];
const firstName = computed(() => profile.name.split(/\s+/)[0] || 'there');
const pendingCount = computed(() => appointments.value.filter((item) => item.status === 'pending').length);
const visibleAppointments = computed(() =>
  profile.role === 'admin'
    ? appointments.value
    : appointments.value.filter((item) => item.status !== 'cancelled'),
);
const feedbackByAppointment = computed(() =>
  new Map(feedback.value.map((review) => [review.appointmentId, review])),
);
const recentFeedback = computed(() => feedback.value.slice(0, 6));
const ownServices = computed(() =>
  services.value.filter((service) => service.createdBy === auth.currentUser?.uid),
);
const selectedBookingService = computed(() =>
  services.value.find((service) => service.id === booking.serviceId),
);
const selectedBookingStaff = computed(() =>
  staff.value.find((member) => member.id === booking.staffId)?.name || 'Stylist',
);
const isOnlinePayment = computed(() =>
  ['gcash', 'maya', 'bank_transfer'].includes(paymentMethod.value),
);
const roleLabel = computed(() => profile.role === 'admin' ? 'SALON COMMAND CENTER' : profile.role === 'staff' ? 'YOUR DAILY WORKSPACE' : 'YOUR BEAUTY JOURNEY');
const roleTitle = computed(() => profile.role === 'admin' ? 'Run your salon beautifully.' : profile.role === 'staff' ? 'Your craft, organized.' : 'Your next look awaits.');
const roleDescription = computed(() => profile.role === 'admin' ? 'Manage services, bookings, staff operations, payments, and customer feedback from one place.' : profile.role === 'staff' ? 'See your assigned appointments and keep every service moving smoothly.' : 'Discover services, request appointments, and keep your salon visits in one place.');

async function loadData() {
  const currentProfile = await getCurrentUserProfile();
  if (!currentProfile) return;
  Object.assign(profile, currentProfile);
  if (!customerDetails.name) customerDetails.name = currentProfile.name;
  if (!customerDetails.email) customerDetails.email = currentProfile.email;
  services.value = await listServices();
  appointments.value = await listAppointments(profile.role);
  if (profile.role === 'customer') {
    feedback.value = await listFeedback();
    staff.value = await listStaffProfiles();
    if (staff.value.length === 1) booking.staffId = staff.value[0].id;
  } else {
    feedback.value = [];
  }
}

function serviceRating(serviceId: string): { average: string; count: number } {
  const serviceReviews = feedback.value.filter((review) => review.serviceId === serviceId);
  if (!serviceReviews.length) return { average: '0.0', count: 0 };
  const average = serviceReviews.reduce((sum, review) => sum + review.rating, 0) / serviceReviews.length;
  return { average: average.toFixed(1), count: serviceReviews.length };
}

function formatFeedbackDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(timestamp);
}

async function saveService() {
  if (editingServiceId.value) {
    await updateService(editingServiceId.value, newService.name, newService.price, newService.duration, newService.imageData);
    message.value = 'Service updated successfully.';
  } else {
    await createService(newService.name, newService.price, newService.duration, newService.imageData);
    message.value = 'Service added successfully.';
  }
  cancelEditing();
  await loadData();
}

function editService(service: SalonService) {
  editingServiceId.value = service.id;
  newService.name = service.name;
  newService.price = service.price;
  newService.duration = service.duration;
  newService.imageData = service.imageData || '';
  document.querySelector('.service-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function cancelEditing() {
  editingServiceId.value = '';
  newService.name = '';
  newService.price = 0;
  newService.duration = 60;
  newService.imageData = '';
}

async function removeService(id: string) {
  serviceToDelete.value = id;
}

async function confirmRemoveService(id: string) {
  await deleteService(id);
  serviceToDelete.value = null;
  await loadData();
  message.value = 'Service deleted.';
}

function selectServiceImage(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  compressImage(file)
    .then((imageData) => {
      newService.imageData = imageData;
    })
    .catch((error) => {
      console.error('Unable to prepare service image', error);
      message.value = 'That image could not be prepared. Choose another image.';
    });
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('image-read-failed'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('image-decode-failed'));
      image.onload = () => {
        const scale = Math.min(1, 900 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('canvas-unavailable'));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.72);
        if (imageData.length > 800000) {
          reject(new Error('image-too-large'));
          return;
        }
        resolve(imageData);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function bookService() {
  bookingError.value = '';
  message.value = '';
  bookingModalOpen.value = true;
}

function closeBookingModal() {
  if (bookingSubmitting.value) return;
  bookingModalOpen.value = false;
  bookingError.value = '';
}

async function confirmBooking() {
  const service = selectedBookingService.value;
  if (!service || !paymentMethod.value) return;

  bookingSubmitting.value = true;
  bookingError.value = '';
  try {
    await createAppointment({
      customerId: '',
      customerName: customerDetails.name,
      customerEmail: customerDetails.email,
      customerPhone: customerDetails.phone,
      customerAddress: customerDetails.address,
      customerGender: customerDetails.gender,
      serviceId: service.id,
      serviceName: service.name,
      staffId: booking.staffId,
      staffName: selectedBookingStaff.value,
      date: booking.date,
      time: booking.time,
      paymentMethod: paymentMethod.value,
      paymentBank: paymentMethod.value === 'bank_transfer'
        ? paymentBank.value === 'Other Philippine bank' ? otherBankName.value.trim() : paymentBank.value
        : '',
      paymentSenderName: isOnlinePayment.value ? paymentSenderName.value : '',
      paymentReference: isOnlinePayment.value ? paymentReference.value : '',
    });
    bookingModalOpen.value = false;
    paymentMethod.value = '';
    paymentBank.value = '';
    otherBankName.value = '';
    paymentSenderName.value = '';
    paymentReference.value = '';
    await loadData();
    message.value = 'Booking requested. The salon will confirm it shortly.';
  } catch (error) {
    console.error('Unable to create appointment', error);
    const firebaseError = error as { code?: unknown };
    const code = typeof firebaseError.code === 'string' ? firebaseError.code : '';
    bookingError.value = code === 'permission-denied'
      ? 'Firestore rejected the booking. Publish the latest firestore.rules and make sure your customer profile exists, then try again.'
      : code === 'unauthenticated'
        ? 'Your session has expired. Sign in again before requesting a booking.'
        : code
          ? `The booking could not be created (${code}). Please try again.`
          : 'The booking could not be created. Please try again.';
  } finally {
    bookingSubmitting.value = false;
  }
}

function scrollToBooking() {
  document.getElementById('booking-panel')?.scrollIntoView({ behavior: 'smooth' });
}

function requestCompletionConfirmation(appointment: Appointment) {
  completionAppointment.value = appointment;
}

function openAppointmentFromNotification(notification: { appointmentId?: string }) {
  window.setTimeout(() => {
    const appointment = notification.appointmentId
      ? document.getElementById(`appointment-${notification.appointmentId}`)
      : null;
    const appointmentsSection = document.getElementById(
      profile.role === 'staff' || profile.role === 'admin'
        ? 'staff-appointments'
        : 'appointment-list',
    );
    (appointment || appointmentsSection)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 300);
}

async function changeStatus(id: string, status: Appointment['status']) {
  try {
    await updateAppointmentStatus(id, status);
    await loadData();
  } catch (error) {
    if (error instanceof Error && error.message === 'invalid-appointment-transition') {
      message.value = 'That appointment has already been accepted or completed and cannot be changed.';
      return;
    }
    console.error('Unable to update appointment status', error);
    message.value = 'The appointment status could not be updated.';
  }
}

async function rateAppointment(appointment: Appointment) {
  const rating = reviewRatings[appointment.id];
  if (!rating || feedbackSubmittingId.value) return;

  feedbackSubmittingId.value = appointment.id;
  reviewErrors[appointment.id] = '';
  try {
    await submitFeedback(appointment.id, rating, reviewComments[appointment.id] || '');
    feedback.value = await listFeedback();
  } catch (error) {
    console.error('Unable to submit appointment feedback', error);
    const detail = error instanceof Error ? error.message : '';
    reviewErrors[appointment.id] = detail === 'appointment-not-completed'
      ? 'Ratings are available after your appointment is marked complete.'
      : detail === 'permission-denied'
        ? 'Feedback was blocked by Firestore. Publish the latest firestore.rules and try again.'
        : 'Your rating could not be submitted. Please try again.';
  } finally {
    feedbackSubmittingId.value = '';
  }
}

async function pay(appointment: Appointment) {
  await recordPayment(appointment.id, services.value.find((item) => item.id === appointment.serviceId)?.price || 0);
  await loadData();
  message.value = 'Payment recorded.';
}

async function signOut() {
  await logout();
  await router.replace('/auth');
}

onMounted(() => loadData().catch((error) => {
  console.error('Unable to load salon dashboard', error);
  message.value = 'Unable to load salon data. Check your Firestore rules.';
}));
</script>

<style scoped>
.dashboard-content {
  --background: #f9f7f5;
}

.dashboard-content::part(scroll) {
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.dashboard-content::part(scroll)::-webkit-scrollbar {
  display: none;
  width: 0;
}

.dashboard-shell {
  width: min(100% - 32px, 1240px);
  margin: auto;
  padding: 28px 0 70px;
}

.topbar,
.brand-lockup,
.panel-heading,
.booking-row,
.service-row {
  display: flex;
  align-items: center;
}

.topbar,
.panel-heading {
  justify-content: space-between;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-lockup {
  gap: 12px;
}

.brand-mark {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: #332d2c;
  color: #fff;
  font: 700 22px Georgia, serif;
}

.eyebrow {
  color: #a16a5d;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.6px;
}

h1,
h2,
h3,
p {
  margin: 0;
}

h1 {
  font: 600 21px Georgia, serif;
  color: #332d2c;
  margin-top: 3px;
}

.logout-button {
  border: 0;
  background: #fff;
  color: #a85e50;
  border-radius: 20px;
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 700;
}

.customer-hero {
  position: relative;
  height: 310px;
  overflow: hidden;
  border-radius: 28px;
  margin-top: 28px;
  background: #b98577;
}

.customer-hero img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 42%;
  filter: saturate(0.75);
}

.customer-hero-overlay {
  position: absolute;
  inset: 0;
  padding: 38px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: linear-gradient(90deg, rgba(49, 33, 30, 0.76), rgba(49, 33, 30, 0.15) 70%);
  color: #fff;
}

.customer-hero-overlay .eyebrow {
  color: #f8ddd2;
}

.customer-hero h2 {
  font: 400 40px/1.05 Georgia, serif;
  margin: 11px 0 20px;
}

.customer-hero h2 em {
  color: #f1c4b5;
}

.hero-button {
  width: max-content;
  border: 0;
  border-radius: 20px;
  padding: 12px 16px;
  background: #fff;
  color: #473532;
  font-size: 11px;
  font-weight: 800;
}

.hero-button span {
  margin-left: 9px;
  font-size: 16px;
}

.welcome-card {
  margin-top: 28px;
  padding: 32px;
  border-radius: 24px;
  background: #e8c3b5;
  color: #402f2b;
}

.welcome-card h2 {
  font: 400 36px/1.12 Georgia, serif;
  margin: 12px 0;
}

.welcome-card p {
  max-width: 620px;
  color: #74534b;
  font-size: 13px;
  line-height: 1.65;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-top: 20px;
}

.stat-card,
.panel {
  background: #fff;
  border: 1px solid #eee8e4;
  border-radius: 20px;
  padding: 20px;
}

.stat-card strong {
  display: block;
  color: #332d2c;
  font: 600 28px Georgia, serif;
}

.stat-card span,
.booking-row small,
.service-row small {
  display: block;
  color: #a09692;
  font-size: 11px;
  margin-top: 7px;
  line-height: 1.4;
}

.panel {
  margin-top: 20px;
}

.panel-heading {
  align-items: flex-start;
  margin-bottom: 22px;
}

.panel-heading h3 {
  line-height: 1.25;
  margin-top: 7px;
  color: #332d2c;
}

.panel-intro {
  color: #978a86;
  font-size: 12px;
  line-height: 1.55;
  margin: 7px 0 0;
}

.inline-form,
.staff-form,
.booking-form {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: 10px;
  margin-bottom: 16px;
}

.service-form {
  display: grid;
  grid-template-columns: minmax(220px, 2fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(130px, auto) auto;
  gap: 14px;
  align-items: end;
  margin-bottom: 20px;
}

.booking-form {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.booking-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 7px;
}

.booking-field > span {
  color: #8d7e79;
  font-size: 10px;
  font-weight: 700;
}

.booking-field input,
.booking-field select {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  border: 1px solid #e4d9d4;
  border-radius: 11px;
  padding: 0 12px;
  background: #fff;
  color: #433735;
  outline: 0;
  font: inherit;
  font-size: 12px;
  color-scheme: light;
  min-height: 52px;
}

.booking-field input:focus,
.booking-field select:focus {
  border-color: #c88778;
  box-shadow: 0 0 0 3px #f7e7e2;
}

.staff-form {
  grid-template-columns: 1.3fr 1.5fr 1fr auto;
  align-items: end;
  gap: 14px;
  margin-bottom: 24px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.field-group span,
.image-input span {
  color: #8d7e79;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.service-form input,
.staff-form input,
.booking-form input,
.booking-form select {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  border: 1px solid #e4d9d4;
  border-radius: 11px;
  padding: 13px 12px;
  background: #fdfcfb;
  color: #433735;
  outline: 0;
  font: inherit;
  font-size: 12px;
}

.booking-form .booking-field input,
.booking-form .booking-field select {
  min-height: 52px;
  padding: 0 12px;
  background-color: #fff;
  color-scheme: light;
}

.service-form input:focus,
.staff-form input:focus {
  border-color: #c88778;
  box-shadow: 0 0 0 3px #f7e7e2;
}

.primary-button {
  min-height: 42px;
  border: 0;
  border-radius: 12px;
  padding: 12px 16px;
  background: #332d2c;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.booking-submit {
  grid-column: 1 / -1;
  width: 100%;
}

.service-discovery {
  background: linear-gradient(135deg, #fff, #fbf3ef);
}

.visual-service-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.visual-service-card {
  overflow: hidden;
  border-radius: 18px;
  background: #fff;
  border: 1px solid #eee8e4;
  box-shadow: 0 8px 24px rgba(67, 45, 38, 0.045);
}

.visual-service-card img {
  width: 100%;
  height: 115px;
  display: block;
  object-fit: cover;
}

.visual-service-card-body {
  padding: 16px;
}

.visual-service-card strong,
.visual-service-card small {
  display: block;
}

.visual-service-card strong {
  color: #3b3331;
  font-size: 12px;
}

.visual-service-card small {
  color: #a09692;
  font-size: 10px;
  margin-top: 5px;
}

.service-rating {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #f3ece8;
}

.service-rating > span {
  color: #c48b45;
  font-size: 15px;
}

.service-rating strong {
  color: #54413b;
  font-size: 12px;
}

.service-rating small {
  margin: 0 0 0 auto;
  color: #9c8e89;
}

.service-rating-empty {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #f3ece8;
  color: #a09692;
  font-size: 10px;
}

.guest-feedback {
  background: linear-gradient(135deg, #fff, #fcf8f5);
}

.feedback-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.feedback-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 22px;
  border: 1px solid #eee7e2;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(67, 45, 38, 0.045);
}

.feedback-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.feedback-service {
  color: #453835;
  font-size: 13px;
  font-weight: 750;
}

.verified-guest {
  flex: 0 0 auto;
  padding: 6px 9px;
  border-radius: 20px;
  background: #f5eee9;
  color: #8c756d;
  font-size: 9px;
  font-weight: 700;
}

.feedback-stars {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 18px;
  color: #c48b45;
  font-size: 15px;
}

.feedback-stars .star-muted {
  color: #e7ddd6;
}

.feedback-stars strong {
  margin-left: 7px;
  color: #6f5e58;
  font-size: 11px;
}

.feedback-comment {
  margin: 14px 0 18px;
  color: #746763;
  font-size: 12px;
  line-height: 1.75;
  overflow-wrap: anywhere;
}

.feedback-date {
  margin-top: auto;
  color: #a09692;
  font-size: 10px;
}

.feedback-empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 30px 20px;
  border: 1px dashed #e8d9d2;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.7);
  text-align: center;
}

.feedback-empty-star {
  color: #c48b45;
  font-size: 24px;
}

.feedback-empty strong {
  color: #453835;
  font-size: 13px;
}

.feedback-empty p {
  margin: 0;
  color: #93847e;
  font-size: 11px;
  line-height: 1.6;
}

.appointment-review {
  margin: 0 0 18px;
  padding: 20px;
  border: 1px solid #eee6e1;
  border-radius: 17px;
  background: #fffaf8;
}

.review-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px 20px;
}

.review-prompt strong,
.review-prompt span {
  display: block;
}

.review-prompt strong,
.review-thanks strong {
  color: #453835;
  font-size: 13px;
}

.review-prompt span {
  margin-top: 6px;
  color: #93847e;
  font-size: 11px;
  line-height: 1.5;
}

.rating-picker {
  display: flex;
  gap: 7px;
}

.rating-picker button {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 1px solid #eadbd2;
  border-radius: 12px;
  background: #fff;
  color: #d3c6be;
  font-size: 19px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
}

.rating-picker button.selected,
.rating-picker button:hover {
  border-color: #e7d0ac;
  background: #fff5e5;
  color: #c48b45;
  transform: translateY(-1px);
}

.review-comment {
  display: grid;
  grid-column: 1 / -1;
  gap: 8px;
  color: #776761;
  font-size: 11px;
  font-weight: 700;
}

.review-comment small {
  color: #a09692;
  font-weight: 400;
}

.review-comment textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 76px;
  resize: vertical;
  border: 1px solid #e8ddd7;
  border-radius: 12px;
  padding: 12px 14px;
  background: #fff;
  color: #453835;
  font: inherit;
  font-size: 12px;
  line-height: 1.55;
}

.review-comment textarea:focus {
  border-color: #c88778;
  outline: 0;
  box-shadow: 0 0 0 3px #f7e7e2;
}

.review-submit {
  justify-self: end;
  min-width: 142px;
}

.review-submit:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.feedback-error {
  grid-column: 1 / -1;
  margin: 0;
  color: #a64e43;
  font-size: 11px;
}

.review-thanks {
  display: flex;
  align-items: flex-start;
  gap: 18px;
}

.review-thanks .feedback-stars {
  flex: 0 0 auto;
  margin: 0;
}

.review-thanks p {
  margin: 7px 0 0;
  color: #746763;
  font-size: 12px;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.service-row,
.booking-row {
  gap: 12px;
  padding: 13px 0;
  border-top: 1px solid #f1ece9;
}

.admin-service-thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 12px;
}

.service-row div,
.booking-row div {
  flex: 1;
}

.service-row strong,
.booking-row strong {
  color: #3b3331;
  font-size: 13px;
}

.pill {
  border-radius: 12px;
  padding: 6px 9px;
  background: #f1ece9;
  color: #766a66;
  font-size: 10px;
  font-weight: 800;
}

.pill.active,
.pill.approved {
  background: #e3f0e5;
  color: #5f9271;
}

.pill.pending {
  background: #fff0d9;
  color: #a16c2c;
}

.pill.completed {
  background: #e4e6f4;
  color: #686e9a;
}

.pill-button {
  border: 0;
  border-radius: 12px;
  padding: 7px 10px;
  background: #f7e5df;
  color: #a85e50;
  font-size: 10px;
  font-weight: 800;
}

.cancel-booking-button {
  border: 1px solid #eadbd5;
  border-radius: 12px;
  padding: 7px 10px;
  background: #fff;
  color: #a85e50;
  font-size: 10px;
  font-weight: 800;
}

.image-input {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 42px;
  border: 1px dashed #d9b6aa;
  border-radius: 11px;
  color: #a85e50;
  background: #fff8f5;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.image-input strong {
  font-size: 11px;
}

.image-input input {
  display: none;
}

.empty-state,
.message {
  color: #9c918e;
  font-size: 12px;
}

.message {
  margin: 18px 0;
  text-align: center;
}

.panel-heading + .booking-row {
  border-top: 0;
}

@media (max-width: 700px) {
  .customer-hero {
    height: 270px;
    margin-top: 22px;
  }

  .customer-hero-overlay {
    padding: 24px;
  }

  .customer-hero h2 {
    font-size: 33px;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
  }

  .stat-card {
    padding: 13px 10px;
  }

  .stat-card strong {
    font-size: 22px;
  }

  .welcome-card {
    padding: 24px;
  }

  .welcome-card h2 {
    font-size: 30px;
  }

  .service-form,
  .staff-form {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .service-form .field-group:first-child,
  .service-form .primary-button,
  .service-form .image-input,
  .service-form .cancel-button,
  .staff-form .field-group:first-child,
  .staff-form .primary-button {
    grid-column: 1 / -1;
  }

  .service-form .image-input {
    min-height: 54px;
    flex-direction: row;
    justify-content: space-between;
    padding: 0 16px;
    box-sizing: border-box;
  }

  .service-form .cancel-button {
    width: 100%;
  }

  .booking-row {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .booking-row .pill {
    margin-left: auto;
  }

  .admin-service-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .admin-service-card {
    display: block;
  }

  .admin-service-card > img {
    width: 100%;
    height: 86px;
    object-fit: cover;
    object-position: center;
  }

  .admin-service-card-body {
    min-width: 0;
    padding: 11px;
  }

  .admin-service-card-body .pill {
    position: static;
    display: inline-block;
    margin-bottom: 8px;
  }

  .admin-service-card-body strong {
    padding-right: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .service-actions {
    gap: 5px;
  }

  .service-actions button {
    width: 27px;
    height: 27px;
  }

  .visual-service-grid {
    grid-template-columns: 1fr;
  }

  .feedback-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .feedback-card {
    padding: 20px;
  }

  .review-form {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .rating-picker {
    gap: 9px;
  }

  .rating-picker button {
    width: 44px;
    height: 44px;
  }

  .review-submit {
    justify-self: stretch;
    width: 100%;
  }

  .review-thanks {
    flex-direction: column;
    gap: 10px;
  }

  .visual-service-card {
    display: grid;
    grid-template-columns: 90px 1fr;
  }

  .visual-service-card img {
    height: 90px;
  }
}

@media (min-width: 1000px) {
  .dashboard-shell {
    padding-top: 42px;
  }

  .customer-hero {
    height: 390px;
  }

  .customer-hero-overlay {
    padding: 58px;
  }

  .customer-hero h2 {
    font-size: 58px;
  }

  .welcome-card {
    padding: 44px;
  }

  .welcome-card h2 {
    font-size: 48px;
  }
}

.booking-modal-backdrop {
  position: fixed;
  z-index: 20;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(37, 27, 24, 0.58);
  backdrop-filter: blur(5px);
}

.booking-modal {
  width: min(100%, 560px);
  max-height: min(92vh, 860px);
  overflow-y: auto;
  padding: 24px;
  border: 1px solid #eee3de;
  border-radius: 24px;
  background: #fff;
  color: #3b3331;
  box-shadow: 0 24px 80px rgba(37, 27, 24, 0.25);
}

.booking-modal-header,
.booking-modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.booking-modal-header h2 {
  margin: 7px 0 0;
  color: #332d2c;
  font: 600 26px/1.15 Georgia, serif;
}

.modal-close {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: #f7f1ee;
  color: #695b56;
  font-size: 24px;
  cursor: pointer;
}

.booking-summary {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 12px;
  margin: 20px 0;
  padding: 14px;
  border: 1px solid #f0e5e0;
  border-radius: 14px;
  background: #fcf8f6;
}

.booking-summary span {
  grid-column: 1;
  color: #8d7e79;
  font-size: 12px;
}

.booking-summary strong:last-child {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
  color: #a85e50;
}

.booking-details-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 13px;
}

.booking-details-form > label {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 7px;
}

.booking-details-form > label > span,
.payment-methods legend {
  color: #62534e;
  font-size: 12px;
  font-weight: 700;
}

.booking-details-form small {
  color: #a39791;
  font-size: 10px;
  font-weight: 400;
}

.booking-details-form input,
.booking-details-form select {
  box-sizing: border-box;
  width: 100%;
  min-height: 44px;
  padding: 11px 12px;
  border: 1px solid #e5d9d4;
  border-radius: 11px;
  outline: none;
  background-color: #fff;
  color: #3b3331;
  color-scheme: light;
  font: inherit;
  font-size: 13px;
}

.booking-details-form input:focus,
.booking-details-form select:focus {
  border-color: #bf7a6b;
  box-shadow: 0 0 0 3px rgba(191, 122, 107, 0.14);
}

.payment-methods {
  grid-column: 1 / -1;
  min-width: 0;
  margin: 4px 0 0;
  padding: 0;
  border: 0;
}

.payment-methods legend {
  margin-bottom: 9px;
}

.payment-method-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.payment-option {
  display: flex;
  min-height: 45px;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  border: 1px solid #e9ded9;
  border-radius: 12px;
  background: #fff;
  color: #554843;
  font-size: 12px;
  cursor: pointer;
}

.payment-logo {
  display: grid;
  flex: 0 0 28px;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  font-size: 15px;
  font-weight: 800;
}

.gcash-logo {
  background: #e8f4ff;
  color: #007df0;
  font-style: italic;
}

.maya-logo {
  background: #e8f8f1;
  color: #00a66c;
}

.bank-logo {
  background: #f0eef9;
  color: #6554a4;
  font-size: 17px;
}

.cash-logo {
  background: #fff3e5;
  color: #b87929;
  font-size: 17px;
}

.payment-option:has(input:checked) {
  border-color: #c8806f;
  background: #fff7f4;
  box-shadow: 0 0 0 2px rgba(191, 122, 107, 0.1);
}

.payment-option input {
  width: 16px;
  min-height: 16px;
  margin: 0;
  accent-color: #a85e50;
}

.payment-note {
  grid-column: 1 / -1;
  margin: 0;
  color: #847771;
  font-size: 11px;
  line-height: 1.5;
}

.booking-error {
  grid-column: 1 / -1;
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff1ef;
  color: #a64e43;
  font-size: 12px;
}

.booking-modal-actions {
  grid-column: 1 / -1;
  justify-content: flex-end;
  margin-top: 3px;
}

.modal-cancel {
  min-height: 42px;
  padding: 10px 15px;
  border: 1px solid #e6d9d4;
  border-radius: 12px;
  background: #fff;
  color: #735f58;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.booking-modal-actions .primary-button:disabled {
  opacity: 0.65;
  cursor: wait;
}

@media (max-width: 560px) {
  .booking-modal-backdrop {
    align-items: end;
    padding: 0;
  }

  .booking-modal {
    width: 100%;
    max-height: 94vh;
    padding: 22px 18px max(20px, env(safe-area-inset-bottom));
    border-radius: 24px 24px 0 0;
  }

  .booking-details-form {
    grid-template-columns: 1fr;
  }

  .payment-methods,
  .payment-note,
  .booking-error,
  .booking-modal-actions {
    grid-column: 1;
  }

  .booking-modal-actions {
    display: grid;
    grid-template-columns: 1fr 1.7fr;
  }
}
</style>
<style scoped>
.admin-hero { position:relative; min-height:310px; overflow:hidden; display:flex; align-items:center; margin-top:28px; padding:42px 48px; border-radius:30px; background:linear-gradient(115deg,#342c2b 0%,#58413c 58%,#8d6256 100%); color:#fff; box-shadow:0 20px 50px rgba(67,45,38,.16); }
.admin-management-panel { background:transparent; border:0; padding:0; }
.admin-management-panel .panel-heading { padding:24px; border-radius:20px; background:#fff; border:1px solid #eee8e4; }
.admin-management-panel .staff-form,
.admin-management-panel .service-form { padding:22px; border-radius:20px; background:#fff; border:1px solid #eee8e4; }
.admin-management-panel .admin-service-grid { padding:0; }
.admin-hero-copy { position:relative; z-index:1; max-width:540px; }.admin-hero .eyebrow { color:#e7b9aa; }.admin-hero h2 { margin:13px 0 12px; font:400 48px/1.03 Georgia,serif; letter-spacing:-1px; }.admin-hero h2 em { color:#e9b9a9; }.admin-hero p { max-width:430px; color:#d5c1bb; font-size:13px; line-height:1.55; }.hero-meta { display:flex; gap:28px; margin-top:28px; color:#cdb6ae; font-size:11px; }.hero-meta strong { color:#fff; font:600 19px Georgia,serif; margin-right:4px; }.admin-hero-art { position:absolute; right:40px; bottom:0; width:340px; height:100%; }.admin-hero-art .art-circle { position:absolute; width:260px; height:260px; top:35px; right:0; border-radius:50%; background:rgba(238,197,183,.2); }.admin-hero-art img { position:absolute; right:18px; bottom:0; width:230px; height:285px; object-fit:cover; object-position:center top; border-radius:130px 130px 0 0; mix-blend-mode:screen; opacity:.82; }.panel-badge { border:1px solid #e8c1b5; border-radius:20px; padding:7px 10px; color:#b2695a; font-size:9px; font-weight:800; letter-spacing:1px; }.stat-card { position:relative; overflow:hidden; min-height:112px; }.stat-card small { display:block; color:#b4a7a3; font-size:10px; margin-top:7px; }.stat-symbol { position:absolute; top:15px; right:17px; width:29px; height:29px; display:grid; place-items:center; border-radius:10px; font-size:17px; }.stat-symbol.blush { background:#f7e1da; color:#bd7969; }.stat-symbol.gold { background:#f5e8c7; color:#aa853d; }.stat-symbol.lilac { background:#e9e3f2; color:#8979a0; }.admin-service-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:14px; margin-top:10px; }.admin-service-card { overflow:hidden; border:1px solid #f0e5e0; border-radius:17px; background:#fff; transition:transform .2s,box-shadow .2s; }.admin-service-card:hover { transform:translateY(-3px); box-shadow:0 10px 24px rgba(89,61,52,.1); }.admin-service-card > img { display:block; width:100%; height:150px; object-fit:cover; object-position:center; }.admin-service-card-body { position:relative; padding:15px; }.admin-service-card-body strong { display:block; margin-bottom:6px; color:#3b3331; font-size:14px; }.admin-service-card-body small { color:#a09692; font-size:10px; }.admin-service-card-body i { font-style:normal; margin:0 3px; color:#d0b1a8; }.service-actions { display:flex; gap:6px; margin-top:13px; }.service-actions button { width:29px; height:29px; border:1px solid #eadbd5; border-radius:9px; background:#fffaf8; color:#9c6256; font-size:15px; line-height:1; cursor:pointer; }.service-actions button:last-child { color:#b25e52; }.cancel-button { min-height:42px; border:1px solid #eadbd5; border-radius:12px; padding:12px 16px; background:#fffaf8; color:#8d6259; font-size:11px; font-weight:800; white-space:nowrap; }
@media (max-width:700px) { .admin-hero { min-height:300px; margin-top:22px; padding:28px 24px; align-items:flex-start; }.admin-hero h2 { font-size:36px; }.admin-hero p { max-width:220px; font-size:11px; }.admin-hero-art { right:-50px; width:235px; opacity:.72; }.admin-hero-art img { width:175px; height:235px; right:0; }.admin-hero-art .art-circle { width:190px; height:190px; top:42px; }.hero-meta { gap:14px; margin-top:22px; flex-direction:column; }.admin-service-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }.admin-service-card { display:flex; flex-direction:column; min-width:0; }.admin-service-card > img { width:100%; height:125px; object-fit:cover; object-position:center; }.admin-service-card-body { min-width:0; padding:13px; }.admin-service-card-body strong { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }.service-actions { gap:5px; }.service-actions button { width:27px; height:27px; }.panel-badge { display:none; } }
</style>
