import "dotenv/config"
import {
  pgTable,
  text as pgText,
  integer as pgInteger,
  doublePrecision as pgDouble,
  boolean as pgBoolean,
  timestamp as pgTimestamp,
  jsonb as pgJsonb,
} from "drizzle-orm/pg-core"
import {
  sqliteTable,
  text as sqText,
  integer as sqInteger,
  real as sqReal,
} from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"

export function getEnv(key: string): string | undefined {
  try {
    if (typeof (globalThis as any).Netlify !== "undefined" && (globalThis as any).Netlify?.env?.get) {
      const v = (globalThis as any).Netlify.env.get(key)
      if (v) return v
    }
  } catch {}
  return process.env[key]
}

export const isPg = Boolean(
  getEnv("DATABASE_URL") &&
    (getEnv("DATABASE_URL")!.startsWith("postgres://") ||
      getEnv("DATABASE_URL")!.startsWith("postgresql://"))
)

// ─── PostgreSQL Tables (Neon Serverless) ─────────────────
export const pgRoles = pgTable("roles", {
  id: pgText("id").primaryKey(),
  name: pgText("name").notNull().unique(),
  permissions: pgJsonb("permissions").$type<string[]>().notNull(),
  createdAt: pgTimestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
})

export const pgUsers = pgTable("users", {
  id: pgText("id").primaryKey(),
  email: pgText("email").notNull().unique(),
  password: pgText("password").notNull(),
  fullName: pgText("full_name").notNull(),
  isActive: pgBoolean("is_active").notNull().default(true),
  createdAt: pgTimestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  updatedAt: pgTimestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
})

export const pgUserRoles = pgTable("user_roles", {
  id: pgText("id").primaryKey(),
  userId: pgText("user_id")
    .notNull()
    .references(() => pgUsers.id, { onDelete: "cascade" }),
  roleId: pgText("role_id")
    .notNull()
    .references(() => pgRoles.id, { onDelete: "cascade" }),
})

export const pgProducts = pgTable("products", {
  id: pgText("id").primaryKey(),
  name: pgText("name").notNull(),
  sku: pgText("sku").notNull().unique(),
  price: pgDouble("price").notNull(),
  stock: pgInteger("stock").notNull().default(0),
  category: pgText("category"),
  imageUrl: pgText("image_url"),
  isActive: pgBoolean("is_active").notNull().default(true),
  createdAt: pgTimestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  updatedAt: pgTimestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
})

export const pgCustomers = pgTable("customers", {
  id: pgText("id").primaryKey(),
  name: pgText("name").notNull(),
  phone: pgText("phone"),
  email: pgText("email"),
  address: pgText("address"),
  createdAt: pgTimestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
})

export const pgTransactions = pgTable("transactions", {
  id: pgText("id").primaryKey(),
  userId: pgText("user_id")
    .notNull()
    .references(() => pgUsers.id),
  customerId: pgText("customer_id").references(() => pgCustomers.id),
  totalAmount: pgDouble("total_amount").notNull(),
  paymentMethod: pgText("payment_method").notNull(),
  qrisRefId: pgText("qris_ref_id"),
  status: pgText("status").notNull().default("pending"),
  notes: pgText("notes"),
  createdAt: pgTimestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
})

export const pgTransactionItems = pgTable("transaction_items", {
  id: pgText("id").primaryKey(),
  transactionId: pgText("transaction_id")
    .notNull()
    .references(() => pgTransactions.id, { onDelete: "cascade" }),
  productId: pgText("product_id")
    .notNull()
    .references(() => pgProducts.id),
  productName: pgText("product_name").notNull(),
  price: pgDouble("price").notNull(),
  quantity: pgInteger("quantity").notNull(),
  subtotal: pgDouble("subtotal").notNull(),
})

export const pgInventoryLog = pgTable("inventory_log", {
  id: pgText("id").primaryKey(),
  productId: pgText("product_id")
    .notNull()
    .references(() => pgProducts.id),
  changeQty: pgInteger("change_qty").notNull(),
  reason: pgText("reason").notNull(),
  createdBy: pgText("created_by")
    .notNull()
    .references(() => pgUsers.id),
  createdAt: pgTimestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
})

// ─── SQLite Tables (Turso / Local Fallback) ─────────────
export const sqliteRoles = sqliteTable("roles", {
  id: sqText("id").primaryKey(),
  name: sqText("name").notNull().unique(),
  permissions: sqText("permissions", { mode: "json" }).notNull().$type<string[]>(),
  createdAt: sqText("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
})

export const sqliteUsers = sqliteTable("users", {
  id: sqText("id").primaryKey(),
  email: sqText("email").notNull().unique(),
  password: sqText("password").notNull(),
  fullName: sqText("full_name").notNull(),
  isActive: sqInteger("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: sqText("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: sqText("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
})

export const sqliteUserRoles = sqliteTable("user_roles", {
  id: sqText("id").primaryKey(),
  userId: sqText("user_id")
    .notNull()
    .references(() => sqliteUsers.id, { onDelete: "cascade" }),
  roleId: sqText("role_id")
    .notNull()
    .references(() => sqliteRoles.id, { onDelete: "cascade" }),
})

export const sqliteProducts = sqliteTable("products", {
  id: sqText("id").primaryKey(),
  name: sqText("name").notNull(),
  sku: sqText("sku").notNull().unique(),
  price: sqReal("price").notNull(),
  stock: sqInteger("stock").notNull().default(0),
  category: sqText("category"),
  imageUrl: sqText("image_url"),
  isActive: sqInteger("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: sqText("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: sqText("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
})

export const sqliteCustomers = sqliteTable("customers", {
  id: sqText("id").primaryKey(),
  name: sqText("name").notNull(),
  phone: sqText("phone"),
  email: sqText("email"),
  address: sqText("address"),
  createdAt: sqText("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
})

export const sqliteTransactions = sqliteTable("transactions", {
  id: sqText("id").primaryKey(),
  userId: sqText("user_id")
    .notNull()
    .references(() => sqliteUsers.id),
  customerId: sqText("customer_id").references(() => sqliteCustomers.id),
  totalAmount: sqReal("total_amount").notNull(),
  paymentMethod: sqText("payment_method", {
    enum: ["cash", "qris", "transfer", "gopay", "ewallet"],
  }).notNull(),
  qrisRefId: sqText("qris_ref_id"),
  status: sqText("status", {
    enum: ["pending", "paid", "voided"],
  })
    .notNull()
    .default("pending"),
  notes: sqText("notes"),
  createdAt: sqText("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
})

export const sqliteTransactionItems = sqliteTable("transaction_items", {
  id: sqText("id").primaryKey(),
  transactionId: sqText("transaction_id")
    .notNull()
    .references(() => sqliteTransactions.id, { onDelete: "cascade" }),
  productId: sqText("product_id")
    .notNull()
    .references(() => sqliteProducts.id),
  productName: sqText("product_name").notNull(),
  price: sqReal("price").notNull(),
  quantity: sqInteger("quantity").notNull(),
  subtotal: sqReal("subtotal").notNull(),
})

export const sqliteInventoryLog = sqliteTable("inventory_log", {
  id: sqText("id").primaryKey(),
  productId: sqText("product_id")
    .notNull()
    .references(() => sqliteProducts.id),
  changeQty: sqInteger("change_qty").notNull(),
  reason: sqText("reason").notNull(),
  createdBy: sqText("created_by")
    .notNull()
    .references(() => sqliteUsers.id),
  createdAt: sqText("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
})

// ─── Active Dual-Engine Exports ──────────────────────────
export const roles: any = isPg ? pgRoles : sqliteRoles
export const users: any = isPg ? pgUsers : sqliteUsers
export const userRoles: any = isPg ? pgUserRoles : sqliteUserRoles
export const products: any = isPg ? pgProducts : sqliteProducts
export const customers: any = isPg ? pgCustomers : sqliteCustomers
export const transactions: any = isPg ? pgTransactions : sqliteTransactions
export const transactionItems: any = isPg ? pgTransactionItems : sqliteTransactionItems
export const inventoryLog: any = isPg ? pgInventoryLog : sqliteInventoryLog

// ─── Type exports ────────────────────────────────────────
export type Role = typeof pgRoles.$inferSelect
export type NewRole = typeof pgRoles.$inferInsert
export type User = typeof pgUsers.$inferSelect
export type NewUser = typeof pgUsers.$inferInsert
export type Product = typeof pgProducts.$inferSelect
export type NewProduct = typeof pgProducts.$inferInsert
export type Customer = typeof pgCustomers.$inferSelect
export type NewCustomer = typeof pgCustomers.$inferInsert
export type Transaction = typeof pgTransactions.$inferSelect
export type NewTransaction = typeof pgTransactions.$inferInsert
export type TransactionItem = typeof pgTransactionItems.$inferSelect
export type NewTransactionItem = typeof pgTransactionItems.$inferInsert
export type InventoryLogEntry = typeof pgInventoryLog.$inferSelect
export type NewInventoryLogEntry = typeof pgInventoryLog.$inferInsert
