import "dotenv/config"
import { defineConfig } from "drizzle-kit"

const isPg = Boolean(
  process.env.DATABASE_URL &&
    (process.env.DATABASE_URL.startsWith("postgres://") ||
      process.env.DATABASE_URL.startsWith("postgresql://"))
)

export default defineConfig(
  isPg
    ? {
        out: "./db/migrations",
        schema: "./db/schema.ts",
        dialect: "postgresql",
        dbCredentials: {
          url: process.env.DATABASE_URL!,
        },
      }
    : {
        out: "./db/migrations",
        schema: "./db/schema.ts",
        dialect: "turso",
        dbCredentials: {
          url: process.env.TURSO_DATABASE_URL || "file:local.db",
          authToken: process.env.TURSO_AUTH_TOKEN,
        },
      }
)
