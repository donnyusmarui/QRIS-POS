// ─── Permission Keys ─────────────────────────────────────
export const PERMISSIONS = [
  "products:read",
  "products:write",
  "products:delete",
  "transactions:create",
  "transactions:void",
  "transactions:read_all",
  "inventory:manage",
  "customers:manage",
  "reports:view",
  "users:manage",
  "settings:manage",
] as const

export type Permission = (typeof PERMISSIONS)[number]

// ─── Role ────────────────────────────────────────────────
export interface Role {
  id: string
  name: string
  permissions: Permission[]
}

// ─── Auth ────────────────────────────────────────────────
export interface AuthUser {
  id: string
  email: string
  fullName: string
  roles: Role[]
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse {
  user: AuthUser
  tokens: AuthTokens
}

// ─── Product ─────────────────────────────────────────────
export interface Product {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  category: string | null
  imageUrl: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductFormData {
  name: string
  sku: string
  price: number
  stock: number
  category?: string
  imageUrl?: string
}

// ─── Customer ────────────────────────────────────────────
export interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  createdAt: string
}

export interface CustomerFormData {
  name: string
  phone?: string
  email?: string
  address?: string
}

// ─── Transaction ─────────────────────────────────────────
export type PaymentMethod = "cash" | "qris" | "transfer"
export type TransactionStatus = "pending" | "paid" | "voided"

export interface TransactionItem {
  id: string
  productId: string
  productName: string
  price: number
  quantity: number
  subtotal: number
}

export interface Transaction {
  id: string
  userId: string
  customerId: string | null
  totalAmount: number
  paymentMethod: PaymentMethod
  qrisRefId: string | null
  status: TransactionStatus
  notes: string | null
  items: TransactionItem[]
  createdAt: string
}

// ─── Cart (Frontend-only) ────────────────────────────────
export interface CartItem {
  productId: string
  productName: string
  price: number
  quantity: number
  stock: number
}

// ─── Inventory ───────────────────────────────────────────
export interface InventoryLogEntry {
  id: string
  productId: string
  changeQty: number
  reason: string
  createdBy: string
  createdAt: string
}

// ─── API Response ────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}
