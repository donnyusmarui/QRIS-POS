import { useState, useEffect, useMemo, useCallback } from "react"
import {
  QrCode,
  Plus,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  MessageSquare,
  ShoppingCart,
  DollarSign,
  Eye,
  Copy,
  Check,
  Trash2,
  Edit,
  Bot,
  Layers,
  Download,
  AlertCircle,
  X,
} from "lucide-react"
import QRCode from "qrcode"
import {
  MarketingCampaignModal,
  type MarketingCampaignData,
  type MarketingChannel,
} from "./MarketingCampaignModal"
import { MasterChatbotQrModal } from "./MasterChatbotQrModal"
import type { Product } from "@/types"

const CHANNEL_BADGES: Record<MarketingChannel, { label: string; badgeClass: string }> = {
  tiktok: { label: "TikTok", badgeClass: "bg-black text-white" },
  instagram: {
    label: "Instagram",
    badgeClass: "bg-linear-to-r from-purple-600 via-pink-600 to-amber-500 text-white",
  },
  whatsapp: { label: "WhatsApp", badgeClass: "bg-emerald-600 text-white" },
  google: { label: "Google", badgeClass: "bg-blue-600 text-white" },
  facebook: { label: "Facebook", badgeClass: "bg-blue-700 text-white" },
  linkedin: { label: "LinkedIn", badgeClass: "bg-sky-700 text-white" },
  offline: { label: "Offline Event", badgeClass: "bg-emerald-700 text-white" },
  other: { label: "Lainnya", badgeClass: "bg-stone-700 text-white" },
}

export function MarketingAnalyticsPage() {
  const [campaigns, setCampaigns] = useState<MarketingCampaignData[]>([])
  const [summary, setSummary] = useState({
    totalCampaigns: 0,
    totalScans: 0,
    totalChats: 0,
    totalCarts: 0,
    totalCheckouts: 0,
    totalRevenue: 0,
  })
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState("")

  // Filter states
  const [selectedChannel, setSelectedChannel] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"date" | "scans" | "revenue">("date")

  // Modals state
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<MarketingCampaignData | null>(null)
  const [isMasterQrOpen, setIsMasterQrOpen] = useState(false)

  // Quick QR preview modal for a row
  const [previewCampaign, setPreviewCampaign] = useState<MarketingCampaignData | null>(null)
  const [previewQrUrl, setPreviewQrUrl] = useState("")
  const [previewCopied, setPreviewCopied] = useState(false)

  // Fetch campaigns and summary
  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true)
    setErrorMsg("")
    try {
      const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token")
      const headers: Record<string, string> = {}
      if (token) headers["Authorization"] = `Bearer ${token}`

      const params = new URLSearchParams()
      if (selectedChannel !== "all") params.set("channel", selectedChannel)
      if (searchQuery.trim()) params.set("search", searchQuery.trim())

      const res = await fetch(`/.netlify/functions/marketing-campaigns?${params.toString()}`, {
        headers,
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengambil data kampanye")
      }

      setCampaigns(data.data.campaigns || [])
      setSummary(data.data.summary || {})
    } catch (err: any) {
      console.error("Fetch marketing error:", err)
      setErrorMsg(err.message || "Gagal terhubung ke server marketing")
    } finally {
      setIsLoading(false)
    }
  }, [selectedChannel, searchQuery])

  // Fetch product list for dropdowns
  const fetchProducts = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token")
      const headers: Record<string, string> = {}
      if (token) headers["Authorization"] = `Bearer ${token}`

      const res = await fetch("/.netlify/functions/products-list?pageSize=100", { headers })
      const data = await res.json()
      if (data.success && data.data?.items) {
        setProducts(data.data.items)
      } else if (Array.isArray(data.data)) {
        setProducts(data.data)
      }
    } catch (err) {
      console.error("Fetch products error:", err)
    }
  }, [])

  useEffect(() => {
    fetchCampaigns()
    fetchProducts()
  }, [fetchCampaigns, fetchProducts])

  // Delete Campaign
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus kampanye "${name}"? Data pelacakan akan ikut terhapus.`)) return
    try {
      const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token")
      const headers: Record<string, string> = {}
      if (token) headers["Authorization"] = `Bearer ${token}`

      const res = await fetch(`/.netlify/functions/marketing-campaigns?id=${id}`, {
        method: "DELETE",
        headers,
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menghapus kampanye")
      }
      fetchCampaigns()
    } catch (err: any) {
      alert(err.message || "Gagal menghapus")
    }
  }

  // Generate QR for preview modal
  useEffect(() => {
    if (previewCampaign) {
      const baseOrigin = typeof window !== "undefined" ? window.location.origin : "https://qris-herbal-pos.netlify.app"
      const params = new URLSearchParams()
      params.set("utm_source", previewCampaign.utmSource)
      if (previewCampaign.utmMedium) params.set("utm_medium", previewCampaign.utmMedium)
      if (previewCampaign.utmCampaign) params.set("utm_campaign", previewCampaign.utmCampaign)
      if (previewCampaign.promoCode) params.set("promo_code", previewCampaign.promoCode)
      if (previewCampaign.targetType === "product" && previewCampaign.targetProductId) {
        params.set("consultProduct", previewCampaign.targetProductId)
      }
      params.set("openChat", "true")
      const url = `${baseOrigin}/?${params.toString()}`

      QRCode.toDataURL(
        url,
        {
          width: 320,
          margin: 2,
          color: {
            dark: "#064e3b",
            light: "#ffffff",
          },
        },
        (err, dataUrl) => {
          if (!err && dataUrl) setPreviewQrUrl(dataUrl)
        }
      )
    } else {
      setPreviewQrUrl("")
    }
  }, [previewCampaign])

  // Sorted list
  const sortedCampaigns = useMemo(() => {
    return [...campaigns].sort((a, b) => {
      if (sortBy === "scans") return (b.scanCount || 0) - (a.scanCount || 0)
      if (sortBy === "revenue") return (b.revenueAttributed || 0) - (a.revenueAttributed || 0)
      return 0
    })
  }, [campaigns, sortBy])

  // Format IDR
  const formatRupiah = (val: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val)

  // Overall Conversion rate
  const overallConversionRate = summary.totalScans > 0
    ? ((summary.totalCheckouts / summary.totalScans) * 100).toFixed(1)
    : "0.0"

  const chatEngagementRate = summary.totalScans > 0
    ? ((summary.totalChats / summary.totalScans) * 100).toFixed(1)
    : "0.0"

  const cartConversionRate = summary.totalScans > 0
    ? ((summary.totalCarts / summary.totalScans) * 100).toFixed(1)
    : "0.0"

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Top Header & Global Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-stone-900">
              Smart QR &amp; Marketing Tracking
            </h1>
            <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5">
              MarTech Suite
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Pelacakan konversi iklan multi-kanal (TikTok, Instagram, WhatsApp, Google, Facebook, LinkedIn) &amp; QR Meja Kasir.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Level 1 QR Button */}
          <button
            type="button"
            onClick={() => setIsMasterQrOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 px-3.5 py-2 text-xs font-bold text-stone-700 shadow-2xs transition active:scale-95 cursor-pointer"
            title="Buka QR Meja Kasir / Chatbot Master untuk display akrilik"
          >
            <Bot className="h-4 w-4 text-emerald-700" />
            <span>QR Meja Kasir / Master</span>
          </button>

          {/* Level 4 QR Button */}
          <button
            type="button"
            onClick={() => {
              setEditingCampaign(null)
              setIsCampaignModalOpen(true)
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs shadow-emerald-700/20 transition active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Buat QR Event / Iklan</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchCampaigns}
            disabled={isLoading}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 transition cursor-pointer disabled:opacity-50"
            title="Muat ulang data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg("")} className="text-rose-500 hover:text-rose-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── KPI Summary Cards (4 Funnel Stages + Revenue) ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Stage 1: Scans */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">1. Total Scan / Kunjungan</span>
            <Eye className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-stone-900 tabular-nums">
            {summary.totalScans.toLocaleString("id-ID")}
          </p>
          <p className="text-[10px] text-stone-400 font-medium">Pemindaian QR &amp; klik link iklan</p>
        </div>

        {/* Stage 2: Chat Engagement */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">2. Chatbot AI</span>
            <MessageSquare className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 tabular-nums">
            {summary.totalChats.toLocaleString("id-ID")}
          </p>
          <p className="text-[10px] text-emerald-600 font-semibold">
            {chatEngagementRate}% engagement rate
          </p>
        </div>

        {/* Stage 3: Add to Cart */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">3. Keranjang</span>
            <ShoppingCart className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 tabular-nums">
            {summary.totalCarts.toLocaleString("id-ID")}
          </p>
          <p className="text-[10px] text-amber-600 font-semibold">
            {cartConversionRate}% cart conversion
          </p>
        </div>

        {/* Stage 4: Checkout */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">4. Transaksi Lunas</span>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700 tabular-nums">
            {summary.totalCheckouts.toLocaleString("id-ID")}
          </p>
          <p className="text-[10px] text-blue-600 font-semibold">
            {overallConversionRate}% ROI konversi
          </p>
        </div>

        {/* Bottom Funnel: Revenue Attribution */}
        <div className="col-span-2 md:col-span-1 rounded-2xl border-2 border-emerald-600/30 bg-linear-to-b from-emerald-50/70 to-white p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Omzet Atribusi Iklan</span>
            <DollarSign className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="text-xl font-black text-emerald-900 tabular-nums">
            {formatRupiah(summary.totalRevenue)}
          </p>
          <p className="text-[10px] text-emerald-700 font-semibold">
            Dari {summary.totalCampaigns} kampanye aktif
          </p>
        </div>
      </div>

      {/* ── Conversion Funnel Visualization ── */}
      <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Visualisasi 4 Tahapan Funnel Konversi Marketing
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-stone-500">
            Total Pengunjung: {summary.totalScans}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-1">
          {/* Top Funnel: Scans */}
          <div className="relative rounded-xl bg-stone-100 p-3 border border-stone-200">
            <div className="text-[10px] font-bold uppercase text-stone-500">Top Funnel</div>
            <div className="text-sm font-black text-stone-900 mt-1">1. Scan QR / Kunjungan</div>
            <div className="text-lg font-black text-stone-900 tabular-nums mt-0.5">{summary.totalScans}</div>
            <div className="w-full bg-stone-300 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-stone-700 h-full w-full" />
            </div>
          </div>

          {/* Engagement Funnel: AI Chat */}
          <div className="relative rounded-xl bg-emerald-50/70 p-3 border border-emerald-200">
            <div className="text-[10px] font-bold uppercase text-emerald-700">Engagement</div>
            <div className="text-sm font-black text-emerald-950 mt-1">2. Percakapan AI RAG</div>
            <div className="text-lg font-black text-emerald-800 tabular-nums mt-0.5">{summary.totalChats}</div>
            <div className="w-full bg-emerald-200 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-full"
                style={{ width: `${Math.min(100, (summary.totalChats / (summary.totalScans || 1)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Intent Funnel: Cart */}
          <div className="relative rounded-xl bg-amber-50/70 p-3 border border-amber-200">
            <div className="text-[10px] font-bold uppercase text-amber-700">Purchase Intent</div>
            <div className="text-sm font-black text-amber-950 mt-1">3. Tambah ke Keranjang</div>
            <div className="text-lg font-black text-amber-800 tabular-nums mt-0.5">{summary.totalCarts}</div>
            <div className="w-full bg-amber-200 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-amber-600 h-full"
                style={{ width: `${Math.min(100, (summary.totalCarts / (summary.totalScans || 1)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Bottom Funnel: Paid Sales */}
          <div className="relative rounded-xl bg-blue-50/70 p-3 border border-blue-200">
            <div className="text-[10px] font-bold uppercase text-blue-700">Bottom Funnel</div>
            <div className="text-sm font-black text-blue-950 mt-1">4. Penjualan Berhasil</div>
            <div className="text-lg font-black text-blue-800 tabular-nums mt-0.5">{summary.totalCheckouts}</div>
            <div className="w-full bg-blue-200 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full"
                style={{ width: `${Math.min(100, (summary.totalCheckouts / (summary.totalScans || 1)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-white p-3 shadow-xs">
        {/* Channel Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] font-bold text-stone-500 px-2 shrink-0 flex items-center gap-1">
            <Filter className="h-3 w-3" />
            <span>Kanal:</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedChannel("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              selectedChannel === "all"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            Semua Kanal
          </button>
          {(Object.keys(CHANNEL_BADGES) as MarketingChannel[]).map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => setSelectedChannel(ch)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                selectedChannel === ch
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {CHANNEL_BADGES[ch].label}
            </button>
          ))}
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
            <input
              type="text"
              placeholder="Cari event / nama / UTM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50/50 pl-8 pr-3 py-1.5 text-xs focus:bg-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-1.5 text-xs text-stone-700 focus:outline-none"
          >
            <option value="date">Terbaru</option>
            <option value="scans">Paling Banyak Discan</option>
            <option value="revenue">Omzet Tertinggi</option>
          </select>
        </div>
      </div>

      {/* ── Campaigns Table ── */}
      <div className="rounded-2xl border border-stone-200/80 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
              <tr>
                <th className="px-4 py-3 font-bold">Nama Kampanye &amp; Kanal</th>
                <th className="px-4 py-3 font-bold">Parameter Pelacakan (UTM)</th>
                <th className="px-4 py-3 font-bold">Target &amp; Voucher</th>
                <th className="px-4 py-3 font-bold text-center">Scan</th>
                <th className="px-4 py-3 font-bold text-center">Chat AI</th>
                <th className="px-4 py-3 font-bold text-center">Keranjang</th>
                <th className="px-4 py-3 font-bold text-center">Sales</th>
                <th className="px-4 py-3 font-bold text-right">Omzet Atribusi</th>
                <th className="px-4 py-3 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-stone-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Memuat data analitik kampanye...</span>
                  </td>
                </tr>
              ) : sortedCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-stone-400">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-stone-300" />
                    <p className="font-semibold text-stone-600">Belum ada kampanye QR yang terdaftar.</p>
                    <p className="text-[11px] text-stone-400 mt-1">
                      Klik tombol "+ Buat QR Event / Iklan" untuk membuat QR pelacakan konversi pertama Anda.
                    </p>
                  </td>
                </tr>
              ) : (
                sortedCampaigns.map((camp) => {
                  const channelInfo = CHANNEL_BADGES[camp.channel] || CHANNEL_BADGES.other
                  const convRate = camp.scanCount && camp.scanCount > 0
                    ? (((camp.checkoutCount || 0) / camp.scanCount) * 100).toFixed(1)
                    : "0.0"

                  const targetProd = products.find((p) => p.id === camp.targetProductId)

                  return (
                    <tr key={camp.id} className="hover:bg-stone-50/70 transition">
                      {/* Name & Channel */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-stone-900 text-sm">{camp.name}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9.5px] font-bold ${channelInfo.badgeClass}`}>
                            {channelInfo.label}
                          </span>
                          {camp.utmCampaign && (
                            <span className="text-[10px] font-mono text-stone-500">
                              #{camp.utmCampaign}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* UTM Details */}
                      <td className="px-4 py-3.5 font-mono text-[11px] text-stone-600">
                        <div><span className="text-stone-400">src:</span> {camp.utmSource}</div>
                        <div><span className="text-stone-400">med:</span> {camp.utmMedium || "—"}</div>
                      </td>

                      {/* Target & Voucher */}
                      <td className="px-4 py-3.5 text-stone-700">
                        <div className="truncate max-w-[150px]">
                          {camp.targetType === "product" && targetProd ? (
                            <span className="text-emerald-800 font-semibold truncate">
                              🌿 {targetProd.name}
                            </span>
                          ) : (
                            <span className="text-stone-500">Portal Utama</span>
                          )}
                        </div>
                        {camp.promoCode ? (
                          <span className="inline-block mt-1 font-mono font-bold text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            🎟️ {camp.promoCode}
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[10px]">Tanpa voucher</span>
                        )}
                      </td>

                      {/* Funnel: Scans */}
                      <td className="px-4 py-3.5 text-center font-bold text-stone-800 tabular-nums">
                        {camp.scanCount || 0}
                      </td>

                      {/* Funnel: AI Chat */}
                      <td className="px-4 py-3.5 text-center font-bold text-emerald-700 tabular-nums">
                        {camp.chatEngagementCount || 0}
                      </td>

                      {/* Funnel: Cart */}
                      <td className="px-4 py-3.5 text-center font-bold text-amber-700 tabular-nums">
                        {camp.cartCount || 0}
                      </td>

                      {/* Funnel: Checkout / Sales */}
                      <td className="px-4 py-3.5 text-center font-bold text-blue-700 tabular-nums">
                        <div>{camp.checkoutCount || 0}</div>
                        <div className="text-[9.5px] font-semibold text-stone-400">
                          {convRate}%
                        </div>
                      </td>

                      {/* Attributed Revenue */}
                      <td className="px-4 py-3.5 text-right font-black text-emerald-800 tabular-nums text-sm">
                        {formatRupiah(camp.revenueAttributed || 0)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewCampaign(camp)}
                            className="rounded-lg p-1.5 hover:bg-emerald-50 text-emerald-700 transition cursor-pointer"
                            title="Lihat / Download QR Code"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCampaign(camp)
                              setIsCampaignModalOpen(true)
                            }}
                            className="rounded-lg p-1.5 hover:bg-stone-100 text-stone-600 transition cursor-pointer"
                            title="Edit / Regenerate Kampanye"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(camp.id!, camp.name)}
                            className="rounded-lg p-1.5 hover:bg-rose-50 text-rose-600 transition cursor-pointer"
                            title="Hapus Kampanye"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Level 4 Campaign Builder ── */}
      <MarketingCampaignModal
        open={isCampaignModalOpen}
        campaign={editingCampaign}
        products={products}
        onClose={() => setIsCampaignModalOpen(false)}
        onSuccess={() => {
          fetchCampaigns()
        }}
      />

      {/* ── Modal: Level 1 Master Chatbot / Meja Kasir QR ── */}
      <MasterChatbotQrModal
        open={isMasterQrOpen}
        onClose={() => setIsMasterQrOpen(false)}
      />

      {/* ── Modal: Quick QR Preview & Download ── */}
      {previewCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl border border-stone-200/80 bg-white p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900">{previewCampaign.name}</h3>
                <p className="text-[11px] text-stone-500 font-mono">
                  {previewCampaign.channel.toUpperCase()} • {previewCampaign.utmCampaign || "general"}
                </p>
              </div>
              <button
                onClick={() => setPreviewCampaign(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="text-center space-y-3 rounded-2xl border border-emerald-100 bg-linear-to-b from-emerald-50/50 to-stone-50/50 p-4">
              <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-2xl border-2 border-emerald-600/30 bg-white p-2.5 shadow-xs">
                {previewQrUrl ? (
                  <img
                    src={previewQrUrl}
                    alt="QR Code"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="text-xs text-stone-400">Membuat QR...</div>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-stone-800">
                  {previewCampaign.bannerMessage || "Scan untuk Konsultasi & Belanja"}
                </p>
                {previewCampaign.promoCode && (
                  <p className="text-[11px] font-mono font-bold text-emerald-800">
                    Kode Voucher: {previewCampaign.promoCode}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const a = document.createElement("a")
                  a.href = previewQrUrl
                  a.download = `QR_${previewCampaign.utmCampaign || "marketing"}.png`
                  a.click()
                }}
                disabled={!previewQrUrl}
                className="flex min-h-[40px] h-10 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-700 hover:bg-stone-50 transition active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Download className="h-4 w-4 text-emerald-700" />
                <span>Unduh PNG</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const baseOrigin = typeof window !== "undefined" ? window.location.origin : "https://qris-herbal-pos.netlify.app"
                  const params = new URLSearchParams()
                  params.set("utm_source", previewCampaign.utmSource)
                  if (previewCampaign.utmMedium) params.set("utm_medium", previewCampaign.utmMedium)
                  if (previewCampaign.utmCampaign) params.set("utm_campaign", previewCampaign.utmCampaign)
                  if (previewCampaign.promoCode) params.set("promo_code", previewCampaign.promoCode)
                  if (previewCampaign.targetType === "product" && previewCampaign.targetProductId) {
                    params.set("consultProduct", previewCampaign.targetProductId)
                  }
                  params.set("openChat", "true")
                  navigator.clipboard.writeText(`${baseOrigin}/?${params.toString()}`)
                  setPreviewCopied(true)
                  setTimeout(() => setPreviewCopied(false), 2000)
                }}
                className="flex min-h-[40px] h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs shadow-emerald-700/20 transition active:scale-95 cursor-pointer"
              >
                {previewCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{previewCopied ? "Tersalin!" : "Salin Link"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
