import { useState, useEffect } from "react"
import type { Product, ProductFormData } from "@/types"
import { X } from "lucide-react"

interface ProductFormDialogProps {
  open: boolean
  product: Product | null
  onClose: () => void
  onSave: (data: ProductFormData) => Promise<void>
}

export function ProductFormDialog({
  open,
  product,
  onClose,
  onSave,
}: ProductFormDialogProps) {
  const [form, setForm] = useState<ProductFormData>({
    name: "",
    sku: "",
    price: 0,
    stock: 0,
    category: "",
  })
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = !!product

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        sku: product.sku,
        price: product.price,
        stock: product.stock,
        category: product.category ?? "",
        imageUrl: product.imageUrl ?? "",
        description: product.description ?? "",
      })
    } else {
      setForm({ name: "", sku: "", price: 0, stock: 0, category: "", imageUrl: "", description: "" })
    }
    setError("")
  }, [product, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)
    try {
      await onSave(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit Produk" : "Tambah Produk Baru"}
          </h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="Nama Produk"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            required
          />
          <Field
            label="SKU"
            value={form.sku}
            onChange={(v) => setForm((f) => ({ ...f, sku: v }))}
            required
            disabled={isEdit}
          />
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Harga (Rp)"
              type="number"
              value={String(form.price)}
              onChange={(v) => setForm((f) => ({ ...f, price: Number(v) }))}
              required
              min="0"
            />
            <Field
              label="Stok"
              type="number"
              value={String(form.stock)}
              onChange={(v) => setForm((f) => ({ ...f, stock: Number(v) }))}
              required
              min="0"
            />
          </div>
          <Field
            label="Kategori"
            value={form.category ?? ""}
            onChange={(v) => setForm((f) => ({ ...f, category: v }))}
            placeholder="Contoh: Kolesterol & Jantung"
          />
          <Field
            label="URL Gambar"
            value={form.imageUrl ?? ""}
            onChange={(v) => setForm((f) => ({ ...f, imageUrl: v }))}
            placeholder="https://images.unsplash.com/..."
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Khasiat &amp; No. BPOM</label>
            <textarea
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="[POM TR xxxxxxxxx] Khasiat herbal dan aturan pakai..."
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? "Menyimpan..." : isEdit ? "Perbarui" : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  disabled,
  placeholder,
  min,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  min?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        min={min}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      />
    </div>
  )
}
