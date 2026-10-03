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
  description: pgText("description"),
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

export const pgAiSettings = pgTable("ai_settings", {
  id: pgText("id").primaryKey(),
  provider: pgText("provider").notNull().default("gemini"),
  modelName: pgText("model_name").notNull().default("gemini-2.0-flash"),
  apiKey: pgText("api_key"),
  baseUrl: pgText("base_url"),
  temperature: pgDouble("temperature").notNull().default(0.4),
  systemPromptOverride: pgText("system_prompt_override"),
  isActive: pgBoolean("is_active").notNull().default(true),
  createdAt: pgTimestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  updatedAt: pgTimestamp("updated_at", { withTimezone: true, mode: "string" })
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
  description: sqText("description"),
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

export const sqliteAiSettings = sqliteTable("ai_settings", {
  id: sqText("id").primaryKey(),
  provider: sqText("provider").notNull().default("gemini"),
  modelName: sqText("model_name").notNull().default("gemini-2.0-flash"),
  apiKey: sqText("api_key"),
  baseUrl: sqText("base_url"),
  temperature: sqReal("temperature").notNull().default(0.4),
  systemPromptOverride: sqText("system_prompt_override"),
  isActive: sqInteger("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: sqText("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: sqText("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
})

// ─── Chat (Human-in-the-Loop) ────────────────────────────
// status: ai | waiting_admin | admin | closed
// stage:  greeting | gathering | consent_asked | recommended
// leadStatus: hot_lead | general_inquiry | waiting_admin | archived
export const pgChatSessions = pgTable("chat_sessions", {
  id: pgText("id").primaryKey(),
  status: pgText("status").notNull().default("ai"),
  stage: pgText("stage").notNull().default("greeting"),
  handoffReason: pgText("handoff_reason"),
  customerName: pgText("customer_name"),
  customerPhone: pgText("customer_phone"),
  leadStatus: pgText("lead_status").notNull().default("general_inquiry"),
  adminNotes: pgText("admin_notes"),
  isArchived: pgBoolean("is_archived").notNull().default(false),
  symptomsJson: pgText("symptoms_json"),
  createdAt: pgText("created_at").notNull(),
  updatedAt: pgText("updated_at").notNull(),
})

export const pgChatMessages = pgTable("chat_messages", {
  id: pgText("id").primaryKey(),
  sessionId: pgText("session_id")
    .notNull()
    .references(() => pgChatSessions.id, { onDelete: "cascade" }),
  sender: pgText("sender").notNull(), // customer | bot | admin
  content: pgText("content").notNull(),
  productsJson: pgText("products_json"),
  createdAt: pgText("created_at").notNull(),
})

export const pgChatbotWelcomeMessages = pgTable("chatbot_welcome_messages", {
  id: pgText("id").primaryKey(),
  title: pgText("title").notNull(),
  content: pgText("content").notNull(),
  isActive: pgBoolean("is_active").notNull().default(false),
  createdAt: pgText("created_at").notNull(),
  updatedAt: pgText("updated_at").notNull(),
})

export const pgProductEmbeddings = pgTable("product_embeddings", {
  id: pgText("id").primaryKey(),
  productId: pgText("product_id")
    .notNull()
    .references(() => pgProducts.id, { onDelete: "cascade" }),
  textChunk: pgText("text_chunk").notNull(),
  embeddingJson: pgText("embedding_json").notNull(),
  metadataJson: pgText("metadata_json"),
  createdAt: pgText("created_at").notNull(),
  updatedAt: pgText("updated_at").notNull(),
})

export const pgChatbotSymptomOptions = pgTable("chatbot_symptom_options", {
  id: pgText("id").primaryKey(),
  label: pgText("label").notNull(),
  category: pgText("category").notNull().default("umum"),
  orderIndex: pgInteger("order_index").notNull().default(0),
  isActive: pgBoolean("is_active").notNull().default(true),
  followUpQuestion: pgText("follow_up_question"),
  followUpOptions: pgText("follow_up_options"),
  createdAt: pgText("created_at").notNull(),
  updatedAt: pgText("updated_at").notNull(),
})

export const pgChatbotConfig = pgTable("chatbot_config", {
  id: pgText("id").primaryKey().default("default"),
  pharmacistName: pgText("pharmacist_name").notNull().default("Apt. Siti Rahma, S.Farm"),
  pharmacistTitle: pgText("pharmacist_title").notNull().default("Apoteker Pendamping Klinis"),
  pharmacistAvatarUrl: pgText("pharmacist_avatar_url"),
  pharmacistStatusText: pgText("pharmacist_status_text").notNull().default("Online • Siap Mendengarkan"),
  leadNudgeEnabled: pgBoolean("lead_nudge_enabled").notNull().default(true),
  leadNudgeTriggerMode: pgText("lead_nudge_trigger_mode").notNull().default("message_count"),
  leadNudgeMessageCount: pgInteger("lead_nudge_message_count").notNull().default(3),
  leadNudgeTimeMinutes: pgInteger("lead_nudge_time_minutes").notNull().default(2),
  leadNudgeCooldownMinutes: pgInteger("lead_nudge_cooldown_minutes").notNull().default(10),
  createdAt: pgText("created_at").notNull(),
  updatedAt: pgText("updated_at").notNull(),
})

export const sqliteChatSessions = sqliteTable("chat_sessions", {
  id: sqText("id").primaryKey(),
  status: sqText("status").notNull().default("ai"),
  stage: sqText("stage").notNull().default("greeting"),
  handoffReason: sqText("handoff_reason"),
  customerName: sqText("customer_name"),
  customerPhone: sqText("customer_phone"),
  leadStatus: sqText("lead_status").notNull().default("general_inquiry"),
  adminNotes: sqText("admin_notes"),
  isArchived: sqInteger("is_archived", { mode: "boolean" }).notNull().default(false as any),
  symptomsJson: sqText("symptoms_json"),
  createdAt: sqText("created_at").notNull(),
  updatedAt: sqText("updated_at").notNull(),
})

export const sqliteChatMessages = sqliteTable("chat_messages", {
  id: sqText("id").primaryKey(),
  sessionId: sqText("session_id")
    .notNull()
    .references(() => sqliteChatSessions.id, { onDelete: "cascade" }),
  sender: sqText("sender").notNull(),
  content: sqText("content").notNull(),
  productsJson: sqText("products_json"),
  createdAt: sqText("created_at").notNull(),
})

export const sqliteChatbotWelcomeMessages = sqliteTable("chatbot_welcome_messages", {
  id: sqText("id").primaryKey(),
  title: sqText("title").notNull(),
  content: sqText("content").notNull(),
  isActive: sqInteger("is_active", { mode: "boolean" }).notNull().default(false as any),
  createdAt: sqText("created_at").notNull(),
  updatedAt: sqText("updated_at").notNull(),
})

export const sqliteProductEmbeddings = sqliteTable("product_embeddings", {
  id: sqText("id").primaryKey(),
  productId: sqText("product_id")
    .notNull()
    .references(() => sqliteProducts.id, { onDelete: "cascade" }),
  textChunk: sqText("text_chunk").notNull(),
  embeddingJson: sqText("embedding_json").notNull(),
  metadataJson: sqText("metadata_json"),
  createdAt: sqText("created_at").notNull(),
  updatedAt: sqText("updated_at").notNull(),
})

export const sqliteChatbotSymptomOptions = sqliteTable("chatbot_symptom_options", {
  id: sqText("id").primaryKey(),
  label: sqText("label").notNull(),
  category: sqText("category").notNull().default("umum"),
  orderIndex: sqInteger("order_index").notNull().default(0),
  isActive: sqInteger("is_active", { mode: "boolean" }).notNull().default(true as any),
  followUpQuestion: sqText("follow_up_question"),
  followUpOptions: sqText("follow_up_options"),
  createdAt: sqText("created_at").notNull(),
  updatedAt: sqText("updated_at").notNull(),
})

export const sqliteChatbotConfig = sqliteTable("chatbot_config", {
  id: sqText("id").primaryKey().default("default"),
  pharmacistName: sqText("pharmacist_name").notNull().default("Apt. Siti Rahma, S.Farm"),
  pharmacistTitle: sqText("pharmacist_title").notNull().default("Apoteker Pendamping Klinis"),
  pharmacistAvatarUrl: sqText("pharmacist_avatar_url"),
  pharmacistStatusText: sqText("pharmacist_status_text").notNull().default("Online • Siap Mendengarkan"),
  leadNudgeEnabled: sqInteger("lead_nudge_enabled", { mode: "boolean" }).notNull().default(true as any),
  leadNudgeTriggerMode: sqText("lead_nudge_trigger_mode").notNull().default("message_count"),
  leadNudgeMessageCount: sqInteger("lead_nudge_message_count").notNull().default(3),
  leadNudgeTimeMinutes: sqInteger("lead_nudge_time_minutes").notNull().default(2),
  leadNudgeCooldownMinutes: sqInteger("lead_nudge_cooldown_minutes").notNull().default(10),
  createdAt: sqText("created_at").notNull(),
  updatedAt: sqText("updated_at").notNull(),
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
export const aiSettings: any = isPg ? pgAiSettings : sqliteAiSettings
export const chatSessions: any = isPg ? pgChatSessions : sqliteChatSessions
export const chatMessages: any = isPg ? pgChatMessages : sqliteChatMessages
export const chatbotWelcomeMessages: any = isPg ? pgChatbotWelcomeMessages : sqliteChatbotWelcomeMessages
export const productEmbeddings: any = isPg ? pgProductEmbeddings : sqliteProductEmbeddings
export const chatbotSymptomOptions: any = isPg ? pgChatbotSymptomOptions : sqliteChatbotSymptomOptions
export const chatbotConfig: any = isPg ? pgChatbotConfig : sqliteChatbotConfig

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
export type AiSettings = typeof pgAiSettings.$inferSelect
export type NewAiSettings = typeof pgAiSettings.$inferInsert
export type ChatSession = typeof pgChatSessions.$inferSelect
export type NewChatSession = typeof pgChatSessions.$inferInsert
export type ChatMessage = typeof pgChatMessages.$inferSelect
export type NewChatMessage = typeof pgChatMessages.$inferInsert
export type ChatbotWelcomeMessage = typeof pgChatbotWelcomeMessages.$inferSelect
export type NewChatbotWelcomeMessage = typeof pgChatbotWelcomeMessages.$inferInsert
export type ProductEmbedding = typeof pgProductEmbeddings.$inferSelect
export type NewProductEmbedding = typeof pgProductEmbeddings.$inferInsert
export type ChatbotSymptomOption = typeof pgChatbotSymptomOptions.$inferSelect
export type NewChatbotSymptomOption = typeof pgChatbotSymptomOptions.$inferInsert
export type ChatbotConfig = typeof pgChatbotConfig.$inferSelect
export type NewChatbotConfig = typeof pgChatbotConfig.$inferInsert


