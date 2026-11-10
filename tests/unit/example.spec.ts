import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { StoreOrder } from '@/types/marketplace';
import BagPage from '@/views/BagPage.vue';
import HomePage from '@/views/HomePage.vue';

const mocks = vi.hoisted(() => ({
  firebaseConfigured: false,
  orderListener: null as ((orders: StoreOrder[]) => void) | null,
  routeQuery: {} as { checkout?: string },
  routerPush: vi.fn(async () => {}),
  routerReplace: vi.fn(async () => {}),
  signIn: vi.fn(async () => {}),
  placeCashOrder: vi.fn(async () => ['order-1']),
  session: {
    ready: true,
    user: null as { uid: string } | null,
    profile: null as {
      uid: string;
      email: string;
      displayName: string;
      role: 'customer' | 'seller' | 'staff' | 'admin';
      active: boolean;
      createdAt: string;
      phone?: string;
      address?: string;
    } | null,
    error: '',
  },
}));

vi.mock('@/firebase', () => ({
  get isFirebaseConfigured() {
    return mocks.firebaseConfigured;
  },
  authReady: Promise.resolve(),
  session: mocks.session,
  signOutUser: vi.fn(),
  signIn: mocks.signIn,
  registerCustomer: vi.fn(),
}));

vi.mock('@/services/marketplace', () => ({
  applyForSeller: vi.fn(),
  cancelOrder: vi.fn(),
  placeCashOrder: mocks.placeCashOrder,
  registerInvitedStaff: vi.fn(),
  watchAvailableProducts: vi.fn(() => vi.fn()),
  watchOrders: vi.fn((_role, _uid, onData) => {
    mocks.orderListener = onData;
    return [vi.fn()];
  }),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: mocks.routeQuery }),
  useRouter: () => ({ push: mocks.routerPush, replace: mocks.routerReplace }),
}));

describe('HomePage.vue', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.firebaseConfigured = false;
    mocks.session.user = null;
    mocks.session.profile = null;
    mocks.session.error = '';
    mocks.orderListener = null;
    mocks.routeQuery = {};
    mocks.routerPush.mockClear();
    mocks.routerReplace.mockClear();
    mocks.signIn.mockClear();
    mocks.placeCashOrder.mockClear();
    mocks.placeCashOrder.mockResolvedValue(['order-1']);
  });

  const mountHomePage = () =>
    mount(HomePage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    });

  test('renders the storefront and sample listings', () => {
    const wrapper = mountHomePage();
    expect(wrapper.text()).toContain('Find your next');
    expect(wrapper.text()).toContain('Today’s finds');
    expect(wrapper.findAll('.product-card')).toHaveLength(8);
  });

  test('filters listings by search and category', async () => {
    const wrapper = mountHomePage();
    await wrapper.get('input[aria-label="Search items"]').setValue('denim');
    expect(wrapper.findAll('.product-card')).toHaveLength(2);

    await wrapper.get('input[aria-label="Search items"]').setValue('');
    await wrapper.get('.filter-chip:nth-child(3)').trigger('click');
    expect(wrapper.findAll('.product-card')).toHaveLength(2);
  });

  test('filters preview listings by maximum price and size', async () => {
    const wrapper = mountHomePage();
    await wrapper.get('label:has(input[placeholder="No limit"]) input').setValue('400');
    expect(wrapper.findAll('.product-card')).toHaveLength(2);

    await wrapper.get('label:has(select) select').setValue('One size');
    expect(wrapper.findAll('.product-card')).toHaveLength(1);
    expect(wrapper.text()).toContain('Canvas Market Tote');
  });

  test('saves and filters wishlist items', async () => {
    const wrapper = mountHomePage();
    await wrapper.get('.favorite-button').trigger('click');
    await wrapper.get('.wishlist-toggle').trigger('click');
    expect(wrapper.findAll('.product-card')).toHaveLength(1);
    expect(wrapper.text()).toContain('Linen Day Shirt');
  });

  test('opens the separate bag page when an item is added, and removes it there', async () => {
    const wrapper = mountHomePage();
    await wrapper.get('.buy-button').trigger('click');
    expect(mocks.routerPush).toHaveBeenCalledWith({ name: 'Bag' });
    expect(JSON.parse(localStorage.getItem('triftmark-cart') ?? '[]')).toHaveLength(1);

    const bag = mount(BagPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    });
    expect(bag.findAll('.bag-item')).toHaveLength(1);
    await bag.get('.remove-button').trigger('click');
    expect(bag.findAll('.bag-item')).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem('triftmark-cart') ?? '[]')).toHaveLength(0);
  });

  test('requires sign-in before allowing a guest to checkout', async () => {
    mocks.firebaseConfigured = true;
    mocks.routeQuery = { checkout: '1' };
    localStorage.setItem(
      'triftmark-cart',
      JSON.stringify([
        {
          id: 'item-1',
          name: 'Linen Day Shirt',
          description: 'A pre-loved shirt.',
          category: 'Tops',
          condition: 'Like new',
          size: 'M',
          price: 420,
          image: 'https://example.com/shirt.jpg',
          status: 'active',
          staffId: 'seller-1',
        },
      ]),
    );
    const wrapper = mountHomePage();
    await flushPromises();

    expect(wrapper.text()).toContain('Sign in before checkout.');
    expect(wrapper.find('.checkout-modal').exists()).toBe(false);
    expect(wrapper.text()).toContain('Your bag will be saved.');
    expect(mocks.placeCashOrder).not.toHaveBeenCalled();
  });

  test('staff cannot use shopping or saved-item controls', () => {
    mocks.session.user = { uid: 'staff-1' };
    mocks.session.profile = {
      uid: 'staff-1',
      email: 'staff@example.com',
      displayName: 'Staff User',
      role: 'staff',
      active: true,
      createdAt: '',
    };
    const wrapper = mountHomePage();
    expect(wrapper.text()).toContain('Staff desk');
    expect(wrapper.text()).not.toContain('Change status');
    expect(wrapper.find('.cart-panel').exists()).toBe(false);
    expect(wrapper.find('.cart-trigger').exists()).toBe(false);
    expect(wrapper.find('.favorite-button').exists()).toBe(false);
    expect(wrapper.find('.buy-button').exists()).toBe(false);
  });

  test('requires valid delivery details and COD before reviewing checkout', async () => {
    mocks.firebaseConfigured = true;
    mocks.session.user = { uid: 'customer-1' };
    mocks.session.profile = {
      uid: 'customer-1',
      email: 'buyer@example.com',
      displayName: '',
      role: 'customer',
      active: true,
      createdAt: '',
    };
    localStorage.setItem(
      'triftmark-cart',
      JSON.stringify([
        {
          id: 'item-1',
          name: 'Linen Day Shirt',
          description: 'A pre-loved shirt.',
          category: 'Tops',
          condition: 'Like new',
          size: 'M',
          price: 420,
          image: 'https://example.com/shirt.jpg',
          status: 'active',
          staffId: 'seller-1',
        },
      ]),
    );
    mocks.routeQuery = { checkout: '1' };
    const wrapper = mountHomePage();
    await flushPromises();
    const checkoutForm = wrapper.get('.checkout-form');

    await checkoutForm.trigger('submit');
    expect(wrapper.text()).toContain('Enter your full name.');

    await wrapper.get('input[autocomplete="name"]').setValue('Buyer One');
    await wrapper.get('input[autocomplete="tel"]').setValue('not-a-phone');
    await wrapper.get('textarea[autocomplete="street-address"]').setValue('123 Sample Street');
    await checkoutForm.trigger('submit');
    expect(wrapper.text()).toContain('Enter a valid mobile number');

    await wrapper.get('input[autocomplete="tel"]').setValue('09123456789');
    await checkoutForm.trigger('submit');
    expect(wrapper.text()).toContain('Select Cash on delivery');

    await wrapper.get('input[type="radio"]').setValue('cash_on_delivery');
    await checkoutForm.trigger('submit');
    expect(wrapper.text()).toContain('Ready to order.');
    expect(wrapper.text()).toContain('Cash on delivery');
    expect(mocks.placeCashOrder).not.toHaveBeenCalled();
  });

  test('places the reviewed order and displays its live status', async () => {
    mocks.firebaseConfigured = true;
    mocks.session.user = { uid: 'customer-1' };
    mocks.session.profile = {
      uid: 'customer-1',
      email: 'buyer@example.com',
      displayName: 'Buyer One',
      role: 'customer',
      active: true,
      createdAt: '',
      phone: '09123456789',
      address: '123 Sample Street',
    };
    localStorage.setItem(
      'triftmark-cart',
      JSON.stringify([
        {
          id: 'item-1',
          name: 'Linen Day Shirt',
          description: 'A pre-loved shirt.',
          category: 'Tops',
          condition: 'Like new',
          size: 'M',
          price: 420,
          image: 'https://example.com/shirt.jpg',
          status: 'active',
          staffId: 'seller-1',
        },
      ]),
    );
    mocks.routeQuery = { checkout: '1' };
    const wrapper = mountHomePage();
    await flushPromises();
    await wrapper.get('input[type="radio"]').setValue('cash_on_delivery');
    await wrapper.get('.checkout-form').trigger('submit');
    await wrapper.get('.checkout-review .primary-button').trigger('click');

    expect(mocks.placeCashOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerName: 'Buyer One',
        phone: '09123456789',
        address: '123 Sample Street',
        products: [expect.objectContaining({ id: 'item-1' })],
      }),
    );
    expect(wrapper.text()).toContain('Your order is placed.');
    expect(wrapper.text()).toContain('Order placed successfully');
    expect(wrapper.text()).toContain('Pay by cash when your delivery arrives.');
    await wrapper.get('.checkout-modal .primary-button').trigger('click');
    expect(wrapper.text()).toContain('My orders');
    expect(wrapper.text()).toContain('Your orders will show up here.');

    const order: StoreOrder = {
      id: 'order-1',
      buyerId: 'customer-1',
      buyerName: 'Buyer One',
      phone: '09123456789',
      address: '123 Sample Street',
      item: { id: 'item-1', name: 'Linen Day Shirt', image: 'https://example.com/shirt.jpg', size: 'M', price: 420 },
      total: 420,
      paymentMethod: 'cash_on_delivery',
      status: 'pending',
      staffId: null,
    };
    mocks.orderListener?.([order]);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Order received · waiting for staff');
    expect(wrapper.text()).toContain('Order placed');
    expect(wrapper.text()).toContain('Delivery assigned');

    mocks.orderListener?.([{ ...order, status: 'claimed', staffId: 'staff-1' }]);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Out for delivery');

    mocks.orderListener?.([{ ...order, status: 'delivered', staffId: 'staff-1' }]);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Delivered');
  });

  test('shows an empty preview state and can reset filters', async () => {
    const wrapper = mountHomePage();
    await wrapper.get('input[aria-label="Search items"]').setValue('not a real item');
    expect(wrapper.text()).toContain('The shop is getting ready.');

    await wrapper.get('.empty-state button').trigger('click');
    expect(wrapper.findAll('.product-card')).toHaveLength(8);
  });

  test('clearly marks sample listings as preview-only', () => {
    const wrapper = mountHomePage();
    expect(wrapper.text()).toContain('Preview mode.');
  });
});
