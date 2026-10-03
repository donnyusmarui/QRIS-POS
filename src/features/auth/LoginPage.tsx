import { useState } from "react"
import { useNavigate } from "react-router"
import { useAuthStore } from "@/stores/auth-store"
import { QrCode, ArrowRight } from "lucide-react"

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
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-8">
      {/* Subtle Background Glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative w-full max-w-md rounded-3xl border border-border/60 bg-card p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-2xs">
            <QrCode className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-balance">QRIS-POS Point of Sale</h1>
          <p className="mt-1.5 text-xs text-muted-foreground text-pretty">
            Masuk ke akun kasir atau administrator Anda
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-foreground">
              Email Pengguna
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="admin@test.com"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-semibold text-foreground">
              Kata Sandi
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="press-tactile inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? "Memverifikasi..." : (
              <>
                <span>Masuk Sekarang</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Fill Buttons */}
        <div className="mt-6 rounded-2xl border border-border/50 bg-muted/30 p-3.5 text-xs text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">💡 Akun Demo (Klik Cepat):</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail("admin@test.com")
                setPassword("Admin123!")
              }}
              className="press-tactile rounded-xl border border-border/60 bg-background p-2.5 text-left transition hover:border-primary/50 hover:shadow-2xs"
            >
              <p className="font-bold text-foreground text-xs truncate">admin@test.com</p>
              <p className="text-[10px] text-muted-foreground">Admin123!</p>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("admin@qris-pos.local")
                setPassword("Admin123!")
              }}
              className="press-tactile rounded-xl border border-border/60 bg-background p-2.5 text-left transition hover:border-primary/50 hover:shadow-2xs"
            >
              <p className="font-bold text-foreground text-xs truncate">admin@qris-pos...</p>
              <p className="text-[10px] text-muted-foreground">Admin123!</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
