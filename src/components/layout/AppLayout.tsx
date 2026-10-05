import { useState, useEffect, useRef } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import { useAuthStore } from "@/stores/auth-store"
import { hasPermission, apiFetch } from "@/lib/api"
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
  Loader2,
  Store,
  ExternalLink,
  Bot,
  MessageSquare,
} from "lucide-react"
import type { Permission, Product } from "@/types"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  permission?: Permission
}

const operationalItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Kasir Transaksi", href: "/pos", icon: <ShoppingCart className="h-4 w-4" />, permission: "transactions:create" },
  { label: "Riwayat Struk", href: "/transactions", icon: <Receipt className="h-4 w-4" />, permission: "transactions:create" },
]

const managementItems: NavItem[] = [
  { label: "Katalog Produk", href: "/products", icon: <Package className="h-4 w-4" />, permission: "products:read" },
  { label: "Manajemen Stok", href: "/inventory", icon: <Warehouse className="h-4 w-4" />, permission: "inventory:manage" },
  { label: "Tracking & QR Iklan", href: "/marketing", icon: <QrCode className="h-4 w-4" />, permission: "products:read" },
  { label: "Data Pelanggan", href: "/customers", icon: <Users className="h-4 w-4" />, permission: "customers:manage" },
  { label: "Laporan & Omzet", href: "/reports", icon: <BarChart3 className="h-4 w-4" />, permission: "reports:view" },
  { label: "Inbox Chat", href: "/settings/chat", icon: <MessageSquare className="h-4 w-4" />, permission: "customers:manage" },
  { label: "Profil & Niche Toko", href: "/settings/store", icon: <Store className="h-4 w-4" />, permission: "settings:manage" },
  { label: "Konfigurasi AI", href: "/settings/ai", icon: <Bot className="h-4 w-4" />, permission: "settings:manage" },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [productResults, setProductResults] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  const filterItems = (items: NavItem[]) =>
    items.filter((item) => !item.permission || hasPermission(user, item.permission))

  const visibleOps = filterItems(operationalItems)
  const visibleMgmt = filterItems(managementItems)
  const allNavItems = [...visibleOps, ...visibleMgmt]
  
  const filteredNavItems = searchQuery.trim()
    ? allNavItems.filter((i) =>
        i.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  const roleName = user?.roles?.[0]?.name ?? "user"
  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "DY"

  // 1. Keyboard Shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        inputRef.current?.focus()
        setIsSearchOpen(true)
      } else if (e.key === "Escape") {
        setIsSearchOpen(false)
        inputRef.current?.blur()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // 2. Click outside listener
  useEffect(() => {
    function handleClickOutside(e: Event) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false)
      }
    }
    document.addEventListener("pointerdown", handleClickOutside)
    return () => document.removeEventListener("pointerdown", handleClickOutside)
  }, [])

  // 3. Debounced Live Product Search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setProductResults([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true)
        const res = await apiFetch<{ products: Product[] }>(
          `products-list?search=${encodeURIComponent(searchQuery)}&pageSize=5`
        )
        if (res.data?.products) {
          setProductResults(res.data.products)
        }
      } catch {
        // ignore
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery])

  function handleSelectResult(href: string) {
    navigate(href)
    setIsSearchOpen(false)
    setSearchQuery("")
  }

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col overscroll-none bg-[#FBF9F5] text-[#181512] lg:h-screen lg:h-[100dvh] lg:overflow-hidden">
      {/* 1. TOP HEADER: Jeruk AI Sunlight Yellow Gradient Bar */}
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-black/5 bg-gradient-to-r from-[#FFE870] via-[#FFE560] to-[#FFF0A0] px-4 shadow-2xs lg:px-6">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="press-tactile rounded-xl border border-black/10 bg-white/70 p-2 text-[#181512] hover:bg-white lg:hidden"
            aria-label="Buka Menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/dashboard" className="flex items-center gap-2.5">
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
            </div>
          </Link>
        </div>

        {/* Center: Global Search Bar (Interactive Command Palette) */}
        <div ref={searchRef} className="relative hidden md:flex flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C5400]/70" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setIsSearchOpen(true)
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Cari menu, transaksi, atau produk... (Ctrl+K)"
              className="w-full rounded-full border border-black/10 bg-white/90 py-1.5 pl-9 pr-14 text-xs text-[#181512] placeholder:text-[#8C5400]/60 shadow-2xs backdrop-blur-xs transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5A2B]/20 focus:border-[#FF5A2B]"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  setProductResults([])
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-black/5 text-[#78716C]"
                title="Hapus pencarian"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded bg-black/5 px-1.5 py-0.5 text-[9px] font-bold text-[#8C5400]/70 border border-black/5">
                Ctrl K
              </span>
            )}
          </div>

          {/* Search Dropdown Results Popover */}
          {isSearchOpen && (
            <div className="absolute left-0 top-full mt-2 w-full rounded-2xl border border-[#EFECE6] bg-white p-3 shadow-jeruk-lg z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3">
              {/* State A: Typing a search query */}
              {searchQuery.trim().length > 0 ? (
                <>
                  {/* Category 1: Navigation Links */}
                  {filteredNavItems.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#A8A29E] px-2 mb-1.5">
                        Menu &amp; Modul
                      </p>
                      <div className="space-y-1">
                        {filteredNavItems.map((item) => (
                          <button
                            key={item.href}
                            type="button"
                            onClick={() => handleSelectResult(item.href)}
                            className="press-tactile w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#181512] hover:bg-[#FFF2ED] hover:text-[#FF5A2B] transition-colors text-left"
                          >
                            <span className="flex items-center gap-2">
                              <span className="text-[#FF5A2B]">{item.icon}</span>
                              <span>{item.label}</span>
                            </span>
                            <ArrowRight className="h-3 w-3 text-[#A8A29E]" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category 2: Matching Products from Database */}
                  <div>
                    <div className="flex items-center justify-between px-2 mb-1.5">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#A8A29E]">
                        Produk Terkait
                      </p>
                      {isSearching && <Loader2 className="h-3 w-3 animate-spin text-[#FF5A2B]" />}
                    </div>

                    {productResults.length > 0 ? (
                      <div className="space-y-1">
                        {productResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectResult("/pos")}
                            className="press-tactile w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-[#181512] hover:bg-[#FFF2ED] transition-colors text-left"
                          >
                            <div>
                              <p className="font-bold text-[#181512]">{p.name}</p>
                              <span className="text-[10px] text-[#78716C]">
                                SKU: {p.sku} • Stok: {p.stock}
                              </span>
                            </div>
                            <span className="font-numeric font-bold text-[#FF5A2B] text-xs">
                              {formatRupiah(p.price)}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      !isSearching && filteredNavItems.length === 0 && (
                        <div className="py-4 text-center text-xs text-[#78716C]">
                          Tidak ditemukan menu atau produk untuk "{searchQuery}"
                        </div>
                      )
                    )}
                  </div>
                </>
              ) : (
                /* State B: Empty query (Quick Shortcuts) */
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#A8A29E] px-2 mb-1.5">
                    Akses Pintar Cepat
                  </p>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => handleSelectResult("/pos")}
                      className="press-tactile w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#181512] hover:bg-[#FFF2ED] hover:text-[#FF5A2B] transition-colors text-left"
                    >
                      <span className="flex items-center gap-2">
                        <ShoppingCart className="h-3.5 w-3.5 text-[#FF5A2B]" />
                        <span>Buka Kasir POS &amp; Pembayaran</span>
                      </span>
                      <span className="text-[10px] text-[#A8A29E]">/pos</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectResult("/products")}
                      className="press-tactile w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#181512] hover:bg-[#FFF2ED] hover:text-[#FF5A2B] transition-colors text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-[#FF5A2B]" />
                        <span>Katalog &amp; Manajemen Produk</span>
                      </span>
                      <span className="text-[10px] text-[#A8A29E]">/products</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectResult("/customers")}
                      className="press-tactile w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#181512] hover:bg-[#FFF2ED] hover:text-[#FF5A2B] transition-colors text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-[#FF5A2B]" />
                        <span>Data Kontak Pelanggan</span>
                      </span>
                      <span className="text-[10px] text-[#A8A29E]">/customers</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Telemetry Chips, Lang Switcher & User Avatar */}
        <div className="flex items-center gap-2.5">
          {/* Quick link to Customer Portal */}
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="press-tactile hidden md:inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-xs font-bold text-[#181512] hover:bg-white shadow-2xs transition-colors"
            title="Buka Halaman Pemesanan Mandiri Pembeli (Tab Baru)"
          >
            <Store className="h-3.5 w-3.5 text-[#FF5A2B]" />
            <span>Katalog Pembeli</span>
            <ExternalLink className="h-2.5 w-2.5 text-stone-400" />
          </Link>

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
      <div className="relative flex flex-1 lg:overflow-hidden">
        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden touch-none"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar: Minimalist Pure White with High Negative Space */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#EFECE6] bg-white text-[#181512] transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full pointer-events-none lg:pointer-events-auto"
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
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-[#A8A29E]">
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
                      className={`press-tactile flex items-center gap-3 rounded-xl px-3 py-2 text-xs transition-all ${
                        isActive
                          ? "bg-[#FFF2ED] text-[#FF5A2B] font-bold shadow-2xs"
                          : "text-[#57534E] font-medium hover:bg-[#FDFBF7] hover:text-[#181512]"
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
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-[#A8A29E]">
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
                      className={`press-tactile flex items-center gap-3 rounded-xl px-3 py-2 text-xs transition-all ${
                        isActive
                          ? "bg-[#FFF2ED] text-[#FF5A2B] font-bold shadow-2xs"
                          : "text-[#57534E] font-medium hover:bg-[#FDFBF7] hover:text-[#181512]"
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
            <div className="rounded-2xl border border-orange-200/70 bg-[#FFF6ED] p-3 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-black text-[#FF5A2B]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Shift Kasir Aktif
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:overflow-y-auto overscroll-contain touch-pan-y [webkit-overflow-scrolling:touch]">
          {children}
        </main>
      </div>
    </div>
  )
}
