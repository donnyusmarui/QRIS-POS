import { useNavigate } from "react-router"
import { useAuthStore } from "@/stores/auth-store"
import { hasPermission } from "@/lib/api"
import { ShieldAlert, ArrowLeft, LogOut } from "lucide-react"
import type { Permission } from "@/types"

interface RoleGuardProps {
  children: React.ReactNode
  permission: Permission
  fallback?: React.ReactNode
}

export function RoleGuard({ children, permission, fallback }: RoleGuardProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  if (!hasPermission(user, permission)) {
    if (fallback) return <>{fallback}</>

    const userRole = user?.roles?.[0]?.name ?? "user"

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative w-full max-w-md rounded-3xl border border-[#EFECE6] bg-white p-7 text-center shadow-jeruk-lg animate-in zoom-in-95 duration-200">
          {/* Glowing Shield Icon */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF2ED] text-[#FF5A2B] shadow-inner border border-orange-200/60">
            <ShieldAlert className="h-8 w-8 text-[#FF5A2B]" />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200/80 px-3 py-1 text-[11px] font-bold text-red-600 mb-2">
            <span>Status 403 • Hak Akses Dibatasi</span>
          </div>

          <h2 className="text-xl font-black tracking-tight text-[#181512]">
            Akses Modul Ditolak 🔒
          </h2>
          <p className="mt-2 text-xs text-[#78716C] leading-relaxed text-pretty">
            Akun Anda saat ini login sebagai <span className="font-bold text-[#181512] capitalize bg-[#FFF8DC] px-1.5 py-0.5 rounded border border-amber-200">"{userRole}"</span> dan tidak memiliki izin otorisasi untuk membuka modul ini.
          </p>

          <div className="mt-4 rounded-2xl border border-amber-200/60 bg-[#FFFBF0] p-3 text-left text-xs space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#8C5400] font-semibold">Izin yang Dibutuhkan:</span>
              <span className="font-mono font-bold text-[#FF5A2B] bg-white px-2 py-0.5 rounded-md border border-amber-200/80 shadow-2xs">
                {permission}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              onClick={() => navigate("/")}
              className="press-tactile inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#FF5A2B] px-4 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:bg-[#E5481B]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali ke Dashboard Kasir</span>
            </button>
            <button
              onClick={() => {
                logout()
                navigate("/login")
              }}
              className="press-tactile inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#EFECE6] bg-[#FDFBF7] px-4 text-xs font-bold text-[#78716C] hover:bg-white hover:text-[#181512]"
            >
              <LogOut className="h-4 w-4" />
              <span>Ganti Akun (Login Peran Lain)</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
