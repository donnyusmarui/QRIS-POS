import { useState, useEffect, useCallback } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { apiFetch, hasPermission } from "@/lib/api"
import type { Product, ProductFormData, PaginatedResponse } from "@/types"
import { Plus, Search, Pencil, Trash2 } from "lucide-react"
import { ProductFormDialog } from "./ProductFormDialog"

export function ProductsPage() {
  const user = useAuthStore((s) => s.user)
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Produk</h1>
        {canWrite && (
          <button
            onClick={() => {
              setEditingProduct(null)
              setDialogOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Tambah Produk
          </button>
        )}
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
              {(canWrite || canDelete) && (
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              )}
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
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{product.sku}</td>
                  <td className="px-4 py-3 text-right">{formatRupiah(product.price)}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={
                        product.stock <= 5
                          ? "font-semibold text-destructive"
                          : ""
                      }
                    >
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {product.category ?? "—"}
                  </td>
                  {(canWrite || canDelete) && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {canWrite && (
                          <button
                            onClick={() => handleEdit(product)}
                            className="rounded p-1.5 hover:bg-accent"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="rounded p-1.5 hover:bg-destructive/10 text-destructive"
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
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
    </div>
  )
}
