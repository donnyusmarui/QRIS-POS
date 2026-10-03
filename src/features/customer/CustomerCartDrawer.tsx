import { useState } from "react"
import { useCustomerCartStore } from "@/stores/customer-cart-store"
import {
  X,
  Plus,
  Minus,
  Trash2,
  UtensilsCrossed,
  ShoppingBag,
  ArrowRight,
  FileText,
  AlertCircle,
  Coffee,
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EFECE6] px-5 py-4 bg-[#FBF9F5]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF5A2B] text-white shadow-sm">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#181512]">Keranjang Pesanan</h2>
              <p className="text-xs text-[#78716C] font-medium">{totalItems} item dipilih</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#78716C] hover:bg-black/5 hover:text-[#181512] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {cart.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF2ED] text-[#FF5A2B] mb-3">
                <Coffee className="h-8 w-8" />
              </div>
              <p className="text-base font-bold text-[#181512]">Keranjang Masih Kosong</p>
              <p className="text-xs text-[#78716C] max-w-xs mt-1">
                Pilih menu favorit Anda dari katalog untuk memulai pemesanan.
              </p>
            </div>
          ) : (
            <>
              {/* Order Type Toggle */}
              <div className="rounded-2xl border border-[#EFECE6] bg-[#FDFBF7] p-3 space-y-3">
                <label className="text-xs font-bold text-[#181512] uppercase tracking-wider block">
                  Tipe Pesanan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomerInfo({ orderType: "dine_in" })}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition ${
                      customerInfo.orderType === "dine_in"
                        ? "bg-[#FF5A2B] text-white shadow-sm shadow-orange-500/25"
                        : "bg-white text-[#78716C] border border-[#EFECE6] hover:bg-black/5"
                    }`}
                  >
                    <UtensilsCrossed className="h-4 w-4" />
                    <span>Makan di Tempat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomerInfo({ orderType: "takeaway" })}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition ${
                      customerInfo.orderType === "takeaway"
                        ? "bg-[#FF5A2B] text-white shadow-sm shadow-orange-500/25"
                        : "bg-white text-[#78716C] border border-[#EFECE6] hover:bg-black/5"
                    }`}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>Bawa Pulang</span>
                  </button>
                </div>

                {/* Dine-in Table Input */}
                {customerInfo.orderType === "dine_in" && (
                  <div className="pt-1">
                    <label className="text-[11px] font-semibold text-[#78716C] block mb-1">
                      Nomor Meja Anda <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 04 / Bar-02"
                      value={customerInfo.tableNumber || ""}
                      onChange={(e) => setCustomerInfo({ tableNumber: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-[#EFECE6] bg-white text-xs font-bold text-[#181512] focus:border-[#FF5A2B] focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Customer Info Form */}
              <div className="rounded-2xl border border-[#EFECE6] bg-[#FDFBF7] p-3 space-y-3">
                <label className="text-xs font-bold text-[#181512] uppercase tracking-wider block">
                  Informasi Pemesan
                </label>
                <div>
                  <label className="text-[11px] font-semibold text-[#78716C] block mb-1">
                    Nama Pemesan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Masukkan nama lengkap / panggilan"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ name: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-[#EFECE6] bg-white text-xs font-medium text-[#181512] focus:border-[#FF5A2B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#78716C] block mb-1">
                    No. WhatsApp (Opsional untuk struk)
                  </label>
                  <input
                    type="tel"
                    placeholder="0812xxxxxxxx"
                    value={customerInfo.phone || ""}
                    onChange={(e) => setCustomerInfo({ phone: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-[#EFECE6] bg-white text-xs font-medium text-[#181512] focus:border-[#FF5A2B] focus:outline-none"
                  />
                </div>
              </div>

              {/* Cart Item List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#181512] uppercase tracking-wider">
                    Rincian Pesanan
                  </span>
                  <button
                    onClick={clearCart}
                    className="text-[11px] font-semibold text-red-600 hover:underline"
                  >
                    Kosongkan
                  </button>
                </div>

                <div className="divide-y divide-[#EFECE6] border border-[#EFECE6] rounded-2xl bg-white overflow-hidden">
                  {cart.map((item) => (
                    <div key={item.product.id} className="p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-[#181512] truncate">
                            {item.product.name}
                          </h4>
                          <p className="text-[11px] font-semibold text-[#FF5A2B] mt-0.5">
                            {formatRupiah(item.product.price)}
                          </p>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-1 bg-[#FDFBF7] border border-[#EFECE6] rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="flex h-6 w-6 items-center justify-center rounded text-[#78716C] hover:bg-black/5"
                          >
                            {item.quantity === 1 ? (
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            ) : (
                              <Minus className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-[#181512]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock}
                            className="flex h-6 w-6 items-center justify-center rounded text-[#78716C] hover:bg-black/5 disabled:opacity-30"
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
                              className="w-full text-[11px] h-7 px-2 rounded-lg border border-[#FF5A2B] bg-[#FFF2ED]/30 focus:outline-none"
                              autoFocus
                              onBlur={() => setActiveNoteItem(null)}
                              onKeyDown={(e) => e.key === "Enter" && setActiveNoteItem(null)}
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveNoteItem(item.product.id)}
                            className="flex items-center gap-1 text-[11px] text-[#78716C] hover:text-[#FF5A2B] transition"
                          >
                            <FileText className="h-3 w-3" />
                            <span>
                              {item.notes ? (
                                <span className="font-medium text-[#181512] italic">
                                  "{item.notes}"
                                </span>
                              ) : (
                                "+ Tambah Catatan Menu"
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
          <div className="border-t border-[#EFECE6] bg-[#FDFBF7] p-5 space-y-3">
            {validationError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-2.5 text-xs text-red-600 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[#78716C]">
                <span>Subtotal ({totalItems} item)</span>
                <span className="font-semibold text-[#181512]">{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#78716C]">
                <span>Pajak &amp; Layanan</span>
                <span className="font-semibold text-emerald-600">Gratis (Termasuk)</span>
              </div>
              <div className="border-t border-[#EFECE6] pt-2 flex justify-between text-sm font-black text-[#181512]">
                <span>Total Pembayaran</span>
                <span className="text-base text-[#FF5A2B]">{formatRupiah(subtotal)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleProceedToPayment}
              className="press-tactile flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5A2B] py-3.5 px-4 text-sm font-bold text-white shadow-md shadow-orange-500/20 hover:bg-[#E5481B] active:scale-[0.98] transition"
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
