import { useState, useEffect } from "react"
import type { Product, ProductFormData } from "@/types"
import { X, Bot, Sparkles, MessageSquare } from "lucide-react"
import { parseProductChatConfig, serializeProductDescription } from "@/lib/product-chat-config"

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
  const [cleanDesc, setCleanDesc] = useState("")
  const [chatButtonText, setChatButtonText] = useState("Tanya Apoteker")
  const [chatEnabled, setChatEnabled] = useState(true)
  const [chatCustomPrompt, setChatCustomPrompt] = useState("")

  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = !!product

  useEffect(() => {
    if (product) {
      const { cleanDescription, chatConfig } = parseProductChatConfig(product.description)
      setForm({
        name: product.name,
        sku: product.sku,
        price: product.price,
        stock: product.stock,
        category: product.category ?? "",
        imageUrl: product.imageUrl ?? "",
        description: product.description ?? "",
      })
      setCleanDesc(cleanDescription)
      setChatButtonText(chatConfig.buttonText)
      setChatEnabled(chatConfig.enabled)
      setChatCustomPrompt(chatConfig.customPrompt)
    } else {
      setForm({ name: "", sku: "", price: 0, stock: 0, category: "", imageUrl: "", description: "" })
      setCleanDesc("")
      setChatButtonText("Tanya Apoteker")
      setChatEnabled(true)
      setChatCustomPrompt("")
    }
    setError("")
  }, [product, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)
    try {
      const fullDescription = serializeProductDescription(cleanDesc, {
        buttonText: chatButtonText,
        enabled: chatEnabled,
        customPrompt: chatCustomPrompt,
      })
      await onSave({
        ...form,
        description: fullDescription,
      })
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
              value={cleanDesc}
              onChange={(e) => setCleanDesc(e.target.value)}
              placeholder="[POM TR xxxxxxxxx] Khasiat herbal dan aturan pakai..."
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* ── KUSTOMISASI CHATBOT & TOMBOL RAG PRODUK ── */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-emerald-700" />
                <span className="text-xs font-bold text-emerald-950">
                  Kustomisasi Chatbot RAG &amp; Tombol Produk
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={chatEnabled}
                  onChange={(e) => setChatEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="ml-2 text-[11px] font-semibold text-stone-700">
                  {chatEnabled ? "Tombol Aktif" : "Nonaktif"}
                </span>
              </label>
            </div>

            {chatEnabled && (
              <div className="space-y-3 pt-1 border-t border-emerald-100">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Label Tombol Chat</span>
                  </label>
                  <input
                    type="text"
                    value={chatButtonText}
                    onChange={(e) => setChatButtonText(e.target.value)}
                    placeholder="Contoh: Tanya Apoteker / Konsultasi Dosis"
                    className="flex h-9 w-full rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                  <p className="text-[10px] text-stone-500">
                    Teks yang muncul pada tombol kartu katalog dan modal detail produk.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Custom Persona / Prompt Khusus Produk (Opsional)</span>
                  </label>
                  <textarea
                    value={chatCustomPrompt}
                    onChange={(e) => setChatCustomPrompt(e.target.value)}
                    placeholder="Contoh: Fokus jelaskan bahwa herbal ini aman diminum penderita lambung jika diminum 30 menit setelah makan..."
                    rows={2}
                    className="flex w-full rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                  <p className="text-[10px] text-stone-500">
                    Instruksi tambahan untuk Apoteker AI saat pelanggan bertanya mengenai produk ini. Kosongkan untuk menggunakan prompt default.
                  </p>
                </div>
              </div>
            )}
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
