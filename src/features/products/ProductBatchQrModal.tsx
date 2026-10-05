import { useState, useEffect, useCallback } from "react"
import type { Product } from "@/types"
import QRCode from "qrcode"
import { X, Printer, QrCode, Sparkles, Loader2, RefreshCw } from "lucide-react"

interface ProductBatchQrModalProps {
  open: boolean
  products: Product[]
  onClose: () => void
}

interface ProductQrItem {
  product: Product
  qrDataUrl: string
  url: string
}

export function ProductBatchQrModal({ open, products, onClose }: ProductBatchQrModalProps) {
  const [qrItems, setQrItems] = useState<ProductQrItem[]>([])
  const [isGenerating, setIsGenerating] = useState(true)

  const generateAll = useCallback(async () => {
    if (products.length === 0) return
    setIsGenerating(true)
    const items: ProductQrItem[] = []
    for (const p of products) {
      const url = `${window.location.origin}/?consultProduct=${encodeURIComponent(p.id)}&openChat=true`
      try {
        const qrDataUrl = await QRCode.toDataURL(url, {
          width: 240,
          margin: 1.5,
          color: {
            dark: "#064e3b",
            light: "#ffffff",
          },
        })
        items.push({ product: p, qrDataUrl, url })
      } catch (err) {
        console.error("Gagal generate QR untuk:", p.sku, err)
      }
    }
    setQrItems(items)
    setIsGenerating(false)
  }, [products])

  useEffect(() => {
    if (open) {
      generateAll()
    }
  }, [open, generateAll])

  if (!open) return null

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:bg-white print:static">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-3xl border border-stone-200/80 bg-white shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-h-none print:w-full">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50/80 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Katalog Meja QR Code Batch ({products.length} Produk)
              </h3>
              <p className="text-xs text-stone-500">
                Setiap QR langsung mengarahkan pelanggan ke produk &amp; mengaktifkan Chatbot RAG.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => generateAll()}
              disabled={isGenerating}
              className="flex min-h-[40px] h-10 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-50 px-3.5 text-xs font-bold text-stone-700 shadow-xs transition active:scale-95 cursor-pointer"
              title="Generate ulang seluruh QR Code katalog"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-stone-600 ${isGenerating ? "animate-spin" : ""}`} />
              <span>Generate Ulang Semua</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={isGenerating}
              className="flex min-h-[40px] h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 text-xs font-bold text-white shadow-sm shadow-emerald-700/20 transition active:scale-95 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Cetak Katalog (A4 Grid)</span>
            </button>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-200/70 hover:text-stone-700 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Sheet / Scrollable Printable Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 print:overflow-visible print:p-0">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-stone-500">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="text-sm font-semibold">Mengenerate QR Code untuk {products.length} produk...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-4">
              {qrItems.map(({ product, qrDataUrl }) => (
                <div
                  key={product.id}
                  className="break-inside-avoid flex flex-col justify-between items-center rounded-2xl border-2 border-dashed border-stone-300 p-4 text-center bg-white shadow-2xs print:shadow-none print:border-stone-400 print:mb-4"
                >
                  <div className="w-full space-y-1">
                    <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[9px] font-bold text-emerald-800">
                      <Sparkles className="h-2.5 w-2.5 text-emerald-600" />
                      <span>Apotek Medika • RAG Consult</span>
                    </div>
                    <h4 className="text-xs font-black text-stone-900 line-clamp-2 min-h-[32px]">
                      {product.name}
                    </h4>
                    <p className="text-[10px] text-stone-400 font-mono font-medium">{product.sku}</p>
                  </div>

                  <div className="my-2 flex h-36 w-36 items-center justify-center rounded-xl border border-emerald-100 bg-white p-1.5 shadow-2xs">
                    <img
                      src={qrDataUrl}
                      alt={`QR Code ${product.name}`}
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <div className="w-full space-y-1 pt-1 border-t border-stone-100">
                    <p className="text-sm font-black text-emerald-800 font-mono tabular-nums">
                      {formatRupiah(product.price)}
                    </p>
                    <p className="text-[9px] text-stone-500 font-medium">
                      Scan untuk Konsultasi Apoteker
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
