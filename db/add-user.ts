import { createClient } from "@libsql/client"
import bcryptjs from "bcryptjs"

async function main() {
  const client = createClient({ url: "file:local.db" })
  
  // List all current users
  const currentUsers = await client.execute("SELECT id, email, full_name FROM users")
  console.log("Current users in DB:", currentUsers.rows)

  const hash = await bcryptjs.hash("Admin123!", 12)
  
  // Ensure admin@test.com exists
  await client.execute({
    sql: "INSERT OR REPLACE INTO users (id, email, password, full_name, is_active) VALUES (?, ?, ?, ?, 1)",
    args: ["user_admin_test", "admin@test.com", hash, "Administrator Test"],
  })

  await client.execute({
    sql: "INSERT OR REPLACE INTO user_roles (id, user_id, role_id) VALUES (?, ?, ?)",
    args: ["ur_admin_test", "user_admin_test", "role_admin"],
  })

  // Ensure admin@qris-pos.local exists
  await client.execute({
    sql: "INSERT OR REPLACE INTO users (id, email, password, full_name, is_active) VALUES (?, ?, ?, ?, 1)",
    args: ["user_admin_default", "admin@qris-pos.local", hash, "Administrator"],
  })

  await client.execute({
    sql: "INSERT OR REPLACE INTO user_roles (id, user_id, role_id) VALUES (?, ?, ?)",
    args: ["ur_admin_default", "user_admin_default", "role_admin"],
  })

  console.log("✅ Users configured with password: Admin123!")
}

main().catch(console.error)
