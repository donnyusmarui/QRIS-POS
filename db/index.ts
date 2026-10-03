import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "./schema"

export function createDb() {
  const url = process.env.TURSO_DATABASE_URL || "file:local.db"
  const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  })
  return drizzle(client, { schema })
}

export type Database = ReturnType<typeof createDb>
