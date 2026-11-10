export interface Product {
  id: string;
  name: string;
  category: 'Tops' | 'Bottoms' | 'Outerwear' | 'Accessories';
  condition: string;
  size: string;
  price: number;
  tag?: string;
  image: string;
}

export const products: Product[] = [
  {
    id: 'linen-day-shirt',
    name: 'Linen Day Shirt',
    category: 'Tops',
    condition: 'Like new',
    size: 'M',
    price: 420,
    tag: 'Just in',
    image: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 'classic-straight-denim',
    name: 'Classic Straight Denim',
    category: 'Bottoms',
    condition: 'Great condition',
    size: '28',
    price: 580,
    tag: 'Vintage',
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 'weekend-leather-jacket',
    name: 'Weekend Leather Jacket',
    category: 'Outerwear',
    condition: 'Gently loved',
    size: 'L',
    price: 1250,
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 'everyday-shoulder-bag',
    name: 'Everyday Shoulder Bag',
    category: 'Accessories',
    condition: 'Like new',
    size: 'One size',
    price: 690,
    tag: 'Staff pick',
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 'soft-cotton-tee',
    name: 'Soft Cotton Tee',
    category: 'Tops',
    condition: 'Great condition',
    size: 'S',
    price: 250,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 'easy-wear-trousers',
    name: 'Easy Wear Trousers',
    category: 'Bottoms',
    condition: 'Like new',
    size: 'M',
    price: 480,
    image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 'weekend-denim-jacket',
    name: 'Weekend Denim Jacket',
    category: 'Outerwear',
    condition: 'Gently loved',
    size: 'M',
    price: 820,
    tag: 'One of a kind',
    image: 'https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 'canvas-market-tote',
    name: 'Canvas Market Tote',
    category: 'Accessories',
    condition: 'Great condition',
    size: 'One size',
    price: 320,
    image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=700&q=80',
  },
];
