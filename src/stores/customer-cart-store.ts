import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Product } from "@/types"

export interface CartItem {
  product: Product
  quantity: number
  notes?: string
}

export type OrderType = "dine_in" | "takeaway"
export type PaymentChannel = "qris" | "transfer" | "gopay"

export interface CustomerInfo {
  name: string
  orderType: OrderType
  tableNumber?: string
  phone?: string
}

interface CustomerCartState {
  cart: CartItem[]
  customerInfo: CustomerInfo
  selectedPayment: PaymentChannel
  selectedBank: "BCA" | "Mandiri" | "BRI" | "BNI"

  // Actions
  addToCart: (product: Product, notes?: string) => { success: boolean; message?: string }
  updateQuantity: (productId: string, quantity: number) => void
  updateNotes: (productId: string, notes: string) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
  setCustomerInfo: (info: Partial<CustomerInfo>) => void
  setSelectedPayment: (channel: PaymentChannel) => void
  setSelectedBank: (bank: "BCA" | "Mandiri" | "BRI" | "BNI") => void

  // Calculations
  getTotalItems: () => number
  getSubtotal: () => number
}

export const useCustomerCartStore = create<CustomerCartState>()(
  persist(
    (set, get) => ({
      cart: [],
      customerInfo: {
        name: "",
        orderType: "dine_in",
        tableNumber: "01",
        phone: "",
      },
      selectedPayment: "qris",
      selectedBank: "BCA",

      addToCart: (product, notes) => {
        const { cart } = get()
        const existing = cart.find((i) => i.product.id === product.id)
        const currentQty = existing ? existing.quantity : 0

        if (currentQty + 1 > product.stock) {
          return { success: false, message: `Stok hanya tersisa ${product.stock} porsi` }
        }

        if (existing) {
          set({
            cart: cart.map((i) =>
              i.product.id === product.id
                ? { ...i, quantity: i.quantity + 1, notes: notes !== undefined ? notes : i.notes }
                : i
            ),
          })
        } else {
          set({
            cart: [...cart, { product, quantity: 1, notes: notes || "" }],
          })
        }
        return { success: true }
      },

      updateQuantity: (productId, quantity) => {
        const { cart } = get()
        if (quantity <= 0) {
          set({ cart: cart.filter((i) => i.product.id !== productId) })
          return
        }

        const item = cart.find((i) => i.product.id === productId)
        if (item && quantity > item.product.stock) {
          quantity = item.product.stock
        }

        set({
          cart: cart.map((i) =>
            i.product.id === productId ? { ...i, quantity } : i
          ),
        })
      },

      updateNotes: (productId, notes) => {
        const { cart } = get()
        set({
          cart: cart.map((i) =>
            i.product.id === productId ? { ...i, notes } : i
          ),
        })
      },

      removeFromCart: (productId) => {
        const { cart } = get()
        set({ cart: cart.filter((i) => i.product.id !== productId) })
      },

      clearCart: () => {
        set({ cart: [] })
      },

      setCustomerInfo: (info) => {
        set((state) => ({
          customerInfo: { ...state.customerInfo, ...info },
        }))
      },

      setSelectedPayment: (selectedPayment) => {
        set({ selectedPayment })
      },

      setSelectedBank: (selectedBank) => {
        set({ selectedBank })
      },

      getTotalItems: () => {
        return get().cart.reduce((sum, item) => sum + item.quantity, 0)
      },

      getSubtotal: () => {
        return get().cart.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0
        )
      },
    }),
    {
      name: "qris-pos-customer-cart",
      partialize: (state) => ({
        cart: state.cart,
        customerInfo: state.customerInfo,
        selectedPayment: state.selectedPayment,
        selectedBank: state.selectedBank,
      }),
    }
  )
)
