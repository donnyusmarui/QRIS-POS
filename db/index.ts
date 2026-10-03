import "dotenv/config"
import { Pool } from "@neondatabase/serverless"
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless"
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

  // Fallback for local offline SQLite development
  // Dynamically required to prevent serverless bundles from requiring native bindings
  try {
    const { createClient } = require("@libsql/client")
    const { drizzle } = require("drizzle-orm/libsql")
    const url = process.env.TURSO_DATABASE_URL || "file:local.db"
    const client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    })
    return drizzle(client, { schema }) as any
  } catch (err) {
    throw new Error("Database configuration error: Neither DATABASE_URL nor local SQLite client could be initialized.")
  }
}

export type Database = any
