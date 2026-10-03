import { Printer, CheckCircle, X } from "lucide-react"
import type { CartItem } from "@/types"

interface ReceiptModalProps {
  open: boolean
  transactionId: string | null
  items: CartItem[]
  totalAmount: number
  paymentMethod: string
  cashGiven?: number
  onClose: () => void
}

export function ReceiptModal({
  open,
  transactionId,
  items,
  totalAmount,
  paymentMethod,
  cashGiven = 0,
  onClose,
}: ReceiptModalProps) {
  if (!open) return null

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

  const change = Math.max(0, cashGiven - totalAmount)
  const dateStr = new Date().toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  })

  function handlePrint() {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-50 w-full max-w-sm rounded-xl border bg-card p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded p-1 hover:bg-muted print:hidden"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Printable Area */}
        <div id="printable-receipt" className="space-y-4 font-mono text-xs">
          <div className="text-center">
            <CheckCircle className="mx-auto h-8 w-8 text-emerald-600 print:hidden" />
            <h2 className="mt-2 text-base font-bold uppercase">QRIS-POS SHOP</h2>
            <p className="text-muted-foreground">Jl. Jenderal Sudirman No. 123</p>
            <p className="text-muted-foreground">{dateStr}</p>
            <p className="text-[10px] text-muted-foreground">ID: #{transactionId?.slice(0, 8)}</p>
          </div>

          <div className="border-t border-dashed my-2" />

          {/* Items */}
          <div className="space-y-1.5">
            {items.map((item) => (
              <div key={item.productId} className="flex justify-between">
                <div>
                  <p className="font-semibold">{item.productName}</p>
                  <p className="text-muted-foreground">
                    {item.quantity} x {formatRupiah(item.price)}
                  </p>
                </div>
                <p className="font-semibold">{formatRupiah(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed my-2" />

          {/* Summary */}
          <div className="space-y-1">
            <div className="flex justify-between font-bold text-sm">
              <span>TOTAL</span>
              <span>{formatRupiah(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Metode Bayar</span>
              <span className="uppercase font-semibold">{paymentMethod}</span>
            </div>
            {paymentMethod === "cash" && cashGiven > 0 && (
              <>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tunai Diterima</span>
                  <span>{formatRupiah(cashGiven)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground font-semibold">
                  <span>Kembalian</span>
                  <span>{formatRupiah(change)}</span>
                </div>
              </>
            )}
          </div>

          <div className="border-t border-dashed my-2" />

          <p className="text-center text-[10px] text-muted-foreground">
            Terima kasih atas kunjungan Anda!
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Printer className="h-4 w-4" />
            Cetak Struk
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
