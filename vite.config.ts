import path from "path"
import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

import fs from "fs"

const envVars = loadEnv("development", process.cwd(), "")
Object.assign(process.env, envVars)
process.env.JWT_SECRET = process.env.JWT_SECRET || "super-secret-local-jwt-token-key-32-chars-long"
process.env.TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || "file:local.db"

function netlifyFunctionsPlugin() {
  return {
    name: "netlify-functions-dev",
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url?.startsWith("/.netlify/functions/")) {
          return next()
        }

        const urlObj = new URL(req.url, "http://localhost:5173")
        const fnName = urlObj.pathname.replace("/.netlify/functions/", "").split("/")[0]

        const fnPath = path.resolve(__dirname, `netlify/functions/${fnName}.ts`)
        if (!fs.existsSync(fnPath)) {
          res.statusCode = 404
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({ success: false, error: `Function ${fnName} not found` }))
          return
        }

        try {
          const chunks: any[] = []
          for await (const chunk of req) {
            chunks.push(chunk)
          }
          const bodyBuffer = Buffer.concat(chunks)
          const bodyStr =
            bodyBuffer.length > 0 && req.method !== "GET" && req.method !== "HEAD"
              ? bodyBuffer.toString("utf-8")
              : undefined

          const headersInit: Record<string, string> = {}
          for (const [key, val] of Object.entries(req.headers)) {
            if (val) headersInit[key] = Array.isArray(val) ? val.join(", ") : String(val)
          }

          const webReq = new Request(urlObj.href, {
            method: req.method,
            headers: headersInit,
            body: bodyStr,
          })

          const mod = await server.ssrLoadModule(`/netlify/functions/${fnName}.ts`)
          const handler = mod.default

          const webRes: Response = await handler(webReq, {})

          res.statusCode = webRes.status
          webRes.headers.forEach((val, key) => {
            res.setHeader(key, val)
          })

          const resBody = await webRes.text()
          res.end(resBody)
        } catch (err: any) {
          console.error(`[Netlify Function Dev] Error executing ${fnName}:`, err)
          res.statusCode = 500
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({ success: false, error: err.message || "Internal server error" }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), netlifyFunctionsPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router"],
          "vendor-charts": ["recharts"],
          "vendor-icons": ["lucide-react"],
          "vendor-qrcode": ["qrcode"],
        },
      },
    },
  },
})
