import { create } from "zustand"
import type { CartItem, Product } from "@/types"

interface CartState {
  items: CartItem[]
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  totalAmount: () => number
  totalItems: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (product: Product) => {
    const currentItems = get().items
    const existingIndex = currentItems.findIndex((i) => i.productId === product.id)

    if (existingIndex > -1) {
      const existing = currentItems[existingIndex]
      if (existing.quantity >= product.stock) {
        return // Stok tidak mencukupi
      }
      const updated = [...currentItems]
      updated[existingIndex] = {
        ...existing,
        quantity: existing.quantity + 1,
      }
      set({ items: updated })
    } else {
      if (product.stock < 1) return
      set({
        items: [
          ...currentItems,
          {
            productId: product.id,
            productName: product.name,
            price: product.price,
            quantity: 1,
            stock: product.stock,
          },
        ],
      })
    }
  },

  removeItem: (productId: string) => {
    set({ items: get().items.filter((i) => i.productId !== productId) })
  },

  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId)
      return
    }
    const currentItems = get().items
    const existing = currentItems.find((i) => i.productId === productId)
    if (!existing) return

    if (quantity > existing.stock) {
      quantity = existing.stock
    }

    set({
      items: currentItems.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      ),
    })
  },

  clearCart: () => set({ items: [] }),

  totalAmount: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  },

  totalItems: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0)
  },
}))
