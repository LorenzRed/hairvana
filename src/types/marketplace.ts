export type UserRole = 'admin' | 'staff' | 'customer' | 'seller';
export type ProductCategory = 'Tops' | 'Bottoms' | 'Outerwear' | 'Accessories' | 'Shoes' | 'Home';
export type ProductStatus = 'active' | 'reserved' | 'sold' | 'archived';
export type OrderStatus = 'pending' | 'claimed' | 'delivered' | 'cancelled';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  phone?: string;
  address?: string;
  sellerStatus?: 'pending' | 'approved' | 'rejected';
  sellerDescription?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  condition: string;
  size: string;
  price: number;
  image: string;
  tag?: string;
  status: ProductStatus;
  staffId: string;
  brand?: string;
  color?: string;
  createdAt?: unknown;
}

export interface StoreOrder {
  id: string;
  buyerId: string;
  buyerName: string;
  phone: string;
  address: string;
  item: Pick<Product, 'id' | 'name' | 'image' | 'size' | 'price'>;
  sellerId?: string;
  total: number;
  paymentMethod: 'cash_on_delivery';
  status: OrderStatus;
  staffId: string | null;
  deliveredAt?: unknown;
  createdAt?: unknown;
}
