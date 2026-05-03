import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
}

interface CartState {
  items: CartItem[];
  customer: { name: string; phone: string; email: string; address: string };
  taxRate: number;
  discount: number;
  discountType: "flat" | "percentage";
  couponCode: string;
  paymentMethod: "cash" | "card" | "mobile";
  add: (p: { id: string; name: string; price: number; stock: number }) => void;
  remove: (id: string) => void;
  setQty: (id: string, q: number) => void;
  setCustomer: (c: Partial<CartState["customer"]>) => void;
  setTaxRate: (r: number) => void;
  setDiscount: (d: number, type: "flat" | "percentage") => void;
  setCoupon: (c: string) => void;
  setPayment: (p: CartState["paymentMethod"]) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customer: { name: "", phone: "", email: "", address: "" },
      taxRate: 0,
      discount: 0,
      discountType: "flat",
      couponCode: "",
      paymentMethod: "cash",
      add: (p) => {
        const existing = get().items.find((i) => i.id === p.id);
        if (existing) {
          set({ items: get().items.map((i) => i.id === p.id ? { ...i, quantity: Math.min(i.quantity + 1, i.stock) } : i) });
        } else {
          set({ items: [...get().items, { ...p, quantity: 1 }] });
        }
      },
      remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
      setQty: (id, q) => set({ items: get().items.map((i) => i.id === id ? { ...i, quantity: Math.max(1, Math.min(q, i.stock)) } : i) }),
      setCustomer: (c) => set({ customer: { ...get().customer, ...c } }),
      setTaxRate: (r) => set({ taxRate: r }),
      setDiscount: (d, type) => set({ discount: d, discountType: type }),
      setCoupon: (c) => set({ couponCode: c }),
      setPayment: (p) => set({ paymentMethod: p }),
      clear: () => set({
        items: [], customer: { name: "", phone: "", email: "", address: "" },
        discount: 0, couponCode: "", paymentMethod: "cash",
      }),
    }),
    { name: "supershop-cart" }
  )
);

export function calcTotals(s: ReturnType<typeof useCart.getState>) {
  const subtotal = s.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountAmt = s.discountType === "percentage" ? subtotal * (s.discount / 100) : s.discount;
  const afterDiscount = Math.max(0, subtotal - discountAmt);
  const tax = afterDiscount * (s.taxRate / 100);
  const total = afterDiscount + tax;
  return { subtotal, discountAmt, tax, total };
}
