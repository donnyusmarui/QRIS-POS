import { useState, useEffect } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { apiFetch } from "@/lib/api"
import { Link } from "react-router"
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  ArrowUpRight,
  QrCode,
} from "lucide-react"

interface DashboardStats {
  totalRevenue: number
  totalTransactions: number
  totalProducts: number
  totalCustomers: number
  todayRevenue: number
  todayTransactions: number
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalTransactions: 0,
    totalProducts: 0,
    totalCustomers: 0,
    todayRevenue: 0,
    todayTransactions: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await apiFetch<DashboardStats>("reports-summary")
        if (res.data) setStats(res.data)
      } catch {
        // Fallback for role that has no report permission
      } finally {
        setIsLoading(false)
      }
    }
    loadStats()
  }, [])

  return (
    <div className="space-y-6">
      {/* Welcome Banner with Concentric Radius & Subtle Depth */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/95 to-primary/80 p-6 text-primary-foreground shadow-sm">
        {/* Subtle Decorative Ambient Glow */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 right-1/4 h-32 w-32 rounded-full bg-black/10 blur-xl" />

        <div className="relative z-10 flex flex-col gap-2">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide backdrop-blur-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="uppercase">Point of Sale &amp; QRIS System</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-balance">
            Selamat Datang, {user?.fullName || "Kasir"}! 👋
          </h1>
          <p className="max-w-xl text-sm opacity-90 text-pretty">
            Sistem kasir siap digunakan. Mulai transaksi penjualan baru atau pantau ringkasan performa toko hari ini.
          </p>

          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              to="/pos"
              className="press-tactile inline-flex items-center gap-2 rounded-xl bg-background px-4 py-2.5 text-xs font-bold text-foreground shadow-xs transition hover:bg-background/90"
            >
              <QrCode className="h-4 w-4 text-primary" />
              Buka Kasir POS
            </Link>
            <Link
              to="/products"
              className="press-tactile inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20"
            >
              <Package className="h-4 w-4" />
              Katalog Produk
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards with Tabular Numerals & Subtle Elevation */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="group rounded-2xl border border-border/60 bg-card p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Penjualan Hari Ini</span>
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 transition-transform group-hover:scale-105">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="font-numeric mt-3 text-2xl font-bold tracking-tight text-foreground">
            {isLoading ? "..." : formatRupiah(stats.todayRevenue)}
          </p>
          <span className="font-numeric mt-1 flex items-center text-[11px] text-muted-foreground">
            {stats.todayTransactions} transaksi selesai hari ini
          </span>
        </div>

        <div className="group rounded-2xl border border-border/60 bg-card p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Akumulasi Omzet</span>
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary transition-transform group-hover:scale-105">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="font-numeric mt-3 text-2xl font-bold tracking-tight text-foreground">
            {isLoading ? "..." : formatRupiah(stats.totalRevenue)}
          </p>
          <span className="font-numeric mt-1 flex items-center text-[11px] text-muted-foreground">
            Dari total {stats.totalTransactions} transaksi
          </span>
        </div>

        <div className="group rounded-2xl border border-border/60 bg-card p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Katalog Produk Aktif</span>
            <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 transition-transform group-hover:scale-105">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <p className="font-numeric mt-3 text-2xl font-bold tracking-tight text-foreground">
            {isLoading ? "..." : stats.totalProducts}
          </p>
          <Link
            to="/products"
            className="press-tactile mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            Kelola inventaris <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="group rounded-2xl border border-border/60 bg-card p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Pelanggan Terdaftar</span>
            <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-600 transition-transform group-hover:scale-105">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="font-numeric mt-3 text-2xl font-bold tracking-tight text-foreground">
            {isLoading ? "..." : stats.totalCustomers}
          </p>
          <Link
            to="/customers"
            className="press-tactile mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            Lihat data kontak <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Akses Cepat Modul
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            to="/pos"
            className="press-tactile group flex items-center gap-3.5 rounded-2xl border border-border/60 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-sm"
          >
            <div className="rounded-xl bg-primary/10 p-3 text-primary transition-transform group-hover:scale-105">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Kasir Transaksi</p>
              <p className="text-xs text-muted-foreground text-pretty">Buat invoice penjualan dan QRIS</p>
            </div>
          </Link>

          <Link
            to="/inventory"
            className="press-tactile group flex items-center gap-3.5 rounded-2xl border border-border/60 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-sm"
          >
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-600 transition-transform group-hover:scale-105">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Manajemen Stok</p>
              <p className="text-xs text-muted-foreground text-pretty">Penyesuaian stok dan restock</p>
            </div>
          </Link>

          <Link
            to="/reports"
            className="press-tactile group flex items-center gap-3.5 rounded-2xl border border-border/60 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-sm"
          >
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-600 transition-transform group-hover:scale-105">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Laporan Penjualan</p>
              <p className="text-xs text-muted-foreground text-pretty">Grafik pendapatan dan produk terlaris</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
