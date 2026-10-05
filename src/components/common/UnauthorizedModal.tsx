import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router"
import { ShieldAlert, LogIn, X } from "lucide-react"
import { onUnauthorized } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"

export function UnauthorizedModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const loginButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Daftarkan listener ke API interceptor
    const unsubscribe = onUnauthorized((msg) => {
      setErrorMessage(
        msg ||
          "Sesi login kasir Anda telah berakhir demi keamanan, atau tindakan ini memerlukan hak akses yang sah. Silakan login kembali untuk melanjutkan."
      )
      setIsOpen(true)
    })

    return () => unsubscribe()
  }, [])

  // Auto-focus tombol login saat modal terbuka & listen Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    const timer = setTimeout(() => {
      loginButtonRef.current?.focus()
    }, 100)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      clearTimeout(timer)
    }
  }, [isOpen])

  function handleLoginRedirect() {
    setIsOpen(false)
    try {
      logout()
    } catch {
      // ignore
    }
    sessionStorage.removeItem("access_token")
    localStorage.removeItem("access_token")
    navigate("/login")
  }

  function handleClose() {
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unauthorized-title"
      aria-describedby="unauthorized-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-amber-200/60 bg-card p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tombol Tutup Silang di Sudut */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-3.5 top-3.5 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          title="Tutup (Esc)"
          aria-label="Tutup dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon Badge */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 ring-8 ring-amber-500/5">
          <ShieldAlert className="h-7 w-7 text-amber-600" />
        </div>

        {/* Status Chip */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[11px] font-bold text-amber-700">
          <span>HTTP 401 • Akses Tidak Sah</span>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h2 id="unauthorized-title" className="text-base font-bold text-foreground">
            Sesi Berakhir atau Akses Ditolak
          </h2>
          <p id="unauthorized-desc" className="text-xs text-muted-foreground leading-relaxed text-balance">
            {errorMessage}
          </p>
        </div>

        {/* Actions */}
        <div className="pt-2 flex flex-col gap-2">
          <button
            ref={loginButtonRef}
            type="button"
            onClick={handleLoginRedirect}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white hover:bg-amber-700 press-tactile transition-colors shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <LogIn className="h-4 w-4" />
            <span>Login Ulang Sekarang</span>
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="w-full rounded-xl border border-input py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
