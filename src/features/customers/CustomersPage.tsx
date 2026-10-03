import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import type { Customer, CustomerFormData, PaginatedResponse } from "@/types"
import { Plus, Search, Pencil, Trash2, X, Loader2, RefreshCw } from "lucide-react"

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [form, setForm] = useState<CustomerFormData>({
    name: "",
    phone: "",
    email: "",
    address: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" })
      if (search) params.set("search", search)
      const res = await apiFetch<Customer[]>(`customers-list?${params}`) as PaginatedResponse<Customer>
      setCustomers(res.data ?? [])
      setTotalPages(res.pagination?.totalPages ?? 1)
    } catch {
      setCustomers([])
    } finally {
      setIsLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  function handleOpenCreate() {
    setEditingCustomer(null)
    setForm({ name: "", phone: "", email: "", address: "" })
    setErrorMsg("")
    setDialogOpen(true)
  }

  function handleOpenEdit(customer: Customer) {
    setEditingCustomer(customer)
    setForm({
      name: customer.name,
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      address: customer.address ?? "",
    })
    setErrorMsg("")
    setDialogOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus data pelanggan ini?")) return
    try {
      await apiFetch(`customers-delete?id=${id}`, { method: "DELETE" })
      fetchCustomers()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus pelanggan")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg("")
    try {
      if (editingCustomer) {
        await apiFetch(`customers-update?id=${editingCustomer.id}`, {
          method: "PUT",
          body: JSON.stringify(form),
        })
      } else {
        await apiFetch("customers-create", {
          method: "POST",
          body: JSON.stringify(form),
        })
      }
      setDialogOpen(false)
      fetchCustomers()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menyimpan pelanggan")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Pelanggan</h1>
          <p className="text-xs text-muted-foreground">
            Daftar data kontak pelanggan untuk transaksi dan riwayat belanja
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Tambah Pelanggan
        </button>
      </div>

      {/* Filter / Search */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Cari nama, no. HP, atau email..."
            className="flex h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <button
          onClick={() => fetchCustomers()}
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
              <th className="px-4 py-3 text-left font-medium">Nama Pelanggan</th>
              <th className="px-4 py-3 text-left font-medium">No. Telepon / WhatsApp</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Alamat</th>
              <th className="px-4 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Memuat data pelanggan...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Belum ada data pelanggan
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-semibold">{c.name}</td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                    {c.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.address || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="rounded p-1.5 hover:bg-muted"
                        title="Edit Pelanggan"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                        title="Hapus Pelanggan"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
            className="rounded-md border px-3 py-1.5 text-xs disabled:opacity-50"
          >
            Sebelumnya
          </button>
          <span className="text-xs text-muted-foreground">
            Halaman {page} dari {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-md border px-3 py-1.5 text-xs disabled:opacity-50"
          >
            Berikutnya
          </button>
        </div>
      )}

      {/* Create / Edit Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setDialogOpen(false)} />
          <div className="relative z-50 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base">
                {editingCustomer ? "Edit Pelanggan" : "Tambah Pelanggan Baru"}
              </h3>
              <button
                onClick={() => setDialogOpen(false)}
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

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nama Lengkap</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nama Pelanggan"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Nomor Telepon / WA</label>
                <input
                  type="tel"
                  value={form.phone || ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="081234567890"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Email (Opsional)</label>
                <input
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="pelanggan@example.com"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Alamat (Opsional)</label>
                <textarea
                  rows={2}
                  value={form.address || ""}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Alamat lengkap..."
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
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
                  {isSubmitting ? "Menyimpan..." : "Simpan Pelanggan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
