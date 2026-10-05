import { useState, useEffect } from "react"
import QRCode from "qrcode"
import { useCustomerCartStore } from "@/stores/customer-cart-store"
import {
  X,
  QrCode,
  Building2,
  Wallet,
  Copy,
  Check,
  Clock,
  Loader2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
} from "lucide-react"

interface CustomerPaymentModalProps {
  open: boolean
  transactionId: string | null
  qrisRefId: string | null
  totalAmount: number
  onPaymentSuccess: () => void
  onClose: () => void
  onCancelOrder?: () => void
}

export function CustomerPaymentModal({
  open,
  transactionId,
  qrisRefId,
  totalAmount,
  onPaymentSuccess,
  onClose,
  onCancelOrder,
}: CustomerPaymentModalProps) {
  const { selectedPayment, setSelectedPayment, selectedBank, setSelectedBank } =
    useCustomerCartStore()

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("")
  const [timeLeft, setTimeLeft] = useState(900) // 15 minutes
  const [isVerifying, setIsVerifying] = useState(false)
  const [copiedVa, setCopiedVa] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n)

  // Countdown timer
  useEffect(() => {
    if (!open) return
    setTimeLeft(900)
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [open])

  // Generate QR Code for QRIS or GoPay
  useEffect(() => {
    if (open && (selectedPayment === "qris" || selectedPayment === "gopay")) {
      const codeRef = qrisRefId || `QRIS-${Date.now()}`
      const payload = `00020101021226610016ID.CO.QRIS.WWW01189360091800000000000215${codeRef}520458125303360540${totalAmount}5802ID5913QRIS-POS SHOP6007JAKARTA6304`
      QRCode.toDataURL(payload, { width: 280, margin: 2 }, (err, url) => {
        if (!err && url) {
          setQrCodeDataUrl(url)
        }
      })
    }
  }, [open, selectedPayment, qrisRefId, totalAmount])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Virtual Account number mapping per bank
  const getVaNumber = (bank: string) => {
    const prefix = bank === "BCA" ? "8801" : bank === "Mandiri" ? "8902" : bank === "BRI" ? "8873" : "8814"
    const suffix = transactionId ? transactionId.replace(/-/g, "").slice(0, 10).toUpperCase() : "9283741829"
    return `${prefix} ${suffix.slice(0, 4)} ${suffix.slice(4, 8)}`
  }

  function handleCopyVa() {
    const va = getVaNumber(selectedBank).replace(/\s/g, "")
    navigator.clipboard.writeText(va)
    setCopiedVa(true)
    setTimeout(() => setCopiedVa(false), 2000)
  }

  async function handleVerifyPayment() {
    if (!transactionId) return
    setIsVerifying(true)
    setErrorMessage("")

    try {
      const res = await fetch("/.netlify/functions/transactions-pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionId,
          paymentMethod: selectedPayment,
          qrisRefId,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        onPaymentSuccess()
      } else {
        setErrorMessage(json.error || "Pembayaran belum terdeteksi. Silakan coba lagi.")
      }
    } catch {
      setErrorMessage("Gagal memverifikasi status pembayaran. Periksa koneksi internet Anda.")
    } finally {
      setIsVerifying(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-stone-200/80 bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-250">
        {/* Mobile Drag Indicator Bar */}
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-stone-300 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200/80 px-5 sm:px-6 py-3.5 bg-[#FBF9F5]">
          <div>
            <h3 className="text-base font-black text-stone-900">Pilih Metode Pembayaran</h3>
            <p className="text-xs text-stone-500">
              Total Tagihan: <span className="font-bold text-emerald-800 tabular-nums font-mono">{formatRupiah(totalAmount)}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
            aria-label="Tutup Pilihan Pembayaran"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Method Selector Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-[#FDFBF7] p-2 border-b border-[#EFECE6]">
          {/* Tab 1: QRIS */}
          <button
            type="button"
            onClick={() => setSelectedPayment("qris")}
            className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-bold transition ${
              selectedPayment === "qris"
                ? "bg-white text-[#FF5A2B] shadow-sm border border-orange-200/80"
                : "text-[#78716C] hover:text-[#181512]"
            }`}
          >
            <QrCode className="h-5 w-5" />
            <span>QRIS Dinamis</span>
          </button>

          {/* Tab 2: Transfer Bank */}
          <button
            type="button"
            onClick={() => setSelectedPayment("transfer")}
            className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-bold transition ${
              selectedPayment === "transfer"
                ? "bg-white text-[#0066AE] shadow-sm border border-blue-200/80"
                : "text-[#78716C] hover:text-[#181512]"
            }`}
          >
            <Building2 className="h-5 w-5" />
            <span>Transfer Bank</span>
          </button>

          {/* Tab 3: GoPay / Gojek */}
          <button
            type="button"
            onClick={() => setSelectedPayment("gopay")}
            className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-bold transition ${
              selectedPayment === "gopay"
                ? "bg-white text-[#00AA13] shadow-sm border border-green-200/80"
                : "text-[#78716C] hover:text-[#181512]"
            }`}
          >
            <Wallet className="h-5 w-5" />
            <span>GoPay (Gojek)</span>
          </button>
        </div>

        {/* Body Content based on channel */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
          {/* ── CHANNEL 1: QRIS ── */}
          {selectedPayment === "qris" && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/80 py-1.5 px-3 rounded-full mx-auto w-fit">
                <Clock className="h-3.5 w-3.5" />
                <span>Kedaluwarsa dalam <span className="tabular-nums">{formatTime(timeLeft)}</span></span>
              </div>

              {/* QR Image Box */}
              <div className="mx-auto flex w-64 h-64 items-center justify-center rounded-2xl border-2 border-dashed border-[#FF5A2B]/40 bg-white p-2 shadow-inner">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="QRIS QR Code"
                    className="h-full w-full object-contain rounded-xl"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-xs text-[#78716C]">
                    <Loader2 className="h-8 w-8 animate-spin text-[#FF5A2B] mb-2" />
                    <span>Membuat QRIS Dinamis...</span>
                  </div>
                )}
              </div>

              <div className="text-xs text-[#78716C] space-y-1">
                <p className="font-bold text-[#181512]">Pindai dengan Aplikasi Pembayaran Apapun</p>
                <p className="text-[11px]">BCA, Livin' Mandiri, BRImo, GoPay, OVO, Dana, ShopeePay, LinkAja</p>
                {qrisRefId && (
                  <p className="text-[10px] text-[#A8A29E] font-mono mt-1">Ref: {qrisRefId}</p>
                )}
              </div>
            </div>
          )}

          {/* ── CHANNEL 2: TRANSFER BANK ── */}
          {selectedPayment === "transfer" && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/80 py-1.5 px-3 rounded-full mx-auto w-fit">
                <Clock className="h-3.5 w-3.5" />
                <span>Batas Waktu: {formatTime(timeLeft)}</span>
              </div>

              {/* Bank Selector Pills */}
              <div>
                <label className="text-xs font-bold text-[#181512] block mb-2">
                  Pilih Bank Tujuan:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["BCA", "Mandiri", "BRI", "BNI"] as const).map((bank) => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => setSelectedBank(bank)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                        selectedBank === bank
                          ? "border-[#0066AE] bg-blue-50/50 text-[#0066AE] shadow-xs font-black"
                          : "border-[#EFECE6] bg-white text-[#78716C] hover:bg-black/5"
                      }`}
                    >
                      {bank}
                    </button>
                  ))}
                </div>
              </div>

              {/* Virtual Account Box */}
              <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#78716C]">
                  <span>Nomor Virtual Account ({selectedBank}):</span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                    Otomatis Dicek
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 bg-white rounded-xl border border-blue-200 p-3">
                  <span className="font-mono text-base font-black tracking-wider text-[#181512]">
                    {getVaNumber(selectedBank)}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyVa}
                    className="flex items-center gap-1 py-1.5 px-3 rounded-lg bg-blue-50 text-[#0066AE] text-xs font-bold hover:bg-blue-100 transition"
                  >
                    {copiedVa ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedVa ? "Tersalin!" : "Salin"}</span>
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="text-xs text-[#78716C] space-y-1.5 bg-[#FDFBF7] p-3 rounded-xl border border-[#EFECE6]">
                <p className="font-bold text-[#181512]">Petunjuk Transfer:</p>
                <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                  <li>Buka Mobile Banking atau ATM {selectedBank}.</li>
                  <li>Pilih menu <b>Transfer Virtual Account</b>.</li>
                  <li>Masukkan nomor VA di atas dan pastikan nominal sesuai tagihan.</li>
                  <li>Setelah transfer berhasil, klik tombol verifikasi di bawah.</li>
                </ol>
              </div>
            </div>
          )}

          {/* ── CHANNEL 3: GOPAY / GOJEK ── */}
          {selectedPayment === "gopay" && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 py-1.5 px-3 rounded-full mx-auto w-fit">
                <ShieldCheck className="h-3.5 w-3.5 text-[#00AA13]" />
                <span>Otentikasi Instan Gojek / GoPay</span>
              </div>

              {/* QR Image Box */}
              <div className="mx-auto flex w-60 h-60 items-center justify-center rounded-2xl border-2 border-[#00AA13]/40 bg-white p-2 shadow-inner">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="GoPay QR Code"
                    className="h-full w-full object-contain rounded-xl"
                  />
                ) : (
                  <Loader2 className="h-8 w-8 animate-spin text-[#00AA13]" />
                )}
              </div>

              {/* Mobile Deeplink CTA */}
              <div>
                <a
                  href={`gojek://payment?ref=${qrisRefId || ""}&amount=${totalAmount}`}
                  target="_blank"
                  rel="noreferrer"
                  className="press-tactile inline-flex items-center justify-center gap-2 rounded-xl bg-[#00AA13] px-5 py-3 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-[#009210] transition w-full"
                >
                  <span>Buka di Aplikasi Gojek (Mobile)</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
                <p className="text-[11px] text-[#78716C] mt-2">
                  Atau scan QR di atas menggunakan pemindai GoPay / Gojek.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600 font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-stone-200/80 bg-[#FDFBF7] p-5 space-y-2.5">
          <button
            type="button"
            onClick={handleVerifyPayment}
            disabled={isVerifying}
            className="press-tactile flex w-full min-h-[48px] h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3.5 px-4 text-sm font-bold text-white shadow-sm shadow-emerald-700/20 active:scale-[0.98] transition disabled:opacity-50 cursor-pointer"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Memverifikasi Status Pelunasan...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>Cek Status / Simulasi Bayar Berhasil</span>
              </>
            )}
          </button>

          {onCancelOrder && (
            <button
              type="button"
              disabled={isVerifying}
              onClick={() => {
                if (window.confirm("Batalkan pesanan ini dan kembali ke keranjang belanja?")) {
                  onCancelOrder()
                }
              }}
              className="press-tactile flex w-full min-h-[40px] items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-stone-500 hover:text-rose-600 hover:bg-rose-50/50 rounded-xl transition cursor-pointer"
            >
              <span>Batalkan Pesanan Ini</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
