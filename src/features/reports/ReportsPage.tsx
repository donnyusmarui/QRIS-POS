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
          <h1 className="text-2xl font-bold tracking-tight">Laporan & Analitik Penjualan</h1>
          <p className="text-xs text-muted-foreground">
            Grafik pendapatan harian, ringkasan omzet, dan produk terlaris
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border bg-card px-2 py-1 text-xs">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-transparent font-medium focus:outline-none"
            >
              <option value={7}>7 Hari Terakhir</option>
              <option value={14}>14 Hari Terakhir</option>
              <option value={30}>30 Hari Terakhir</option>
            </select>
          </div>
          <button
            onClick={exportCSV}
            disabled={topProducts.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Ekspor CSV
          </button>
          <button
            onClick={loadData}
            className="rounded-lg border p-1.5 hover:bg-muted"
            title="Refresh Data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Penjualan Hari Ini</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold">
            {formatRupiah(summary?.todayRevenue || 0)}
          </p>
          <span className="text-[11px] text-muted-foreground">
            {summary?.todayTransactions || 0} transaksi berhasil
          </span>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Akumulasi Omzet</span>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold">
            {formatRupiah(summary?.totalRevenue || 0)}
          </p>
          <span className="text-[11px] text-muted-foreground">
            {summary?.totalTransactions || 0} total transaksi lunas
          </span>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Rata-rata per Transaksi</span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold">
            {formatRupiah(
              summary?.totalTransactions
                ? Math.round(summary.totalRevenue / summary.totalTransactions)
                : 0
            )}
          </p>
          <span className="text-[11px] text-muted-foreground">Basket size rata-rata</span>
        </div>
      </div>

      {/* Sales Trend Chart */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-bold tracking-tight mb-4">
          Tren Pendapatan ({days} Hari Terakhir)
        </h2>
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
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => `Rp ${val / 1000}k`}
                />
                <Tooltip
                  formatter={(val: number) => [formatRupiah(val), "Omzet"]}
                  labelFormatter={(lbl) => `Tanggal: ${lbl}`}
                />
                <Bar dataKey="revenue" fill="currentColor" className="fill-primary" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top 10 Best Selling Products Table */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-tight">10 Produk Terlaris</h2>
          <span className="text-xs text-muted-foreground">Berdasarkan volume penjualan</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Peringkat</th>
                <th className="px-4 py-2.5 text-left font-medium">Nama Produk</th>
                <th className="px-4 py-2.5 text-center font-medium">Unit Terjual</th>
                <th className="px-4 py-2.5 text-right font-medium">Total Kontribusi Omzet</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-xs text-muted-foreground">
                    Belum ada riwayat produk terjual
                  </td>
                </tr>
              ) : (
                topProducts.map((p, idx) => (
                  <tr key={p.productId} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-bold text-xs">
                      #{idx + 1}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-foreground">
                      {p.productName}
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold text-primary">
                      {p.totalQty} unit
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold">
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
