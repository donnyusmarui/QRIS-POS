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
      {/* Welcome Banner */}
      <div className="flex flex-col gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
          Point of Sale & QRIS System
        </span>
        <h1 className="text-2xl font-bold tracking-tight">
          Selamat Datang, {user?.fullName || "Kasir"}! 👋
        </h1>
        <p className="max-w-xl text-sm opacity-90">
          Sistem kasir siap digunakan. Mulai transaksi penjualan baru atau pantau ringkasan performa toko hari ini.
        </p>
        <div className="mt-2 flex gap-3">
          <Link
            to="/pos"
            className="inline-flex items-center gap-2 rounded-xl bg-background px-4 py-2.5 text-xs font-bold text-foreground shadow transition hover:bg-background/90"
          >
            <QrCode className="h-4 w-4 text-primary" />
            Buka Kasir POS
          </Link>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20"
          >
            <Package className="h-4 w-4" />
            Katalog Produk
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Penjualan Hari Ini</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {isLoading ? "..." : formatRupiah(stats.todayRevenue)}
          </p>
          <span className="mt-1 flex items-center text-[11px] text-muted-foreground">
            {stats.todayTransactions} transaksi selesai hari ini
          </span>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Akumulasi Omzet</span>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {isLoading ? "..." : formatRupiah(stats.totalRevenue)}
          </p>
          <span className="mt-1 flex items-center text-[11px] text-muted-foreground">
            Dari total {stats.totalTransactions} transaksi
          </span>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Katalog Produk Aktif</span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {isLoading ? "..." : stats.totalProducts}
          </p>
          <Link
            to="/products"
            className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            Kelola inventaris <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Pelanggan Terdaftar</span>
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {isLoading ? "..." : stats.totalCustomers}
          </p>
          <Link
            to="/customers"
            className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            Lihat data kontak <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Akses Cepat Modul
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            to="/pos"
            className="flex items-center gap-3 rounded-xl border bg-card p-4 transition hover:border-primary hover:shadow-sm"
          >
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">Kasir Transaksi</p>
              <p className="text-xs text-muted-foreground">Buat invoice penjualan dan QRIS</p>
            </div>
          </Link>

          <Link
            to="/inventory"
            className="flex items-center gap-3 rounded-xl border bg-card p-4 transition hover:border-primary hover:shadow-sm"
          >
            <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-600">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">Manajemen Stok</p>
              <p className="text-xs text-muted-foreground">Penyesuaian stok dan restock</p>
            </div>
          </Link>

          <Link
            to="/reports"
            className="flex items-center gap-3 rounded-xl border bg-card p-4 transition hover:border-primary hover:shadow-sm"
          >
            <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">Laporan Penjualan</p>
              <p className="text-xs text-muted-foreground">Grafik pendapatan dan produk terlaris</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
