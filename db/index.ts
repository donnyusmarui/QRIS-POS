import "dotenv/config"
import { Pool } from "@neondatabase/serverless"
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless"
import { createClient } from "@libsql/client"
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql"
import * as schema from "./schema"

let poolInstance: Pool | null = null

export function isNeonPg(): boolean {
  const url = process.env.DATABASE_URL
  return Boolean(url && (url.startsWith("postgres://") || url.startsWith("postgresql://")))
}

export function createDb() {
  const databaseUrl = process.env.DATABASE_URL
  if (databaseUrl && (databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://"))) {
    if (!poolInstance) {
      poolInstance = new Pool({ connectionString: databaseUrl })
    }
    return drizzleNeon(poolInstance, { schema }) as any
  }

  const url = process.env.TURSO_DATABASE_URL || "file:local.db"
  const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  })
  return drizzleLibsql(client, { schema }) as any
}

export type Database = any
