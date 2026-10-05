import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router"
import { useAuthStore } from "@/stores/auth-store"
import { apiFetch, hasPermission } from "@/lib/api"
import type { Product, ProductFormData, PaginatedResponse } from "@/types"
import { Plus, Search, Pencil, Trash2, QrCode, FileSpreadsheet, Printer, Bot, BarChart3 } from "lucide-react"
import { ProductFormDialog } from "./ProductFormDialog"
import { ProductQrModal } from "./ProductQrModal"
import { ProductBatchQrModal } from "./ProductBatchQrModal"
import { ProductBatchUploadModal } from "./ProductBatchUploadModal"
import { MasterChatbotQrModal } from "@/features/marketing/MasterChatbotQrModal"

export function ProductsPage() {
  const user = useAuthStore((s) => s.user)
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedQrProduct, setSelectedQrProduct] = useState<Product | null>(null)
  const [isBatchQrOpen, setIsBatchQrOpen] = useState(false)
  const [isBatchUploadOpen, setIsBatchUploadOpen] = useState(false)
  const [isMasterQrOpen, setIsMasterQrOpen] = useState(false)

  const canWrite = hasPermission(user, "products:write")
  const canDelete = hasPermission(user, "products:delete")

  const fetchProducts = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" })
      if (search) params.set("search", search)

      const res = await apiFetch<Product[]>(`products-list?${params}`) as PaginatedResponse<Product>
      setProducts(res.data ?? [])
      setTotalPages(res.pagination?.totalPages ?? 1)
    } catch {
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchProducts()
  }

  function handleEdit(product: Product) {
    setEditingProduct(product)
    setDialogOpen(true)
  }

  async function handleDelete(productId: string) {
    if (!confirm("Yakin ingin menghapus produk ini?")) return
    try {
      await apiFetch(`products-delete?id=${productId}`, { method: "DELETE" })
      fetchProducts()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus")
    }
  }

  async function handleSave(data: ProductFormData) {
    if (editingProduct) {
      await apiFetch(`products-update?id=${editingProduct.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      })
    } else {
      await apiFetch("products-create", {
        method: "POST",
        body: JSON.stringify(data),
      })
    }
    setDialogOpen(false)
    setEditingProduct(null)
    fetchProducts()
  }

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Katalog Produk</h1>
          <p className="text-xs text-stone-500">Kelola master data herbal, cetak label QR, dan unggah batch.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Level 1 QR: QR Meja Kasir / Chatbot Master */}
          <button
            type="button"
            onClick={() => setIsMasterQrOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 px-3.5 py-2 text-xs font-bold text-stone-700 shadow-2xs transition active:scale-95 cursor-pointer"
            title="Generate QR Meja Kasir / Chatbot Master untuk display akrilik"
          >
            <Bot className="h-4 w-4 text-emerald-700" />
            <span>QR Meja Kasir</span>
          </button>

          {/* Link to MarTech Suite */}
          <Link
            to="/marketing"
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 px-3.5 py-2 text-xs font-bold text-stone-700 shadow-2xs transition active:scale-95"
            title="Buka Suite Tracking & QR Iklan Multi-Kanal"
          >
            <BarChart3 className="h-4 w-4 text-emerald-700" />
            <span>Tracking &amp; Iklan</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsBatchQrOpen(true)}
            disabled={products.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs cursor-pointer disabled:opacity-50"
            title="Cetak Semua QR Code Produk dalam format A4"
          >
            <Printer className="h-4 w-4 text-emerald-700" />
            <span>Cetak Semua QR (Batch)</span>
          </button>

          {canWrite && (
            <button
              type="button"
              onClick={() => setIsBatchUploadOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition shadow-2xs cursor-pointer"
              title="Unggah batch produk via spreadsheet Excel"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Import Excel</span>
            </button>
          )}

          {canWrite && (
            <button
              type="button"
              onClick={() => {
                setEditingProduct(null)
                setDialogOpen(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs shadow-emerald-700/20 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Produk</span>
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau SKU..."
            className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Nama</th>
              <th className="px-4 py-3 text-left font-medium">SKU</th>
              <th className="px-4 py-3 text-right font-medium">Harga</th>
              <th className="px-4 py-3 text-right font-medium">Stok</th>
              <th className="px-4 py-3 text-left font-medium">Kategori</th>
              <th className="px-4 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Memuat...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Tidak ada produk ditemukan
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    <div className="font-semibold text-stone-900">{product.name}</div>
                    {product.description && (
                      <div className="text-xs text-stone-500 line-clamp-1 max-w-md mt-0.5 font-normal leading-relaxed">
                        {product.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-500">{product.sku}</td>
                  <td className="px-4 py-3 text-right font-semibold text-stone-900 tabular-nums">
                    {formatRupiah(product.price)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span
                      className={
                        product.stock <= 5
                          ? "font-semibold text-red-600"
                          : "font-medium text-stone-700"
                      }
                    >
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    <span className="inline-block text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      {product.category ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedQrProduct(product)}
                        className="rounded-lg p-1.5 hover:bg-emerald-50 text-emerald-700 transition cursor-pointer"
                        title="Lihat & Cetak QR Code Produk"
                      >
                        <QrCode className="h-4 w-4" />
                      </button>
                      {canWrite && (
                        <button
                          type="button"
                          onClick={() => handleEdit(product)}
                          className="rounded-lg p-1.5 hover:bg-accent text-stone-600 transition cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(product.id)}
                          className="rounded-lg p-1.5 hover:bg-destructive/10 text-destructive transition cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Sebelumnya
          </button>
          <span className="text-sm text-muted-foreground">
            Halaman {page} dari {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Berikutnya
          </button>
        </div>
      )}

      {/* Product Form Dialog */}
      <ProductFormDialog
        open={dialogOpen}
        product={editingProduct}
        onClose={() => {
          setDialogOpen(false)
          setEditingProduct(null)
        }}
        onSave={handleSave}
      />

      {/* Single Product QR Code Modal */}
      <ProductQrModal
        open={!!selectedQrProduct}
        product={selectedQrProduct}
        onClose={() => setSelectedQrProduct(null)}
      />

      {/* Batch QR Code Modal */}
      <ProductBatchQrModal
        open={isBatchQrOpen}
        products={products}
        onClose={() => setIsBatchQrOpen(false)}
      />

      {/* Batch Upload Excel Modal */}
      <ProductBatchUploadModal
        open={isBatchUploadOpen}
        onClose={() => setIsBatchUploadOpen(false)}
        onSuccess={() => {
          setIsBatchUploadOpen(false)
          fetchProducts()
        }}
      />

      {/* Master Chatbot / Meja Kasir QR Modal */}
      <MasterChatbotQrModal
        open={isMasterQrOpen}
        onClose={() => setIsMasterQrOpen(false)}
      />
    </div>
  )
}
