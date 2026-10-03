import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"
import {
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Package,
  RefreshCw,
} from "lucide-react"

interface SummaryData {
  totalRevenue: number
  totalTransactions: number
  totalProducts: number
  totalCustomers: number
  todayRevenue: number
  todayTransactions: number
}

interface TopProduct {
  productId: string
  productName: string
  totalQty: number
  totalRevenue: number
}

interface ChartItem {
  date: string
  revenue: number
  transactions: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

function CustomChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const val = payload[0].value
    const formatted = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val)
    return (
      <div className="rounded-xl border border-border/80 bg-popover/95 p-3 shadow-md backdrop-blur-xs">
        <p className="text-[11px] font-medium text-muted-foreground">Tanggal: {label}</p>
        <p className="font-numeric mt-1 text-sm font-bold text-foreground">{formatted}</p>
        <p className="text-[10px] text-primary font-medium">Omzet Penjualan</p>
      </div>
    )
  }
  return null
}

export function ReportsPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [chartData, setChartData] = useState<ChartItem[]>([])
  const [days, setDays] = useState<number>(7)
  const [isLoading, setIsLoading] = useState(true)

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

  async function loadData() {
    setIsLoading(true)
    try {
      const [sumRes, topRes, chartRes] = await Promise.all([
        apiFetch<SummaryData>("reports-summary"),
        apiFetch<TopProduct[]>("reports-top-products"),
        apiFetch<ChartItem[]>(`reports-sales-chart?days=${days}`),
      ])
      if (sumRes.data) setSummary(sumRes.data)
      if (topRes.data) setTopProducts(topRes.data)
      if (chartRes.data) setChartData(chartRes.data)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [days])

  function exportCSV() {
    if (!topProducts.length) return
    const headers = ["ID Produk", "Nama Produk", "Total Terjual (Unit)", "Total Pendapatan (Rp)"]
    const rows = topProducts.map((p) => [
      p.productId,
      `"${p.productName}"`,
      p.totalQty,
      p.totalRevenue,
    ])
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `laporan-penjualan-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance">Laporan &amp; Analitik Penjualan</h1>
          <p className="text-xs text-muted-foreground text-pretty">
            Grafik pendapatan harian, ringkasan omzet, dan produk terlaris
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-9 items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3 py-1 text-xs shadow-2xs">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-transparent font-medium focus:outline-none cursor-pointer"
            >
              <option value={7}>7 Hari Terakhir</option>
              <option value={14}>14 Hari Terakhir</option>
              <option value={30}>30 Hari Terakhir</option>
            </select>
          </div>
          <button
            onClick={exportCSV}
            disabled={topProducts.length === 0}
            className="press-tactile inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Ekspor CSV
          </button>
          <button
            onClick={loadData}
            className="press-tactile flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-card hover:bg-muted text-muted-foreground hover:text-foreground shadow-2xs"
            title="Refresh Data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="group rounded-2xl border border-border/60 bg-card p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Penjualan Hari Ini</span>
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 transition-transform group-hover:scale-105">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="font-numeric mt-3 text-2xl font-bold tracking-tight text-foreground">
            {formatRupiah(summary?.todayRevenue || 0)}
          </p>
          <span className="font-numeric mt-1 flex items-center text-[11px] text-muted-foreground">
            {summary?.todayTransactions || 0} transaksi berhasil
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
            {formatRupiah(summary?.totalRevenue || 0)}
          </p>
          <span className="font-numeric mt-1 flex items-center text-[11px] text-muted-foreground">
            {summary?.totalTransactions || 0} total transaksi lunas
          </span>
        </div>

        <div className="group rounded-2xl border border-border/60 bg-card p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Rata-rata per Transaksi</span>
            <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 transition-transform group-hover:scale-105">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <p className="font-numeric mt-3 text-2xl font-bold tracking-tight text-foreground">
            {formatRupiah(
              summary?.totalTransactions
                ? Math.round(summary.totalRevenue / summary.totalTransactions)
                : 0
            )}
          </p>
          <span className="font-numeric mt-1 flex items-center text-[11px] text-muted-foreground">
            Basket size rata-rata
          </span>
        </div>
      </div>

      {/* Sales Trend Chart */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-tight">
            Tren Pendapatan ({days} Hari Terakhir)
          </h2>
          <span className="text-[11px] text-muted-foreground font-medium">
            Dalam Rupiah (IDR)
          </span>
        </div>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
            Memuat grafik analitik...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
            Belum ada data penjualan pada rentang periode ini
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ opacity: 0.3 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => `Rp ${val / 1000}k`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomChartTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.04)" }} />
                <Bar dataKey="revenue" fill="currentColor" className="fill-primary" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top 10 Best Selling Products Table */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-tight">10 Produk Terlaris</h2>
            <p className="text-xs text-muted-foreground">Berdasarkan volume unit terjual dan kontribusi omzet</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Peringkat</th>
                <th className="px-4 py-3 text-left font-semibold">Nama Produk</th>
                <th className="px-4 py-3 text-center font-semibold">Unit Terjual</th>
                <th className="px-4 py-3 text-right font-semibold">Total Kontribusi Omzet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    Belum ada riwayat produk terjual
                  </td>
                </tr>
              ) : (
                topProducts.map((p, idx) => (
                  <tr key={p.productId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-numeric inline-flex h-6 w-6 items-center justify-center rounded-lg bg-muted text-xs font-bold text-foreground">
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {p.productName}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-numeric inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                        {p.totalQty} unit
                      </span>
                    </td>
                    <td className="font-numeric px-4 py-3 text-right text-xs font-bold tabular-nums text-foreground">
                      {formatRupiah(p.totalRevenue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
