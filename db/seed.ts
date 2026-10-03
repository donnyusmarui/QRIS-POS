import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { roles, users, userRoles } from "./schema"

const ROLE_DEFINITIONS = [
  {
    id: "role_admin",
    name: "admin",
    permissions: [
      "products:read", "products:write", "products:delete",
      "transactions:create", "transactions:void", "transactions:read_all",
      "inventory:manage",
      "customers:manage",
      "reports:view",
      "users:manage",
      "settings:manage",
    ],
  },
  {
    id: "role_manager",
    name: "manager",
    permissions: [
      "products:read", "products:write",
      "transactions:create", "transactions:void", "transactions:read_all",
      "inventory:manage",
      "customers:manage",
      "reports:view",
    ],
  },
  {
    id: "role_cashier",
    name: "cashier",
    permissions: [
      "products:read",
      "transactions:create",
      "customers:manage",
    ],
  },
]

async function seed() {
  const url = process.env.TURSO_DATABASE_URL || "file:local.db"
  const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  })
  const db = drizzle(client)

  console.log("🌱 Seeding roles...")
  for (const role of ROLE_DEFINITIONS) {
    await db
      .insert(roles)
      .values({ ...role, permissions: role.permissions })
      .onConflictDoNothing()
    console.log(`  ✅ Role "${role.name}" (${role.permissions.length} permissions)`)
  }

  // Create default admin user (password: Admin123!)
  // In production, change this immediately after first login
  const bcryptjs = await import("bcryptjs")
  const hashedPassword = await bcryptjs.hash("Admin123!", 12)

  const adminId = "user_admin_default"
  await db
    .insert(users)
    .values({
      id: adminId,
      email: "admin@qris-pos.local",
      password: hashedPassword,
      fullName: "Administrator",
    })
    .onConflictDoNothing()
  console.log("  ✅ Default admin user created (admin@qris-pos.local)")

  await db
    .insert(userRoles)
    .values({
      id: "ur_admin_default",
      userId: adminId,
      roleId: "role_admin",
    })
    .onConflictDoNothing()
  console.log("  ✅ Admin role assigned")

  console.log("\n✅ Seed complete!")
  process.exit(0)
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err)
  process.exit(1)
})
