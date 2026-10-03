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
  ArrowRight,
  QrCode,
  Sparkles,
  Receipt,
  Warehouse,
  CheckCircle2,
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. TOP DUAL-CARD HERO COMPARTMENT (Jeruk AI Dashboard Top Replica) */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left Hero Card: Butter-Yellow Warm Gradient (Spans 2 cols) */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl border border-[#F3E8B5] bg-gradient-to-br from-[#FFFDF0] via-[#FFF9DC] to-[#FFF3B0] p-6 sm:p-7 text-[#181512] shadow-jeruk flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#8C5400]/80 mb-2">
              <span>Beranda</span>
              <span>/</span>
              <span>Dashboard Kasir</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#181512] text-balance">
              Halo, {user?.fullName || "Kasir"} — siap transaksi{" "}
              <span className="text-[#FF5A2B] underline decoration-wavy decoration-[#FF5A2B]/40">sistematis</span> hari ini?
            </h1>
            <p className="mt-2 max-w-xl text-xs sm:text-sm text-[#78716C] text-pretty">
              Sistem kasir offline lokal aktif. Buka kasir untuk melayani pelanggan atau pantau rekapan transaksi QRIS.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/pos"
              className="press-tactile inline-flex items-center gap-2 rounded-xl bg-[#FF5A2B] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:bg-[#E5481B]"
            >
              <QrCode className="h-4 w-4" />
              <span>+ Buka Kasir POS</span>
            </Link>
            <Link
              to="/products"
              className="press-tactile inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-xs font-bold text-[#181512] shadow-2xs hover:bg-[#FDFBF7]"
            >
              <Package className="h-4 w-4 text-[#8C5400]" />
              <span>Katalog Produk</span>
            </Link>
          </div>
        </div>

        {/* Right Card: Quick Active Session Card ("Lanjutkan Sesi Kasir") */}
        <div className="rounded-3xl border border-[#EFECE6] bg-white p-6 shadow-jeruk flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-[#FF5A2B]">
                Terminal Kasir Siap
              </span>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-2xl bg-[#FFF6ED] border border-orange-200/60 p-3.5">
              <div className="rounded-xl bg-[#FF5A2B]/10 p-2 text-[#FF5A2B]">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#181512]">Shift Kasir Aktif</p>
                <p className="text-[11px] text-[#78716C] mt-0.5">
                  Printer thermal &amp; QRIS statis siap memproses transaksi tunai / digital.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between pt-2 border-t border-[#EFECE6]">
            <span className="text-[11px] text-[#78716C] font-medium">Buka kasir sekarang</span>
            <Link
              to="/pos"
              className="press-tactile inline-flex items-center gap-1.5 rounded-xl bg-[#FF5A2B] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-[#E5481B]"
            >
              <span>Mulai</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. TELEMETRY METRIC CHIPS ROW (Jeruk AI Telemetry Cards Replica) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Penjualan Hari Ini */}
        <div className="group rounded-2xl border border-[#EFECE6] bg-white p-5 shadow-jeruk transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-[#78716C]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Penjualan Hari Ini</span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 transition-transform group-hover:scale-105">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="font-numeric mt-2.5 text-2xl font-black tracking-tight text-[#181512]">
            {isLoading ? "..." : formatRupiah(stats.todayRevenue)}
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="font-numeric text-[#78716C]">
              {stats.todayTransactions} transaksi lunas
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 text-[10px]">
              Hari Ini
            </span>
          </div>
        </div>

        {/* Card 2: Total Akumulasi Omzet */}
        <div className="group rounded-2xl border border-[#EFECE6] bg-white p-5 shadow-jeruk transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-[#78716C]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Akumulasi Omzet</span>
            <div className="rounded-xl bg-[#FFF2ED] p-2 text-[#FF5A2B] transition-transform group-hover:scale-105">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="font-numeric mt-2.5 text-2xl font-black tracking-tight text-[#181512]">
            {isLoading ? "..." : formatRupiah(stats.totalRevenue)}
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="font-numeric text-[#78716C]">
              {stats.totalTransactions} total transaksi
            </span>
            <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 font-bold text-[#FF5A2B] text-[10px]">
              Toko Aktif
            </span>
          </div>
        </div>

        {/* Card 3: Katalog Produk Aktif */}
        <div className="group rounded-2xl border border-[#EFECE6] bg-white p-5 shadow-jeruk transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-[#78716C]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Katalog Produk Aktif</span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600 transition-transform group-hover:scale-105">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <p className="font-numeric mt-2.5 text-2xl font-black tracking-tight text-[#181512]">
            {isLoading ? "..." : `${stats.totalProducts} Item`}
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <Link
              to="/products"
              className="press-tactile font-bold text-[#FF5A2B] hover:underline inline-flex items-center gap-1"
            >
              <span>Kelola inventaris</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 font-bold text-blue-700 text-[10px]">
              Siap Jual
            </span>
          </div>
        </div>

        {/* Card 4: Pelanggan Terdaftar */}
        <div className="group rounded-2xl border border-[#EFECE6] bg-white p-5 shadow-jeruk transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-[#78716C]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pelanggan Terdaftar</span>
            <div className="rounded-xl bg-purple-50 p-2 text-purple-600 transition-transform group-hover:scale-105">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="font-numeric mt-2.5 text-2xl font-black tracking-tight text-[#181512]">
            {isLoading ? "..." : `${stats.totalCustomers} Kontak`}
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <Link
              to="/customers"
              className="press-tactile font-bold text-[#FF5A2B] hover:underline inline-flex items-center gap-1"
            >
              <span>Lihat kontak</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
            <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 font-bold text-purple-700 text-[10px]">
              Member
            </span>
          </div>
        </div>
      </div>

      {/* 3. WARM ESPRESSO DARK CONTRAST ANCHOR BANNER (Jeruk AI Dark Banner Replica) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1C1917] via-[#241E19] to-[#2B231D] p-6 sm:p-7 text-white shadow-xl border border-black/10">
        {/* Subtle Decorative Ambient Gold Glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#FFE972]/10 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-[#FFE972] shadow-inner">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-white">
                  Pembayaran QRIS Standar Bank Indonesia
                </span>
                <span className="rounded-full bg-[#FFE972] px-2 py-0.5 text-[10px] font-black text-[#1C1917]">
                  Dinamis
                </span>
              </div>
              <p className="mt-1 text-xs text-[#A8A29E] max-w-xl text-pretty">
                Menerima scan dari seluruh e-Wallet (GoPay, OVO, ShopeePay, DANA) dan Mobile Banking (BCA, Mandiri, BRI, BNI) dengan verifikasi pembayaran instan.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <Link
              to="/reports"
              className="press-tactile inline-flex items-center gap-2 rounded-xl bg-[#FF5A2B] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/30 hover:bg-[#E5481B]"
            >
              <span>Cek Rekap Laporan</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. MODUL UTAMA (Jeruk AI Feature Cards Grid Replica) */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-[#181512]">
              Akses Cepat Modul Kasir &amp; Toko
            </h2>
            <p className="text-xs text-[#78716C]">Pilih modul operasional untuk mempercepat alur kasir</p>
          </div>

          {/* Simulated Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="rounded-full bg-[#181512] px-3 py-1 text-xs font-bold text-white shadow-2xs">
              Semua Modul
            </span>
            <span className="rounded-full bg-white border border-[#EFECE6] px-3 py-1 text-xs font-medium text-[#78716C]">
              Kasir
            </span>
            <span className="rounded-full bg-white border border-[#EFECE6] px-3 py-1 text-xs font-medium text-[#78716C]">
              Stok
            </span>
            <span className="rounded-full bg-white border border-[#EFECE6] px-3 py-1 text-xs font-medium text-[#78716C]">
              Laporan
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Card A: Terminal Kasir */}
          <Link
            to="/pos"
            className="press-tactile group rounded-3xl border border-[#EFECE6] bg-white p-5 shadow-jeruk transition-all hover:border-[#FF5A2B]/40 hover:shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#FFF2ED] px-2.5 py-0.5 text-[10px] font-bold text-[#FF5A2B]">
                  Operasional
                </span>
                <span className="text-[11px] text-[#A8A29E] font-semibold">Aktif</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="rounded-2xl bg-[#FFF2ED] p-3 text-[#FF5A2B] transition-transform group-hover:scale-105">
                  <ShoppingCart className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#181512] group-hover:text-[#FF5A2B] transition-colors">
                    Terminal Kasir POS
                  </h3>
                  <p className="text-xs text-[#78716C] mt-0.5 text-pretty">
                    Invoice cepat, kalkulasi kembalian, cetak struk thermal, &amp; QRIS.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#EFECE6] flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Siap Digunakan
              </span>
              <span className="font-bold text-[#FF5A2B] group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                Buka <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>

          {/* Card B: Manajemen Stok & Inventory */}
          <Link
            to="/inventory"
            className="press-tactile group rounded-3xl border border-[#EFECE6] bg-white p-5 shadow-jeruk transition-all hover:border-[#FF5A2B]/40 hover:shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                  Gudang &amp; Stok
                </span>
                <span className="text-[11px] text-[#A8A29E] font-semibold">Audit</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="rounded-2xl bg-amber-50 p-3 text-amber-600 transition-transform group-hover:scale-105">
                  <Warehouse className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#181512] group-hover:text-[#FF5A2B] transition-colors">
                    Manajemen Stok
                  </h3>
                  <p className="text-xs text-[#78716C] mt-0.5 text-pretty">
                    Penyesuaian stok masuk, restock supplier, dan riwayat log barang.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#EFECE6] flex items-center justify-between text-xs">
              <span className="font-numeric text-[#78716C] font-semibold">
                {stats.totalProducts} Produk Aktif
              </span>
              <span className="font-bold text-[#FF5A2B] group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                Atur Stok <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>

          {/* Card C: Riwayat & Laporan Penjualan */}
          <Link
            to="/reports"
            className="press-tactile group rounded-3xl border border-[#EFECE6] bg-white p-5 shadow-jeruk transition-all hover:border-[#FF5A2B]/40 hover:shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  Keuangan
                </span>
                <span className="text-[11px] text-[#A8A29E] font-semibold">Analitik</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600 transition-transform group-hover:scale-105">
                  <Receipt className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#181512] group-hover:text-[#FF5A2B] transition-colors">
                    Laporan &amp; Omzet
                  </h3>
                  <p className="text-xs text-[#78716C] mt-0.5 text-pretty">
                    Grafik pendapatan harian, ekspor CSV, dan daftar produk terlaris.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#EFECE6] flex items-center justify-between text-xs">
              <span className="font-numeric text-[#78716C] font-semibold">
                {stats.totalTransactions} Transaksi
              </span>
              <span className="font-bold text-[#FF5A2B] group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                Lihat Grafik <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
