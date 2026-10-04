import { useState, useRef } from "react"
import * as XLSX from "xlsx"
import { apiFetch } from "@/lib/api"
import { serializeProductDescription } from "@/lib/product-chat-config"
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  FileCheck,
} from "lucide-react"

interface ProductBatchUploadModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ParsedProductRow {
  rowNum: number
  name: string
  sku: string
  price: number
  stock: number
  category?: string
  description?: string
  imageUrl?: string
  chatButtonText?: string
  chatCustomPrompt?: string
  isValid: boolean
  errors: string[]
}

export function ProductBatchUploadModal({
  open,
  onClose,
  onSuccess,
}: ProductBatchUploadModalProps) {
  const [rows, setRows] = useState<ParsedProductRow[]>([])
  const [fileName, setFileName] = useState("")
  const [isParsing, setIsParsing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submitResult, setSubmitResult] = useState<{
    inserted: number
    updated: number
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  // ─── 1. GENERATE & DOWNLOAD TEMPLATE EXCEL ───
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        name: "Sido Muncul Bawang Putih (Garlic)",
        sku: "HERB-KOL-001",
        price: 95000,
        stock: 45,
        category: "Kolesterol & Jantung",
        description: "[POM TR 092303861] Ekstrak bawang putih untuk membantu menurunkan kolesterol LDL dan trigliserida. 2x sehari 1 kapsul sesudah makan.",
        imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80",
        chatButtonText: "Tanya Apoteker",
        chatCustomPrompt: "Jelaskan cara minum ekstrak bawang putih agar tidak menimbulkan aroma menyengat di lambung.",
      },
      {
        name: "Uric-Herba HerbaMed",
        sku: "HERB-URI-001",
        price: 85000,
        stock: 50,
        category: "Asam Urat & Sendi",
        description: "[POM TR 153385761] Sidaguri dan tempuyung untuk membantu meredakan pegal linu dan menurunkan kadar asam urat. 3x sehari 2 kapsul.",
        imageUrl: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=80",
        chatButtonText: "Konsultasi Sendi",
        chatCustomPrompt: "Edukasi pantangan makanan tinggi purin (jeroan, emping, kangkung) saat mengonsumsi herbal ini.",
      },
      {
        name: "Glucodex HerbaMed",
        sku: "HERB-DIA-001",
        price: 85000,
        stock: 40,
        category: "Diabetes & Gula Darah",
        description: "[POM TR 153385741] Ekstrak sambiloto dan biji duwet untuk membantu menstabilkan kadar glukosa darah.",
        imageUrl: "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=500&auto=format&fit=crop&q=80",
        chatButtonText: "Konsultasi Gula Darah",
        chatCustomPrompt: "Pastikan pasien mengecek gula darah rutin dan tidak menghentikan obat resep dokter secara tiba-tiba.",
      },
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    // Auto-fit column widths
    worksheet["!cols"] = [
      { wch: 32 }, // name
      { wch: 16 }, // sku
      { wch: 12 }, // price
      { wch: 10 }, // stock
      { wch: 24 }, // category
      { wch: 50 }, // description
      { wch: 35 }, // imageUrl
      { wch: 20 }, // chatButtonText
      { wch: 45 }, // chatCustomPrompt
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Produk")
    XLSX.writeFile(workbook, "Template_Batch_Produk_QRIS_POS.xlsx")
  }

  // ─── 2. PARSE EXCEL / CSV FILE ───
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setIsParsing(true)
    setSubmitError("")
    setSubmitResult(null)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "array" })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const rawData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: "" })

      const seenSkus = new Set<string>()
      const parsed: ParsedProductRow[] = rawData.map((item, idx) => {
        const rowNum = idx + 2 // accounting for header
        const errors: string[] = []

        const name = String(item.name || item.Nama || item.NAMA || "").trim()
        const sku = String(item.sku || item.SKU || "").trim().toUpperCase()
        const price = Number(item.price || item.Harga || item.HARGA || 0)
        const stock = Number(item.stock || item.Stok || item.STOK || 0)
        const category = String(item.category || item.Kategori || "").trim()
        const description = String(item.description || item.Deskripsi || "").trim()
        const imageUrl = String(item.imageUrl || item.Gambar || "").trim()
        const chatButtonText = String(item.chatButtonText || item["Tombol Chat"] || "").trim()
        const chatCustomPrompt = String(item.chatCustomPrompt || item["Prompt Chat"] || "").trim()

        if (!name || name.length < 2) errors.push("Nama minimal 2 karakter")
        if (!sku) errors.push("SKU wajib diisi")
        if (sku && seenSkus.has(sku)) errors.push(`SKU duplikat dalam file (${sku})`)
        if (sku) seenSkus.add(sku)
        if (isNaN(price) || price <= 0) errors.push("Harga harus angka > 0")
        if (isNaN(stock) || stock < 0) errors.push("Stok minimal 0")

        return {
          rowNum,
          name,
          sku,
          price,
          stock,
          category: category || undefined,
          description: description || undefined,
          imageUrl: imageUrl || undefined,
          chatButtonText: chatButtonText || undefined,
          chatCustomPrompt: chatCustomPrompt || undefined,
          isValid: errors.length === 0,
          errors,
        }
      })

      setRows(parsed)
    } catch (err: any) {
      setSubmitError("Gagal membaca file Excel. Pastikan format valid (.xlsx atau .csv).")
    } finally {
      setIsParsing(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // ─── 3. SUBMIT VALID ROWS TO BACKEND ───
  const validRows = rows.filter((r) => r.isValid)
  const invalidRows = rows.filter((r) => !r.isValid)

  const handleExecuteImport = async () => {
    if (validRows.length === 0 || isSubmitting) return
    setIsSubmitting(true)
    setSubmitError("")

    try {
      const payloadItems = validRows.map((r) => {
        const fullDesc = serializeProductDescription(r.description || "", {
          buttonText: r.chatButtonText || "Tanya Apoteker",
          enabled: true,
          customPrompt: r.chatCustomPrompt || "",
        })

        return {
          name: r.name,
          sku: r.sku,
          price: r.price,
          stock: r.stock,
          category: r.category,
          imageUrl: r.imageUrl,
          description: fullDesc,
        }
      })

      const res = await apiFetch<{
        total: number
        insertedCount: number
        updatedCount: number
      }>("products-batch-upload", {
        method: "POST",
        body: JSON.stringify({ items: payloadItems }),
      })

      if (res.data) {
        setSubmitResult({
          inserted: res.data.insertedCount,
          updated: res.data.updatedCount,
        })
        onSuccess()
      }
    } catch (err: any) {
      setSubmitError(err.message || "Gagal mengimpor produk ke server.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-3xl border border-stone-200/80 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Import Batch Produk via Excel (.xlsx / .csv)
              </h3>
              <p className="text-xs text-stone-500">
                Unggah dan perbarui katalog produk herbal secara massal dengan aman.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-200/70 hover:text-stone-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Actions Bar: Download Template & File Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Download Template Box */}
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 flex flex-col justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Langkah 1: Format Kolom
                </span>
                <h4 className="text-sm font-bold text-stone-900 mt-0.5">
                  Unduh Template Excel Resmi
                </h4>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  Gunakan format kolom baku (`name`, `sku`, `price`, `stock`, `category`, `description`) agar data produk tervalidasi sempurna.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center justify-center gap-2 min-h-[40px] h-10 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-100/50 text-xs font-bold text-emerald-800 shadow-2xs transition active:scale-95 cursor-pointer"
              >
                <Download className="h-4 w-4 text-emerald-600" />
                <span>Unduh Template (.xlsx)</span>
              </button>
            </div>

            {/* Upload File Box */}
            <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 p-4 flex flex-col justify-between items-center text-center gap-3">
              <div>
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                  Langkah 2: Pilih File
                </span>
                <h4 className="text-sm font-bold text-stone-900 mt-0.5">
                  Pilih Spreadsheet Anda
                </h4>
                <p className="text-xs text-stone-500 mt-1">
                  Mendukung file Microsoft Excel (.xlsx) dan CSV.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsing}
                className="flex items-center justify-center gap-2 w-full min-h-[40px] h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs shadow-emerald-700/20 transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Menganalisis Spreadsheet...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Pilih File Excel</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {submitError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{submitError}</span>
            </div>
          )}

          {submitResult && (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-900 font-medium">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-bold text-sm">Impor Batch Berhasil!</p>
                <p className="text-emerald-700 mt-0.5">
                  {submitResult.inserted} produk baru ditambahkan, {submitResult.updated} produk diperbarui di database Neon PostgreSQL.
                </p>
              </div>
            </div>
          )}

          {/* Preview Section if rows exist */}
          {rows.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-2">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-stone-900">
                    Pratinjau Data: {fileName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-medium">
                    Total: <b className="font-mono">{rows.length}</b>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                    Siap Impor: <b className="font-mono">{validRows.length}</b>
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 font-bold">
                      Bermasalah: <b className="font-mono">{invalidRows.length}</b>
                    </span>
                  )}
                </div>
              </div>

              {/* Table Preview */}
              <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-stone-100 text-stone-600 uppercase text-[10px] font-bold tracking-wider z-10">
                    <tr>
                      <th className="px-3 py-2">Baris</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Nama Produk</th>
                      <th className="px-3 py-2 font-mono">SKU</th>
                      <th className="px-3 py-2 text-right">Harga</th>
                      <th className="px-3 py-2 text-right">Stok</th>
                      <th className="px-3 py-2">Kategori</th>
                      <th className="px-3 py-2">Keterangan / Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {rows.map((r) => (
                      <tr
                        key={r.rowNum}
                        className={
                          r.isValid
                            ? "hover:bg-emerald-50/40"
                            : "bg-red-50/60 hover:bg-red-50 text-red-900"
                        }
                      >
                        <td className="px-3 py-2 font-mono text-[11px] text-stone-400">
                          #{r.rowNum}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {r.isValid ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>Valid</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-red-200 px-2 py-0.5 text-[10px] font-bold text-red-800">
                              <AlertTriangle className="h-3 w-3 text-red-600" />
                              <span>Error</span>
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium text-stone-900 truncate max-w-[180px]">
                          {r.name || "—"}
                        </td>
                        <td className="px-3 py-2 font-mono text-stone-700 font-semibold">
                          {r.sku || "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">
                          {r.price > 0 ? formatRupiah(r.price) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">
                          {r.stock}
                        </td>
                        <td className="px-3 py-2 text-stone-600 truncate max-w-[140px]">
                          {r.category || "—"}
                        </td>
                        <td className="px-3 py-2 text-[11px]">
                          {r.isValid ? (
                            <span className="text-emerald-700 font-medium">Siap diimpor</span>
                          ) : (
                            <span className="text-red-700 font-bold">{r.errors.join("; ")}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-stone-200 px-6 py-4 bg-stone-50/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[40px] h-10 items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
          >
            Tutup
          </button>

          {rows.length > 0 && (
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={validRows.length === 0 || isSubmitting}
              className="flex min-h-[40px] h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-5 text-xs font-bold text-white shadow-sm shadow-emerald-700/20 transition active:scale-95 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Mengimpor ke Database...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Eksekusi Impor ({validRows.length} Produk)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
