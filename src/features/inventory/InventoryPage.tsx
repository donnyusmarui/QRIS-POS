import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import type { Product, PaginatedResponse } from "@/types"
import {
  Warehouse,
  AlertTriangle,
  History,
  Plus,
  Minus,
  Search,
  RefreshCw,
  X,
  Loader2,
} from "lucide-react"

interface InventoryLogItem {
  id: string
  productId: string
  productName: string
  changeQty: number
  reason: string
  creatorName: string
  createdAt: string
}

export function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"stock" | "history">("stock")
  const [products, setProducts] = useState<Product[]>([])
  const [logs, setLogs] = useState<InventoryLogItem[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  // Dialog state
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [adjustQty, setAdjustQty] = useState<number>(0)
  const [adjustType, setAdjustType] = useState<"add" | "subtract">("add")
  const [adjustReason, setAdjustReason] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const fetchProducts = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await apiFetch<Product[]>("products-list?pageSize=100")
      setProducts(res.data ?? [])
    } catch {
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await apiFetch<InventoryLogItem[]>("inventory-list?pageSize=50") as PaginatedResponse<InventoryLogItem>
      setLogs(res.data ?? [])
    } catch {
      setLogs([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === "stock") {
      fetchProducts()
    } else {
      fetchLogs()
    }
  }, [activeTab, fetchProducts, fetchLogs])

  function handleOpenAdjust(product: Product) {
    setSelectedProduct(product)
    setAdjustQty(1)
    setAdjustType("add")
    setAdjustReason("Penambahan stok baru")
    setErrorMsg("")
    setAdjustDialogOpen(true)
  }

  async function handleSaveAdjustment(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProduct) return
    if (adjustQty <= 0) {
      setErrorMsg("Jumlah harus lebih dari 0")
      return
    }

    const delta = adjustType === "add" ? adjustQty : -adjustQty
    if (adjustType === "subtract" && selectedProduct.stock < adjustQty) {
      setErrorMsg(`Stok tidak mencukupi untuk pengurangan (saat ini: ${selectedProduct.stock})`)
      return
    }

    setIsSubmitting(true)
    setErrorMsg("")
    try {
      await apiFetch("inventory-adjust", {
        method: "POST",
        body: JSON.stringify({
          productId: selectedProduct.id,
          changeQty: delta,
          reason: adjustReason,
        }),
      })
      setAdjustDialogOpen(false)
      fetchProducts()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menyesuaikan stok")
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  )

  const lowStockCount = products.filter((p) => p.stock <= 5).length

  return (
    <div className="space-y-4">
      {/* Top Banner & Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Inventory</h1>
          <p className="text-xs text-muted-foreground">
            Kelola dan pantau pergerakan stok barang di gudang & toko
          </p>
        </div>

        <div className="flex rounded-lg border bg-muted p-1">
          <button
            onClick={() => setActiveTab("stock")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "stock"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Warehouse className="h-4 w-4" />
            Stok Barang
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "history"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="h-4 w-4" />
            Riwayat Penyesuaian
          </button>
        </div>
      </div>

      {activeTab === "stock" && (
        <div className="space-y-4">
          {/* Stats Bar */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                <Warehouse className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Item Terdaftar</p>
                <p className="text-xl font-bold">{products.length} SKU</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Perlu Restok (Stok ≤ 5)</p>
                <p className="text-xl font-bold text-amber-600">{lowStockCount} Produk</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau SKU..."
                className="flex h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <button
              onClick={() => fetchProducts()}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">SKU</th>
                  <th className="px-4 py-3 text-left font-medium">Nama Produk</th>
                  <th className="px-4 py-3 text-left font-medium">Kategori</th>
                  <th className="px-4 py-3 text-center font-medium">Status Stok</th>
                  <th className="px-4 py-3 text-right font-medium">Sisa Stok</th>
                  <th className="px-4 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Memuat data stok...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Tidak ada produk ditemukan
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isLow = p.stock <= 5
                    const isOut = p.stock <= 0
                    return (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {p.sku}
                        </td>
                        <td className="px-4 py-3 font-medium">{p.name}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {p.category ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isOut ? (
                            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                              Habis
                            </span>
                          ) : isLow ? (
                            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600">
                              Kritis
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                              Aman
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-sm">
                          {p.stock}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleOpenAdjust(p)}
                            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                          >
                            Sesuaikan Stok
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">Log penyesuaian stok masuk dan keluar</p>
            <button
              onClick={() => fetchLogs()}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Waktu</th>
                  <th className="px-4 py-3 text-left font-medium">Produk</th>
                  <th className="px-4 py-3 text-center font-medium">Perubahan</th>
                  <th className="px-4 py-3 text-left font-medium">Alasan</th>
                  <th className="px-4 py-3 text-left font-medium">Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Memuat riwayat perubahan...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Belum ada riwayat penyesuaian stok
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium">{log.productName}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-mono text-xs font-bold ${
                            log.changeQty > 0
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          {log.changeQty > 0 ? `+${log.changeQty}` : log.changeQty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">{log.reason}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {log.creatorName}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust Stock Dialog */}
      {adjustDialogOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setAdjustDialogOpen(false)} />
          <div className="relative z-50 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base">Penyesuaian Stok</h3>
                <p className="text-xs text-muted-foreground">{selectedProduct.name} (Stok Saat Ini: {selectedProduct.stock})</p>
              </div>
              <button
                onClick={() => setAdjustDialogOpen(false)}
                className="rounded p-1 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 rounded-lg border border-destructive/50 bg-destructive/10 p-2.5 text-xs text-destructive">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveAdjustment} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tipe Penyesuaian</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType("add")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition ${
                      adjustType === "add"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                        : "hover:bg-muted"
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah Stok Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("subtract")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition ${
                      adjustType === "subtract"
                        ? "border-rose-600 bg-rose-50 text-rose-700"
                        : "hover:bg-muted"
                    }`}
                  >
                    <Minus className="h-3.5 w-3.5" />
                    Kurangi Stok Rusak/Hilang
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Jumlah Perubahan</label>
                <input
                  type="number"
                  min="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Alasan Penyesuaian</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Contoh: Pembelian supplier, barang rusak, dll"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustDialogOpen(false)}
                  className="rounded-lg border px-4 py-2 text-xs font-semibold hover:bg-muted"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
