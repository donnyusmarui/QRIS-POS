import { useState } from "react"
import { useNavigate } from "react-router"
import { useAuthStore } from "@/stores/auth-store"

export function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      await login(email, password)
      navigate("/", { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">QRIS-POS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Masuk ke akun Anda
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="admin@qris-pos.local"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? "Memproses..." : "Masuk"}
          </button>
        </form>

        {/* Quick Demo Fill Buttons */}
        <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">💡 Akun Demo (Klik untuk isi cepat):</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail("admin@test.com")
                setPassword("Admin123!")
              }}
              className="rounded border bg-background p-2 text-left hover:border-primary transition"
            >
              <p className="font-bold text-foreground">admin@test.com</p>
              <p className="text-[10px]">Pass: Admin123!</p>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("admin@qris-pos.local")
                setPassword("Admin123!")
              }}
              className="rounded border bg-background p-2 text-left hover:border-primary transition"
            >
              <p className="font-bold text-foreground">admin@qris-pos.local</p>
              <p className="text-[10px]">Pass: Admin123!</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
