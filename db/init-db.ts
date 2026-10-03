import { createClient } from "@libsql/client"
import bcryptjs from "bcryptjs"

const DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    permissions TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,

  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,

  `CREATE TABLE IF NOT EXISTS user_roles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE
  );`,

  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    price REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    category TEXT,
    image_url TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,

  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,

  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    customer_id TEXT REFERENCES customers(id),
    total_amount REAL NOT NULL,
    payment_method TEXT NOT NULL,
    qris_ref_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,

  `CREATE TABLE IF NOT EXISTS transaction_items (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    product_name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal REAL NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS inventory_log (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id),
    change_qty INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,
]

const ROLE_DEFINITIONS = [
  {
    id: "role_admin",
    name: "admin",
    permissions: JSON.stringify([
      "products:read", "products:write", "products:delete",
      "transactions:create", "transactions:void", "transactions:read_all",
      "inventory:manage",
      "customers:manage",
      "reports:view",
      "users:manage",
      "settings:manage",
    ]),
  },
  {
    id: "role_manager",
    name: "manager",
    permissions: JSON.stringify([
      "products:read", "products:write",
      "transactions:create", "transactions:void", "transactions:read_all",
      "inventory:manage",
      "customers:manage",
      "reports:view",
    ]),
  },
  {
    id: "role_cashier",
    name: "cashier",
    permissions: JSON.stringify([
      "products:read",
      "transactions:create",
      "customers:manage",
    ]),
  },
]

const INITIAL_PRODUCTS = [
  { id: "prod_1", name: "Kopi Susu Gula Aren", sku: "KOP-001", price: 18000, stock: 50, category: "Minuman" },
  { id: "prod_2", name: "Americano Ice", sku: "KOP-002", price: 15000, stock: 40, category: "Minuman" },
  { id: "prod_3", name: "Croissant Butter", sku: "BAK-001", price: 22000, stock: 25, category: "Makanan" },
  { id: "prod_4", name: "Sandwich Toast Telur", sku: "BAK-002", price: 25000, stock: 15, category: "Makanan" },
  { id: "prod_5", name: "Matcha Latte", sku: "TEA-001", price: 24000, stock: 30, category: "Minuman" },
  { id: "prod_6", name: "Air Mineral 600ml", sku: "DRK-001", price: 5000, stock: 4, category: "Minuman" }, // low stock
]

const INITIAL_CUSTOMERS = [
  { id: "cust_1", name: "Budi Santoso", phone: "081234567890", email: "budi@gmail.com", address: "Jakarta Selatan" },
  { id: "cust_2", name: "Siti Rahma", phone: "085678901234", email: "siti@gmail.com", address: "Jakarta Barat" },
]

async function main() {
  const url = process.env.TURSO_DATABASE_URL || "file:local.db"
  console.log(`📡 Connecting to SQLite: ${url}`)
  const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  })

  console.log("🛠️  Creating tables...")
  for (const sql of DDL_STATEMENTS) {
    await client.execute(sql)
  }
  console.log("  ✅ 8 Tables created / verified.")

  console.log("🌱 Seeding roles...")
  for (const r of ROLE_DEFINITIONS) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO roles (id, name, permissions) VALUES (?, ?, ?);`,
      args: [r.id, r.name, r.permissions],
    })
  }
  console.log("  ✅ Default roles ready.")

  console.log("👤 Creating default admin user...")
  const hashedPassword = await bcryptjs.hash("Admin123!", 12)
  await client.execute({
    sql: `INSERT OR IGNORE INTO users (id, email, password, full_name) VALUES (?, ?, ?, ?);`,
    args: ["user_admin_default", "admin@qris-pos.local", hashedPassword, "Administrator"],
  })
  await client.execute({
    sql: `INSERT OR IGNORE INTO user_roles (id, user_id, role_id) VALUES (?, ?, ?);`,
    args: ["ur_admin_default", "user_admin_default", "role_admin"],
  })
  console.log("  ✅ Admin: admin@qris-pos.local / Admin123!")

  console.log("📦 Seeding demo products...")
  for (const p of INITIAL_PRODUCTS) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO products (id, name, sku, price, stock, category) VALUES (?, ?, ?, ?, ?, ?);`,
      args: [p.id, p.name, p.sku, p.price, p.stock, p.category],
    })
  }
  console.log("  ✅ Demo products ready.")

  console.log("👥 Seeding demo customers...")
  for (const c of INITIAL_CUSTOMERS) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO customers (id, name, phone, email, address) VALUES (?, ?, ?, ?, ?);`,
      args: [c.id, c.name, c.phone, c.email, c.address],
    })
  }
  console.log("  ✅ Demo customers ready.")

  console.log("\n🎉 Local database ready to use!")
}

main().catch((err) => {
  console.error("❌ Database initialization error:", err)
  process.exit(1)
})
