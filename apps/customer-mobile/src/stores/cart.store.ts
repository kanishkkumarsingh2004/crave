import { create } from "zustand";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  vendorId: string;
  vendorName: string;
  sku: string;
  image?: string | null;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTax: () => number;
  getDeliveryFee: () => number;
  getTotal: () => number;
}

const FLAT_DELIVERY_FEE = 49;
const TAX_RATE = 0.18; // 18% GST

export const useCartStore = create<CartState>((set, get) => ({
  items: [
    {
      id: "prod-1",
      name: "Fresh Farm Organic Milk (1L)",
      price: 65,
      quantity: 2,
      vendorId: "v-1",
      vendorName: "FreshMart Organics",
      sku: "MILK-001",
    },
    {
      id: "prod-2",
      name: "Whole Wheat Artisanal Bread",
      price: 45,
      quantity: 1,
      vendorId: "v-1",
      vendorName: "FreshMart Organics",
      sku: "BREAD-001",
    },
  ],

  addItem: (newItem) => {
    const { items } = get();

    // Check if adding item from a different vendor
    if (items.length > 0 && items[0].vendorId !== newItem.vendorId) {
      // Clear cart when changing vendor (Single-Vendor Cart Enforcement)
      set({ items: [{ ...newItem, quantity: 1 }] });
      return;
    }

    const existingIndex = items.findIndex((i) => i.id === newItem.id);
    if (existingIndex > -1) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      set({ items: updated });
    } else {
      set({ items: [...items, { ...newItem, quantity: 1 }] });
    }
  },

  removeItem: (id) => {
    set({ items: get().items.filter((i) => i.id !== id) });
  },

  updateQuantity: (id, delta) => {
    const { items } = get();
    const updated = items
      .map((item) => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter((item): item is CartItem => item !== null);

    set({ items: updated });
  },

  clearCart: () => set({ items: [] }),

  getSubtotal: () => {
    return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  },

  getTax: () => {
    const subtotal = get().getSubtotal();
    return Math.round(subtotal * TAX_RATE * 100) / 100;
  },

  getDeliveryFee: () => {
    const subtotal = get().getSubtotal();
    if (subtotal === 0) return 0;
    return subtotal >= 500 ? 0 : FLAT_DELIVERY_FEE;
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    if (subtotal === 0) return 0;
    return subtotal + get().getTax() + get().getDeliveryFee();
  },
}));
