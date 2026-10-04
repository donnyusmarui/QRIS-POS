import { CheckCircle2, Printer, RotateCcw, UtensilsCrossed, ShoppingBag } from "lucide-react"
import type { CartItem, CustomerInfo, PaymentChannel } from "@/stores/customer-cart-store"

interface CustomerReceiptModalProps {
  open: boolean
  transactionId: string | null
  items: CartItem[]
  totalAmount: number
  customerInfo: CustomerInfo
  paymentMethod: PaymentChannel
  onCloseAndReset: () => void
}

export function CustomerReceiptModal({
  open,
  transactionId,
  items,
  totalAmount,
  customerInfo,
  paymentMethod,
  onCloseAndReset,
}: CustomerReceiptModalProps) {
  if (!open) return null

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n)

  const queueNumber = transactionId
    ? `#Q-${parseInt(transactionId.replace(/\D/g, "").slice(-3) || "42", 10)}`
    : "#Q-01"

  const now = new Date()
  const dateStr = now.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  const timeStr = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })

  function handlePrint() {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:bg-white">
      <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 animate-in slide-in-from-bottom sm:zoom-in-95 duration-250 print:shadow-none print:border-none print:p-2">
        {/* Mobile Drag Indicator Bar */}
        <div className="mx-auto h-1.5 w-12 rounded-full bg-stone-300 sm:hidden shrink-0 print:hidden" />

        {/* Success Icon Animation */}
        <div className="text-center space-y-1.5">
          <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <CheckCircle2 className="h-8 w-8 sm:h-9 sm:w-9 text-emerald-600 animate-in zoom-in-50 duration-300" />
          </div>
          <h3 className="text-lg sm:text-xl font-black text-stone-900">Pembayaran Berhasil!</h3>
          <p className="text-xs text-stone-500">
            Pesanan herbal Anda telah dikonfirmasi dan sedang dipersiapkan.
          </p>
        </div>

        {/* Queue Card */}
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            Nomor Antrean Pesanan
          </span>
          <p className="text-2xl sm:text-3xl font-black text-stone-900 mt-0.5 font-mono tracking-wider tabular-nums">
            {queueNumber}
          </p>
          <div className="mt-1.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-800">
            {customerInfo.orderType === "dine_in" ? (
              <>
                <UtensilsCrossed className="h-3.5 w-3.5 text-emerald-700" />
                <span>Ambil di Kasir (Meja: {customerInfo.tableNumber || "-"})</span>
              </>
            ) : (
              <>
                <ShoppingBag className="h-3.5 w-3.5 text-emerald-700" />
                <span>Bawa Pulang / Kirim</span>
              </>
            )}
          </div>
        </div>

        {/* Receipt Details Box */}
        <div className="rounded-2xl border border-stone-200/80 bg-[#FDFBF7] p-3.5 sm:p-4 space-y-2.5 text-xs">
          <div className="flex justify-between border-b border-stone-200/80 pb-2 text-stone-500">
            <span>Atas Nama</span>
            <span className="font-bold text-stone-900">{customerInfo.name}</span>
          </div>
          <div className="flex justify-between border-b border-stone-200/80 pb-2 text-stone-500">
            <span>Waktu Transaksi</span>
            <span className="font-medium text-stone-900">{dateStr}, {timeStr}</span>
          </div>
          <div className="flex justify-between border-b border-stone-200/80 pb-2 text-stone-500">
            <span>Metode Bayar</span>
            <span className="font-bold text-emerald-800 uppercase font-mono">
              {paymentMethod === "qris" ? "QRIS Dinamis" : paymentMethod === "gopay" ? "GoPay (Gojek)" : "Transfer Bank"}
            </span>
          </div>

          {/* Itemized List */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
              Rincian Resep Herbal:
            </span>
            {items.map((item) => (
              <div key={item.product.id} className="flex justify-between items-center text-xs">
                <span className="truncate pr-2">
                  <span className="font-bold tabular-nums font-mono">{item.quantity}x</span> {item.product.name}
                  {item.notes && <span className="block text-[10px] text-stone-400 italic">Catatan: {item.notes}</span>}
                </span>
                <span className="font-bold text-stone-900 shrink-0 tabular-nums font-mono">
                  {formatRupiah(item.product.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Total Line */}
          <div className="border-t border-stone-200/80 pt-2 flex justify-between font-black text-sm text-stone-900">
            <span>Total Lunas</span>
            <span className="text-emerald-800 tabular-nums font-mono font-bold">{formatRupiah(totalAmount)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="flex w-full min-h-[44px] h-11 items-center justify-center gap-2 rounded-xl border border-stone-200/80 bg-white py-2.5 px-4 text-xs font-bold text-stone-700 hover:bg-stone-50 transition"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak / Simpan Struk Digital</span>
          </button>

          <button
            type="button"
            onClick={onCloseAndReset}
            className="press-tactile flex w-full min-h-[48px] h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 px-4 text-xs font-bold text-white shadow-sm shadow-emerald-700/20 active:scale-[0.98] transition"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Pesan Herbal Lainnya</span>
          </button>
        </div>
      </div>
    </div>
  )
}
