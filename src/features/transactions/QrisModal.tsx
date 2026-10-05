import { useEffect, useState, useRef } from "react"
import QRCode from "qrcode"
import { CheckCircle2, Loader2, X, RefreshCw, Smartphone } from "lucide-react"

interface QrisModalProps {
  open: boolean
  totalAmount: number
  qrisRefId: string | null
  qrString?: string | null
  transactionId: string | null
  onSuccess: () => void
  onClose: () => void
}

export function QrisModal({
  open,
  totalAmount,
  qrisRefId,
  qrString,
  transactionId,
  onSuccess,
  onClose,
}: QrisModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const pollingRef = useRef<any>(null)

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

  // 1. Generate QR Code Resmi dari Payload Midtrans
  useEffect(() => {
    if (!open) {
      if (pollingRef.current) clearInterval(pollingRef.current)
      return
    }

    const payload =
      qrString ||
      `00020101021226610016ID.CO.QRIS.WWW01189360091800000000000215${qrisRefId || Date.now()}520458125303360540${totalAmount}5802ID5913QRIS-POS SHOP6007JAKARTA6304`

    QRCode.toDataURL(payload, { width: 300, margin: 2 }, (err, url) => {
      if (!err && url) {
        setQrDataUrl(url)
      }
    })

    setIsSuccess(false)

    // 2. Real-time Background Polling Status Pembayaran (Setiap 2.5 Detik)
    if (transactionId) {
      setIsPolling(true)
      pollingRef.current = setInterval(async () => {
        if (typeof document !== "undefined" && document.visibilityState !== "visible") return
        try {
          const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token") || ""
          const res = await fetch(`/.netlify/functions/transactions-list?page=1&pageSize=5`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          const json = await res.json()
          if (json.success && Array.isArray(json.data)) {
            const currentTrx = json.data.find((t: any) => t.id === transactionId)
            if (currentTrx && currentTrx.status === "paid") {
              clearInterval(pollingRef.current)
              setIsPolling(false)
              setIsSuccess(true)
              setTimeout(() => {
                onSuccess()
              }, 1200)
            }
          }
        } catch {
          // ignore transient poll error
        }
      }, 2500)
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      setIsPolling(false)
    }
  }, [open, qrisRefId, qrString, totalAmount, transactionId, onSuccess])

  // Konfirmasi Pelunasan Manual Kasir (Jika pembeli sudah bayar tapi sinyal webhook tertunda)
  async function handleConfirmPaid() {
    if (!transactionId) return
    setIsProcessing(true)
    try {
      const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token") || ""
      const res = await fetch("/.netlify/functions/transactions-pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transactionId,
          paymentMethod: "qris",
          qrisRefId: qrisRefId || transactionId,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        if (pollingRef.current) clearInterval(pollingRef.current)
        setIsSuccess(true)
        setTimeout(() => {
          onSuccess()
        }, 1200)
      } else {
        alert(json.error || "Gagal mengonfirmasi status pembayaran")
      }
    } catch {
      alert("Terjadi kesalahan jaringan saat verifikasi status QRIS")
    } finally {
      setIsProcessing(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative z-50 w-full max-w-sm rounded-2xl border border-border/80 bg-card p-6 shadow-2xl text-center">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1.5 hover:bg-muted press-tactile cursor-pointer"
          title="Tutup (Esc)"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-3 py-1 text-[11px] font-bold text-emerald-800 mb-2">
          <Smartphone className="h-3.5 w-3.5" />
          <span>Midtrans Dynamic QRIS</span>
        </div>

        <h2 className="text-lg font-bold tracking-tight text-foreground">Pindai QRIS untuk Bayar</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Buka BCA Mobile, GoPay, OVO, Dana, ShopeePay atau m-Banking Anda
        </p>

        <div className="my-4 flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QRIS Code" className="h-56 w-56 object-contain rounded-md" />
          ) : (
            <div className="flex h-56 w-56 items-center justify-center text-muted-foreground text-xs gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              Menghasilkan QR...
            </div>
          )}
          <span className="mt-2 text-[10px] font-mono font-medium text-slate-700 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200/60">
            Ref: {transactionId ? transactionId.slice(0, 8).toUpperCase() : qrisRefId ?? "N/A"}
          </span>
        </div>

        <div className="mb-4">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Tagihan</p>
          <p className="text-2xl font-bold text-primary font-numeric">{formatRupiah(totalAmount)}</p>
        </div>

        {isSuccess ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-sm font-bold text-emerald-700 animate-in zoom-in-95">
            <CheckCircle2 className="h-5 w-5" />
            Pembayaran QRIS Berhasil!
          </div>
        ) : (
          <div className="space-y-2">
            {isPolling && (
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <RefreshCw className="h-3 w-3 animate-spin text-emerald-600" />
                <span>Menunggu konfirmasi pembayaran otomatis...</span>
              </div>
            )}

            <button
              onClick={handleConfirmPaid}
              disabled={isProcessing}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white press-tactile hover:bg-emerald-800 disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {isProcessing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isProcessing ? "Memverifikasi..." : "Konfirmasi Lunas Manual (Kasir)"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
