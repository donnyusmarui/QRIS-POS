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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:bg-white">
      <div className="relative w-full max-w-md rounded-3xl border border-[#EFECE6] bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 print:shadow-none print:border-none print:p-2">
        {/* Success Icon Animation */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <CheckCircle2 className="h-9 w-9 text-emerald-600 animate-in zoom-in-50 duration-300" />
          </div>
          <h3 className="text-xl font-black text-[#181512]">Pembayaran Berhasil!</h3>
          <p className="text-xs text-[#78716C]">
            Pesanan Anda telah diterima dapur dan sedang dipersiapkan.
          </p>
        </div>

        {/* Queue Card */}
        <div className="rounded-2xl border-2 border-dashed border-orange-200 bg-[#FFF8F5] p-4 text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF5A2B]">
            Nomor Antrean Pesanan
          </span>
          <p className="text-3xl font-black text-[#181512] mt-1 font-mono tracking-wider">
            {queueNumber}
          </p>
          <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#8C5400]">
            {customerInfo.orderType === "dine_in" ? (
              <>
                <UtensilsCrossed className="h-3.5 w-3.5" />
                <span>Makan di Tempat (Meja: {customerInfo.tableNumber || "-"})</span>
              </>
            ) : (
              <>
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>Bawa Pulang (Takeaway)</span>
              </>
            )}
          </div>
        </div>

        {/* Receipt Details Box */}
        <div className="rounded-2xl border border-[#EFECE6] bg-[#FDFBF7] p-4 space-y-3 text-xs">
          <div className="flex justify-between border-b border-[#EFECE6] pb-2 text-[#78716C]">
            <span>Atas Nama</span>
            <span className="font-bold text-[#181512]">{customerInfo.name}</span>
          </div>
          <div className="flex justify-between border-b border-[#EFECE6] pb-2 text-[#78716C]">
            <span>Waktu Transaksi</span>
            <span className="font-medium text-[#181512]">{dateStr}, {timeStr}</span>
          </div>
          <div className="flex justify-between border-b border-[#EFECE6] pb-2 text-[#78716C]">
            <span>Metode Bayar</span>
            <span className="font-bold text-[#FF5A2B] uppercase">
              {paymentMethod === "qris" ? "QRIS Dinamis" : paymentMethod === "gopay" ? "GoPay (Gojek)" : "Transfer Bank"}
            </span>
          </div>

          {/* Itemized List */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-[#78716C] uppercase block mb-1">
              Rincian Menu:
            </span>
            {items.map((item) => (
              <div key={item.product.id} className="flex justify-between items-center text-xs">
                <span className="truncate pr-2">
                  <span className="font-bold tabular-nums">{item.quantity}x</span> {item.product.name}
                  {item.notes && <span className="block text-[10px] text-[#A8A29E] italic">Note: {item.notes}</span>}
                </span>
                <span className="font-bold text-[#181512] shrink-0 tabular-nums">
                  {formatRupiah(item.product.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Total Line */}
          <div className="border-t border-[#EFECE6] pt-2 flex justify-between font-black text-sm text-[#181512]">
            <span>Total Lunas</span>
            <span className="text-[#FF5A2B] tabular-nums">{formatRupiah(totalAmount)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#EFECE6] bg-white py-3 text-xs font-bold text-[#181512] hover:bg-black/5 transition"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak / Simpan Struk Digital</span>
          </button>

          <button
            type="button"
            onClick={onCloseAndReset}
            className="press-tactile flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5A2B] py-3.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:bg-[#E5481B] transition"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Pesan Menu Lainnya</span>
          </button>
        </div>
      </div>
    </div>
  )
}
