import { useState } from "react"
import { useCustomerCartStore } from "@/stores/customer-cart-store"
import {
  X,
  Plus,
  Minus,
  Trash2,
  Store,
  ShoppingBag,
  ArrowRight,
  FileText,
  AlertCircle,
  Leaf,
} from "lucide-react"

interface CustomerCartDrawerProps {
  open: boolean
  onClose: () => void
  onCheckout: () => void
}

export function CustomerCartDrawer({ open, onClose, onCheckout }: CustomerCartDrawerProps) {
  const {
    cart,
    customerInfo,
    setCustomerInfo,
    updateQuantity,
    updateNotes,
    clearCart,
    getSubtotal,
    getTotalItems,
  } = useCustomerCartStore()

  const [validationError, setValidationError] = useState("")
  const [activeNoteItem, setActiveNoteItem] = useState<string | null>(null)

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n)

  const subtotal = getSubtotal()
  const totalItems = getTotalItems()

  function handleProceedToPayment() {
    setValidationError("")
    if (!customerInfo.name.trim()) {
      setValidationError("Nama pemesan wajib diisi sebelum melanjutkan.")
      return
    }

    if (customerInfo.orderType === "dine_in" && !customerInfo.tableNumber?.trim()) {
      setValidationError("Nomor meja wajib diisi untuk pesanan Makan di Tempat.")
      return
    }

    onCheckout()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200/80 px-5 py-3.5 bg-[#FBF9F5]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-xl bg-emerald-700 text-white shadow-2xs">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-stone-900">Keranjang Pesanan</h2>
              <p className="text-xs text-stone-500 font-medium">
                <span className="tabular-nums font-mono font-bold">{totalItems}</span> item dipilih
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
            aria-label="Tutup Keranjang"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {cart.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3 border border-emerald-100">
                <Leaf className="h-8 w-8 text-emerald-600" />
              </div>
              <p className="text-base font-bold text-stone-900">Keranjang Masih Kosong</p>
              <p className="text-xs text-stone-500 max-w-xs mt-1">
                Pilih resep herbal alami dari katalog untuk memulai pemesanan.
              </p>
            </div>
          ) : (
            <>
              {/* Order Type Toggle */}
              <div className="rounded-2xl border border-stone-200/80 bg-[#FDFBF7] p-3.5 space-y-3">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
                  Metode Pengambilan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomerInfo({ orderType: "dine_in" })}
                    className={`flex items-center justify-center gap-2 min-h-[44px] h-11 py-2.5 px-3 rounded-xl text-xs font-bold transition ${
                      customerInfo.orderType === "dine_in"
                        ? "bg-emerald-700 text-white shadow-xs"
                        : "bg-white text-stone-600 border border-stone-200/80 hover:bg-stone-50"
                    }`}
                  >
                    <Store className="h-4 w-4" />
                    <span>Ambil di Kasir/Meja</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomerInfo({ orderType: "takeaway" })}
                    className={`flex items-center justify-center gap-2 min-h-[44px] h-11 py-2.5 px-3 rounded-xl text-xs font-bold transition ${
                      customerInfo.orderType === "takeaway"
                        ? "bg-emerald-700 text-white shadow-xs"
                        : "bg-white text-stone-600 border border-stone-200/80 hover:bg-stone-50"
                    }`}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>Bawa Pulang / Kirim</span>
                  </button>
                </div>

                {/* Dine-in Table Input */}
                {customerInfo.orderType === "dine_in" && (
                  <div className="pt-1">
                    <label className="text-[11px] font-semibold text-stone-500 block mb-1">
                      Nomor Meja Anda <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 04 / Bar-02"
                      value={customerInfo.tableNumber || ""}
                      onChange={(e) => setCustomerInfo({ tableNumber: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border border-stone-200/80 bg-white text-xs font-bold text-stone-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Customer Info Form */}
              <div className="rounded-2xl border border-stone-200/80 bg-[#FDFBF7] p-3.5 space-y-3">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
                  Informasi Pemesan
                </label>
                <div>
                  <label className="text-[11px] font-semibold text-stone-500 block mb-1">
                    Nama Pemesan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Masukkan nama lengkap / panggilan"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ name: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-stone-200/80 bg-white text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-stone-500 block mb-1">
                    No. WhatsApp (Opsional untuk struk)
                  </label>
                  <input
                    type="tel"
                    placeholder="0812xxxxxxxx"
                    value={customerInfo.phone || ""}
                    onChange={(e) => setCustomerInfo({ phone: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-stone-200/80 bg-white text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 focus:outline-none"
                  />
                </div>
              </div>

              {/* Cart Item List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                    Rincian Pesanan
                  </span>
                  <button
                    onClick={clearCart}
                    className="text-[11px] font-semibold text-rose-600 hover:underline"
                  >
                    Kosongkan
                  </button>
                </div>

                <div className="divide-y divide-stone-200/80 border border-stone-200/80 rounded-2xl bg-white overflow-hidden shadow-2xs">
                  {cart.map((item) => (
                    <div key={item.product.id} className="p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-stone-900 truncate">
                            {item.product.name}
                          </h4>
                          <p className="text-[11px] font-bold text-emerald-800 mt-0.5 tabular-nums font-mono">
                            {formatRupiah(item.product.price)}
                          </p>
                        </div>

                        {/* Quantity Stepper (Generous touch target for mobile) */}
                        <div className="flex items-center gap-1 bg-[#FDFBF7] border border-stone-200/80 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-lg text-stone-600 hover:bg-stone-200/60 active:scale-95 transition"
                            aria-label="Kurangi kuantitas"
                          >
                            {item.quantity === 1 ? (
                              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                            ) : (
                              <Minus className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <span className="w-7 text-center text-xs font-bold text-stone-900 tabular-nums font-mono">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock}
                            className="flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-lg text-stone-600 hover:bg-stone-200/60 disabled:opacity-30 active:scale-95 transition"
                            aria-label="Tambah kuantitas"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Notes / Special Instructions */}
                      <div>
                        {activeNoteItem === item.product.id ? (
                          <div className="mt-1 flex items-center gap-1.5">
                            <input
                              type="text"
                              value={item.notes || ""}
                              onChange={(e) => updateNotes(item.product.id, e.target.value)}
                              placeholder="Catatan (e.g. Kurang manis, tanpa es)..."
                              className="w-full text-[11px] h-8 px-2.5 rounded-lg border border-emerald-500 bg-emerald-50/30 focus:outline-none"
                              autoFocus
                              onBlur={() => setActiveNoteItem(null)}
                              onKeyDown={(e) => e.key === "Enter" && setActiveNoteItem(null)}
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveNoteItem(item.product.id)}
                            className="min-h-[32px] py-1 px-1.5 flex items-center gap-1.5 text-[11px] text-stone-500 hover:text-emerald-700 transition rounded-md"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>
                              {item.notes ? (
                                <span className="font-medium text-stone-900 italic">
                                  "{item.notes}"
                                </span>
                              ) : (
                                "+ Tambah Catatan Pesanan"
                              )}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer & Actions */}
        {cart.length > 0 && (
          <div className="border-t border-stone-200/80 bg-[#FDFBF7] p-5 space-y-3">
            {validationError && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal ({totalItems} item)</span>
                <span className="font-bold text-stone-900 tabular-nums font-mono">{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Pajak &amp; Layanan</span>
                <span className="font-semibold text-emerald-700">Gratis (Termasuk)</span>
              </div>
              <div className="border-t border-stone-200/80 pt-2 flex justify-between text-sm font-black text-stone-900">
                <span>Total Pembayaran</span>
                <span className="text-base text-emerald-800 tabular-nums font-mono font-bold">{formatRupiah(subtotal)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleProceedToPayment}
              className="press-tactile flex w-full min-h-[48px] h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 px-4 text-sm font-bold text-white shadow-sm shadow-emerald-700/20 active:scale-[0.98] transition"
            >
              <span>Lanjut ke Pembayaran</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
