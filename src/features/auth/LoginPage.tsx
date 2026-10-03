import { useState } from "react"
import { useNavigate } from "react-router"
import { useAuthStore } from "@/stores/auth-store"
import { QrCode, ArrowRight, ShieldCheck, Sparkles } from "lucide-react"

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
    <div className="relative min-h-screen bg-[#FBF9F5] text-[#181512] flex flex-col justify-between selection:bg-[#FF5A2B]/20 selection:text-[#FF5A2B]">
      {/* Top Sunlight Radiant Header (Jeruk AI Hero Header) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-[#FFEAA0] via-[#FFF8D6]/60 to-transparent" />
      
      {/* Top Mini Brand Bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FF5A2B] text-white shadow-sm shadow-orange-500/25">
            <QrCode className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-black tracking-tight text-[#181512]">QRIS-POS</span>
            <span className="rounded-full bg-[#FFE972] px-2 py-0.5 text-[10px] font-bold text-[#8C5400]">
              Jeruk UI
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-full border border-black/10 bg-white/80 p-0.5 text-xs font-bold text-muted-foreground shadow-2xs backdrop-blur-xs">
            <span className="rounded-full bg-[#181512] px-2.5 py-0.5 text-[11px] text-white">ID</span>
            <span className="px-2.5 py-0.5 text-[11px] text-muted-foreground">EN</span>
          </div>
        </div>
      </header>

      {/* Main Login Floating Compartment */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Hero Headline Intro */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-[#FFF2ED] px-3 py-1 text-xs font-bold text-[#FF5A2B] shadow-2xs mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Sistem Kasir Pintar &amp; Transaksi QRIS</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[#181512] text-balance">
              Selamat Datang Kembali! 🍊
            </h1>
            <p className="mt-1.5 text-xs text-[#78716C] text-pretty">
              Masuk untuk mengelola transaksi POS, inventaris produk, dan laporan toko.
            </p>
          </div>

          {/* Pure White Elevated Card */}
          <div className="rounded-3xl border border-[#EFECE6] bg-white p-7 sm:p-8 shadow-jeruk-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-bold text-[#181512]">
                  Email Akun
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-[#EFECE6] bg-[#FDFBF7] px-3.5 py-2 text-sm text-[#181512] transition-colors placeholder:text-muted-foreground focus:border-[#FF5A2B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5A2B]/15"
                  placeholder="admin@test.com"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-xs font-bold text-[#181512]">
                    Kata Sandi
                  </label>
                  <span className="text-[11px] font-medium text-[#78716C]">Lupa sandi?</span>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-[#EFECE6] bg-[#FDFBF7] px-3.5 py-2 text-sm text-[#181512] transition-colors placeholder:text-muted-foreground focus:border-[#FF5A2B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5A2B]/15"
                  placeholder="••••••••"
                />
              </div>

              {/* Citrus Orange Primary CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="press-tactile mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FF5A2B] px-4 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-[#E5481B] active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? "Memverifikasi Kredensial..." : (
                  <>
                    <span>Masuk ke Kasir</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Fill Compartments (Jeruk Warm Peach Style) */}
            <div className="mt-6 rounded-2xl border border-amber-200/70 bg-[#FFFBF0] p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#8C5400] text-[11px] uppercase tracking-wider">
                  💡 Akun Demo (Klik untuk Isi)
                </span>
                <span className="text-[10px] text-[#8C5400]/70 font-semibold">1-Klik Siap Uji</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmail("admin@test.com")
                    setPassword("Admin123!")
                  }}
                  className="press-tactile rounded-xl border border-amber-200/80 bg-white p-2.5 text-left transition hover:border-[#FF5A2B] hover:shadow-2xs"
                >
                  <p className="font-bold text-[#181512] text-xs truncate">admin@test.com</p>
                  <p className="text-[10px] text-muted-foreground font-mono">Admin123!</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("admin@qris-pos.local")
                    setPassword("Admin123!")
                  }}
                  className="press-tactile rounded-xl border border-amber-200/80 bg-white p-2.5 text-left transition hover:border-[#FF5A2B] hover:shadow-2xs"
                >
                  <p className="font-bold text-[#181512] text-xs truncate">admin@qris-pos...</p>
                  <p className="text-[10px] text-muted-foreground font-mono">Admin123!</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Trust Markers */}
      <footer className="relative z-10 py-5 text-center text-xs text-[#78716C] flex items-center justify-center gap-4">
        <span className="inline-flex items-center gap-1 font-medium">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          Offline SQLite Database Ready
        </span>
        <span>•</span>
        <span className="font-medium">QRIS Standar Nasional</span>
        <span>•</span>
        <span className="font-medium text-[#FF5A2B]">Jeruk Design System</span>
      </footer>
    </div>
  )
}
