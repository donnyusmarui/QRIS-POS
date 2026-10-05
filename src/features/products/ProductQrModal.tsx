import { useState, useEffect } from "react"
import type { Product } from "@/types"
import QRCode from "qrcode"
import { X, Download, Printer, QrCode, ExternalLink, Sparkles, RefreshCw, Copy, Check } from "lucide-react"

interface ProductQrModalProps {
  open: boolean
  product: Product | null
  onClose: () => void
}

export function ProductQrModal({ open, product, onClose }: ProductQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copied, setCopied] = useState(false)

  const targetUrl = product
    ? `${window.location.origin}/?consultProduct=${encodeURIComponent(product.id)}&openChat=true`
    : ""

  const generateQr = (showPulse = false) => {
    if (!targetUrl) return
    if (showPulse) setIsRefreshing(true)
    QRCode.toDataURL(
      targetUrl,
      {
        width: 320,
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
    if (open && targetUrl) {
      generateQr()
    }
  }, [open, targetUrl])

  if (!open || !product) return null

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

  const handleDownload = () => {
    if (!qrDataUrl) return
    const a = document.createElement("a")
    a.href = qrDataUrl
    a.download = `QR_${product.sku}_${product.name.replace(/[^a-zA-Z0-9]/g, "_")}.png`
    a.click()
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl border border-stone-200/80 bg-white p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 print:p-0 print:border-none print:shadow-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <QrCode className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">QR Code Produk</h3>
              <p className="text-[11px] text-stone-500 font-mono">{product.sku}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Printable Card Area */}
        <div className="text-center space-y-3 rounded-2xl border border-emerald-100 bg-linear-to-b from-emerald-50/50 to-stone-50/50 p-4 print:border-stone-400 print:bg-white">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/70 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
            <Sparkles className="h-3 w-3 text-emerald-600" />
            <span>Scan untuk Konsultasi RAG</span>
          </div>

          <h4 className="text-sm font-black text-stone-900 line-clamp-2 px-1">
            {product.name}
          </h4>

          {/* QR Code Container */}
          <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-2xl border-2 border-emerald-600/30 bg-white p-2.5 shadow-xs">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code ${product.name}`}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="text-xs text-stone-400">Membuat QR...</div>
            )}
          </div>

          <div className="space-y-0.5">
            <p className="text-base font-black text-emerald-800 font-mono tabular-nums">
              {formatRupiah(product.price)}
            </p>
            <p className="text-[10px] text-stone-500 font-medium">
              Kategori: {product.category || "Herbal Terstandar"}
            </p>
          </div>

          <div className="rounded-xl bg-white/90 p-2 text-[10px] text-stone-500 border border-stone-200/60 flex items-center justify-between gap-1.5 print:hidden">
            <div className="flex items-center gap-1.5 truncate">
              <ExternalLink className="h-3 w-3 text-emerald-600 shrink-0" />
              <span className="truncate max-w-[200px] font-mono">{targetUrl}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(targetUrl)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 shrink-0 cursor-pointer flex items-center gap-1"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? "Tersalin" : "Salin"}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1 print:hidden">
          <button
            type="button"
            onClick={() => generateQr(true)}
            disabled={isRefreshing}
            className="flex w-full min-h-[38px] h-9 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-bold text-stone-700 hover:bg-stone-100 transition active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-stone-600 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Generate Ulang / Refresh QR</span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!qrDataUrl}
              className="flex min-h-[42px] h-10 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-700 hover:bg-stone-50 transition active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download className="h-4 w-4 text-emerald-700" />
              <span>Unduh PNG</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex min-h-[42px] h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs shadow-emerald-700/20 transition active:scale-95 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Cetak Label</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
