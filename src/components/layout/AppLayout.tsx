import { useState } from "react"
import { Link, useLocation } from "react-router"
import { useAuthStore } from "@/stores/auth-store"
import { hasPermission } from "@/lib/api"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Warehouse,
  Users,
  BarChart3,
  Receipt,
  LogOut,
  Menu,
  X,
  QrCode,
  ShieldCheck,
  Search,
  Sparkles,
  ArrowRight,
} from "lucide-react"
import type { Permission } from "@/types"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  permission?: Permission
}

const operationalItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Kasir Transaksi", href: "/pos", icon: <ShoppingCart className="h-4 w-4" />, permission: "transactions:create" },
  { label: "Riwayat Struk", href: "/transactions", icon: <Receipt className="h-4 w-4" />, permission: "transactions:create" },
]

const managementItems: NavItem[] = [
  { label: "Katalog Produk", href: "/products", icon: <Package className="h-4 w-4" />, permission: "products:read" },
  { label: "Manajemen Stok", href: "/inventory", icon: <Warehouse className="h-4 w-4" />, permission: "inventory:manage" },
  { label: "Data Pelanggan", href: "/customers", icon: <Users className="h-4 w-4" />, permission: "customers:manage" },
  { label: "Laporan & Omzet", href: "/reports", icon: <BarChart3 className="h-4 w-4" />, permission: "reports:view" },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const location = useLocation()

  const filterItems = (items: NavItem[]) =>
    items.filter((item) => !item.permission || hasPermission(user, item.permission))

  const visibleOps = filterItems(operationalItems)
  const visibleMgmt = filterItems(managementItems)
  const roleName = user?.roles?.[0]?.name ?? "user"
  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "DY"

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#FBF9F5] text-[#181512]">
      {/* 1. TOP HEADER: Jeruk AI Sunlight Yellow Gradient Bar */}
      <header className="relative z-30 flex h-16 shrink-0 items-center justify-between border-b border-black/5 bg-gradient-to-r from-[#FFE870] via-[#FFE560] to-[#FFF0A0] px-4 shadow-2xs lg:px-6">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="press-tactile rounded-xl border border-black/10 bg-white/70 p-2 text-[#181512] hover:bg-white lg:hidden"
            aria-label="Buka Menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#FF5A2B] text-white shadow-sm shadow-orange-600/30">
              <QrCode className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-tight text-[#181512]">QRIS-POS</span>
                <span className="hidden sm:inline-block rounded-full bg-[#181512]/10 px-2 py-0.5 text-[10px] font-bold text-[#181512]">
                  v2.0
                </span>
              </div>
              <span className="block text-[10px] font-bold text-[#8C5400]">Jeruk Design System</span>
            </div>
          </Link>
        </div>

        {/* Center: Global Search Bar (Simulated Jeruk AI Top Search) */}
        <div className="hidden md:flex flex-1 max-w-sm mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C5400]/60" />
            <input
              type="text"
              readOnly
              placeholder="Cari menu, transaksi, atau produk..."
              className="w-full rounded-full border border-black/10 bg-white/80 py-1.5 pl-9 pr-4 text-xs text-[#181512] placeholder:text-[#8C5400]/60 shadow-2xs backdrop-blur-xs focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Right: Telemetry Chips, Lang Switcher & User Avatar */}
        <div className="flex items-center gap-2.5">
          {/* SQLite Offline Pulse Pill */}
          <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-600/20 bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>SQLite Offline Aktif</span>
          </div>

          {/* Quick Cashier POS CTA Pill (Jeruk AI Top-up CTA replica) */}
          <Link
            to="/pos"
            className="press-tactile inline-flex items-center gap-1.5 rounded-full bg-[#FF5A2B] px-3.5 py-1 text-xs font-bold text-white shadow-sm shadow-orange-600/25 hover:bg-[#E5481B]"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Buka Kasir</span>
          </Link>

          {/* Language Toggle Pill */}
          <div className="hidden sm:flex items-center rounded-full border border-black/10 bg-white/80 p-0.5 text-xs font-bold shadow-2xs">
            <span className="rounded-full bg-[#181512] px-2 py-0.5 text-[10px] text-white">ID</span>
            <span className="px-2 py-0.5 text-[10px] text-[#78716C]">EN</span>
          </div>

          {/* User Avatar Circle */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#181512] text-xs font-bold text-white shadow-2xs" title={user?.fullName || "Kasir"}>
            {initials}
          </div>
        </div>
      </header>

      {/* 2. BODY WORKSPACE: Dual Column Layout */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar: Minimalist Pure White with High Negative Space */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#EFECE6] bg-white text-[#181512] transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Mobile Sidebar Close */}
          <div className="flex h-14 items-center justify-between border-b border-[#EFECE6] px-4 lg:hidden">
            <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">Navigasi Utama</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="press-tactile rounded-lg p-1.5 text-[#78716C] hover:bg-[#F4EFE6]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav Categories */}
          <div className="flex-1 space-y-5 overflow-y-auto px-3.5 py-5">
            {/* Group 1: Operasional Kasir */}
            <div>
              <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-wider text-[#A8A29E]">
                Operasional Kasir
              </p>
              <nav className="space-y-1">
                {visibleOps.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`press-tactile flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                        isActive
                          ? "bg-[#FFF2ED] text-[#FF5A2B] shadow-2xs"
                          : "text-[#57534E] hover:bg-[#FDFBF7] hover:text-[#181512]"
                      }`}
                    >
                      <span className={isActive ? "text-[#FF5A2B]" : "text-[#78716C]"}>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* Group 2: Manajemen Toko */}
            <div>
              <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-wider text-[#A8A29E]">
                Manajemen Toko
              </p>
              <nav className="space-y-1">
                {visibleMgmt.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`press-tactile flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                        isActive
                          ? "bg-[#FFF2ED] text-[#FF5A2B] shadow-2xs"
                          : "text-[#57534E] hover:bg-[#FDFBF7] hover:text-[#181512]"
                      }`}
                    >
                      <span className={isActive ? "text-[#FF5A2B]" : "text-[#78716C]"}>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Bottom Shelf: Warm Peach Card ("Shift Kasir Aktif" - Jeruk AI promo card replica) */}
          <div className="border-t border-[#EFECE6] p-3.5 space-y-3">
            <div className="rounded-2xl border border-orange-200/70 bg-[#FFF6ED] p-3.5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-black text-[#FF5A2B]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Shift Kasir Aktif
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-[#78716C] leading-snug text-pretty">
                Database terhubung secara lokal. Seluruh transaksi tercatat otomatis.
              </p>
              <Link
                to="/pos"
                className="press-tactile flex items-center justify-between rounded-xl bg-[#FF5A2B] px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition-colors hover:bg-[#E5481B]"
              >
                <span>Buka Terminal Kasir</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* User Profile & Logout */}
            <div className="flex items-center justify-between pt-1">
              <div className="min-w-0 pr-2">
                <p className="truncate text-xs font-bold text-[#181512]">{user?.fullName}</p>
                <span className="flex items-center gap-1 text-[10px] font-medium text-[#78716C] capitalize">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                  {roleName}
                </span>
              </div>
              <button
                onClick={logout}
                className="press-tactile rounded-xl border border-red-200/80 bg-red-50/70 p-2 text-red-600 transition hover:bg-red-100"
                title="Keluar dari Akun"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Right Main Content: Floating Compartments on Warm Cream Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
