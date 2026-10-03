import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { CheckCircle2, Loader2, X } from "lucide-react"

interface QrisModalProps {
  open: boolean
  totalAmount: number
  qrisRefId: string | null
  transactionId: string | null
  onSuccess: () => void
  onClose: () => void
}

export function QrisModal({
  open,
  totalAmount,
  qrisRefId,
  transactionId,
  onSuccess,
  onClose,
}: QrisModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

  useEffect(() => {
    if (open && qrisRefId) {
      // Buat payload simulasi QRIS standard
      const payload = `00020101021226610016ID.CO.QRIS.WWW01189360091800000000000215${qrisRefId}520458125303360540${totalAmount}5802ID5913QRIS-POS SHOP6007JAKARTA6304`
      QRCode.toDataURL(payload, { width: 280, margin: 2 }, (err, url) => {
        if (!err && url) {
          setQrDataUrl(url)
        }
      })
      setIsSuccess(false)
    }
  }, [open, qrisRefId, totalAmount])

  async function handleSimulatePayment() {
    if (!transactionId) return
    setIsProcessing(true)
    try {
      const res = await fetch("/.netlify/functions/transactions-pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ transactionId }),
      })
      if (res.ok) {
        setIsSuccess(true)
        setTimeout(() => {
          onSuccess()
        }, 1200)
      } else {
        alert("Gagal memproses pembayaran QRIS")
      }
    } catch {
      alert("Error saat memproses pembayaran QRIS")
    } finally {
      setIsProcessing(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-50 w-full max-w-sm rounded-2xl border border-border/80 bg-card p-6 shadow-2xl text-center">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1.5 hover:bg-muted press-tactile"
          title="Tutup"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-bold tracking-tight text-balance">Pembayaran QRIS</h2>
        <p className="mt-1 text-xs text-muted-foreground text-pretty">Scan QR di bawah ini menggunakan aplikasi e-wallet / mobile banking</p>

        <div className="my-4 flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QRIS Code" className="h-56 w-56 object-contain rounded-md" />
          ) : (
            <div className="flex h-56 w-56 items-center justify-center text-muted-foreground text-xs">
              Membuat QR...
            </div>
          )}
          <span className="mt-2 text-xs font-mono font-medium text-slate-700 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200/60">
            Ref: {qrisRefId ?? "N/A"}
          </span>
        </div>

        <div className="mb-4">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Tagihan</p>
          <p className="text-2xl font-bold text-primary font-numeric">{formatRupiah(totalAmount)}</p>
        </div>

        {isSuccess ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-green-500/10 p-3 text-sm font-semibold text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            Pembayaran Berhasil!
          </div>
        ) : (
          <button
            onClick={handleSimulatePayment}
            disabled={isProcessing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white press-tactile hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
          >
            {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
            {isProcessing ? "Memverifikasi..." : "Simulasi Bayar QRIS (Sukses)"}
          </button>
        )}
      </div>
    </div>
  )
}
