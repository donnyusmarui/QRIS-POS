import { useState } from "react"
import { Printer, CheckCircle, X, Bluetooth, Loader2 } from "lucide-react"
import type { CartItem } from "@/types"
import { printReceiptViaBluetooth, isBluetoothSupported } from "@/lib/bluetooth-printer"

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

  const [isPrintingBt, setIsPrintingBt] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

  const change = Math.max(0, cashGiven - totalAmount)
  const dateStr = new Date().toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  })

  function handleBrowserPrint() {
    window.print()
  }

  async function handleBluetoothPrint() {
    setIsPrintingBt(true)
    setStatusMessage(null)
    try {
      const res = await printReceiptViaBluetooth({
        storeName: "QRIS-POS SHOP",
        address: "Jl. Jenderal Sudirman No. 123",
        transactionId,
        dateStr,
        items: items.map((i) => ({
          name: i.productName,
          qty: i.quantity,
          price: i.price,
        })),
        totalAmount,
        paymentMethod,
        cashGiven,
        change,
      })

      setStatusMessage(res.message)
      if (!res.success && !isBluetoothSupported()) {
        setTimeout(() => {
          window.print()
        }, 800)
      }
    } catch (err: any) {
      setStatusMessage(err.message || "Gagal mencetak thermal. Beralih ke browser print...")
      setTimeout(() => {
        window.print()
      }, 1000)
    } finally {
      setIsPrintingBt(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-50 w-full max-w-sm rounded-2xl border border-border/80 bg-card p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1.5 hover:bg-muted print:hidden press-tactile"
          title="Tutup"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Printable Area */}
        <div id="printable-receipt" className="space-y-4 font-mono text-xs">
          <div className="text-center">
            <CheckCircle className="mx-auto h-8 w-8 text-emerald-600 print:hidden" />
            <h2 className="mt-2 text-base font-bold uppercase tracking-wider">QRIS-POS SHOP</h2>
            <p className="text-muted-foreground">Jl. Jenderal Sudirman No. 123</p>
            <p className="text-muted-foreground font-numeric">{dateStr}</p>
            <p className="text-[10px] text-muted-foreground font-mono">ID: #{transactionId?.slice(0, 8)}</p>
          </div>

          <div className="border-t border-dashed border-border/80 my-2" />

          {/* Items */}
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.productId} className="flex justify-between items-start">
                <div className="pr-2">
                  <p className="font-semibold text-foreground">{item.productName}</p>
                  <p className="text-muted-foreground font-numeric text-[11px]">
                    {item.quantity} × {formatRupiah(item.price)}
                  </p>
                </div>
                <p className="font-semibold font-numeric text-right">{formatRupiah(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-border/80 my-2" />

          {/* Summary */}
          <div className="space-y-1 font-numeric">
            <div className="flex justify-between font-bold text-sm">
              <span>TOTAL</span>
              <span className="text-primary">{formatRupiah(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Metode Bayar</span>
              <span className="uppercase font-semibold text-foreground">{paymentMethod}</span>
            </div>
            {paymentMethod === "cash" && cashGiven > 0 && (
              <>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tunai Diterima</span>
                  <span>{formatRupiah(cashGiven)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground font-semibold">
                  <span>Kembalian</span>
                  <span className="text-emerald-600">{formatRupiah(change)}</span>
                </div>
              </>
            )}
          </div>

          <div className="border-t border-dashed border-border/80 my-2" />

          <p className="text-center text-[10px] text-muted-foreground">
            Terima kasih atas kunjungan Anda!
          </p>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className="mt-3 rounded-lg bg-muted/60 p-2 text-center text-xs text-foreground print:hidden">
            {statusMessage}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex flex-col gap-2 print:hidden">
          <div className="flex gap-2">
            <button
              onClick={handleBluetoothPrint}
              disabled={isPrintingBt}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 py-2.5 text-xs sm:text-sm font-semibold text-white press-tactile hover:bg-emerald-800 disabled:opacity-50 shadow-sm"
              title="Cetak langsung ke printer thermal Bluetooth 58mm tanpa dialog browser"
            >
              {isPrintingBt ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bluetooth className="h-4 w-4" />
              )}
              {isPrintingBt ? "Menghubungkan..." : "Cetak Thermal BT (58mm)"}
            </button>

            <button
              onClick={handleBrowserPrint}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-input bg-background px-3 py-2.5 text-xs sm:text-sm font-semibold text-foreground press-tactile hover:bg-muted shadow-xs"
              title="Cetak lewat dialog printer standar browser"
            >
              <Printer className="h-4 w-4" />
              Browser
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full rounded-xl border border-input py-2 text-xs font-semibold text-muted-foreground hover:bg-muted press-tactile"
          >
            Selesai & Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
