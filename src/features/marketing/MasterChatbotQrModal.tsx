import { useState, useEffect } from "react"
import QRCode from "qrcode"
import {
  X,
  Download,
  Printer,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Bot,
  ExternalLink,
  Store,
} from "lucide-react"
import { useStoreProfileStore } from "@/lib/store-profile"

interface MasterChatbotQrModalProps {
  open: boolean
  onClose: () => void
}

export function MasterChatbotQrModal({ open, onClose }: MasterChatbotQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { storeName, terminology } = useStoreProfileStore()
  const [tableNumber, setTableNumber] = useState("")
  const [customNote, setCustomNote] = useState(
    terminology.aiButtonText ? `${terminology.aiButtonText} & Rekomendasi Katalog` : "Konsultasi & Rekomendasi Cerdas AI"
  )

  const baseOrigin = typeof window !== "undefined" ? window.location.origin : "https://qris-herbal-pos-id.netlify.app"
  
  const targetUrl = `${baseOrigin}/?openChat=true&utm_source=offline&utm_medium=cashier_desk&utm_campaign=meja_kasir_master${
    tableNumber ? `&table=${encodeURIComponent(tableNumber)}` : ""
  }`

  const generateQr = (showPulse = false) => {
    if (showPulse) setIsRefreshing(true)
    QRCode.toDataURL(
      targetUrl,
      {
        width: 400,
        margin: 2,
        color: {
          dark: "#064e3b", // Emerald 900
          light: "#ffffff",
        },
      },
      (err, url) => {
        if (!err && url) {
          setQrDataUrl(url)
        }
        if (showPulse) {
          setTimeout(() => setIsRefreshing(false), 300)
        }
      }
    )
  }

  useEffect(() => {
    if (open) {
      generateQr()
    }
  }, [open, targetUrl])

  if (!open) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!qrDataUrl) return
    const a = document.createElement("a")
    a.href = qrDataUrl
    a.download = `QR_Master_Chatbot_MejaKasir.png`
    a.click()
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-lg rounded-3xl border border-stone-200/80 bg-white p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 print:border-none print:shadow-none print:p-0 print:max-w-none">
        {/* Header (Hidden on print) */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                QR Meja Kasir / Chatbot Master
              </h3>
              <p className="text-[11px] text-stone-500">
                Level 1: Display akrilik meja kasir, etalase, atau brosur toko fisik
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Input Opsional Nomor Meja / Catatan (Hidden on print) */}
        <div className="grid grid-cols-2 gap-2 text-xs print:hidden">
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">
              Nomor Meja / Stand (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Meja-01"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full rounded-xl border border-stone-200 px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">
              Teks Ajakan Standee
            </label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full rounded-xl border border-stone-200 px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* ── Standee Acrylic Card Container (Printable Area) ── */}
        <div className="text-center space-y-3.5 rounded-3xl border-2 border-emerald-500/20 bg-linear-to-b from-emerald-50/60 via-white to-stone-50/80 p-6 print:border-2 print:border-stone-800 print:bg-white print:p-8 print:w-[148mm] print:mx-auto">
          {/* Brand & Badge */}
          <div className="flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 px-3 py-1 text-[11px] font-bold text-white shadow-xs">
              <Store className="h-3.5 w-3.5" />
              <span>{(storeName || "KATALOG TOKO RESMI").toUpperCase()}</span>
            </span>
          </div>

          <div>
            <h4 className="text-lg font-bold text-stone-900 tracking-tight uppercase">
              {terminology.aiPersonaTitle} Master
            </h4>
            <p className="text-xs font-semibold text-emerald-700 mt-0.5">
              {customNote}
            </p>
          </div>

          {/* QR Code Container */}
          <div className="relative mx-auto flex h-56 w-56 items-center justify-center rounded-2xl border-4 border-emerald-700 bg-white p-3 shadow-md print:shadow-none">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code Master Chatbot"
                className={`h-full w-full object-contain transition-opacity duration-200 ${
                  isRefreshing ? "opacity-30" : "opacity-100"
                }`}
              />
            ) : (
              <div className="text-xs text-stone-400">Membuat QR...</div>
            )}

            {/* Center Logo / Badge on QR */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-10 w-10 rounded-xl bg-emerald-700 p-1.5 shadow-md flex items-center justify-center text-white border-2 border-white">
                <Bot className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-[11px] font-bold text-stone-700 border border-stone-200">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>Arahkan Kamera HP Anda ke QR di atas</span>
            </div>
            <p className="text-[10px] text-stone-500 font-medium">
              Otomatis terhubung dengan {terminology.aiPersonaTitle} &amp; {terminology.catalogHeading}
            </p>
            {tableNumber && (
              <p className="text-xs font-mono font-bold text-emerald-800 mt-1">
                Lokasi: {tableNumber}
              </p>
            )}
          </div>

          {/* Link display (Hidden on print) */}
          <div className="rounded-xl bg-white/90 p-2 text-[10px] text-stone-500 border border-stone-200/80 flex items-center justify-center gap-1.5 print:hidden">
            <ExternalLink className="h-3 w-3 text-emerald-600 shrink-0" />
            <span className="truncate max-w-[340px] font-mono">{targetUrl}</span>
          </div>
        </div>

        {/* Action Buttons (Hidden on print) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-100 print:hidden">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => generateQr(true)}
              disabled={isRefreshing}
              className="flex min-h-[38px] h-9 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-700 hover:bg-stone-50 transition active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
              title="Generate Ulang QR Code"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-stone-600 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Generate Ulang</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex min-h-[38px] h-9 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-700 hover:bg-stone-50 transition active:scale-95 cursor-pointer shadow-xs"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Tersalin!" : "Salin Link"}</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!qrDataUrl}
              className="flex min-h-[38px] h-9 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-700 hover:bg-stone-50 transition active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5 text-emerald-700" />
              <span>Unduh PNG</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex min-h-[38px] h-9 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 text-xs font-bold text-white shadow-xs shadow-emerald-700/20 transition active:scale-95 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Cetak Standee</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
