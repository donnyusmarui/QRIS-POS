import { useState, useEffect, useMemo } from "react"
import QRCode from "qrcode"
import {
  X,
  QrCode,
  Download,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Share2,
  ExternalLink,
} from "lucide-react"
import type { Product } from "@/types"
import { useStoreProfileStore } from "@/lib/store-profile"

export type MarketingChannel =
  | "tiktok"
  | "instagram"
  | "youtube"
  | "whatsapp"
  | "google"
  | "facebook"
  | "linkedin"
  | "offline"
  | "other"

export interface MarketingCampaignData {
  id?: string
  name: string
  channel: MarketingChannel
  utmSource: string
  utmMedium?: string | null
  utmCampaign?: string | null
  utmContent?: string | null
  promoCode?: string | null
  targetType: "portal" | "product"
  targetProductId?: string | null
  customGreeting?: string | null
  bannerMessage?: string | null
  scanCount?: number
  chatEngagementCount?: number
  cartCount?: number
  checkoutCount?: number
  revenueAttributed?: number
}

interface MarketingCampaignModalProps {
  open: boolean
  campaign?: MarketingCampaignData | null
  products: Product[]
  onClose: () => void
  onSuccess: (savedCampaign: MarketingCampaignData) => void
}

const CHANNEL_CONFIG: Record<
  MarketingChannel,
  { label: string; defaultSource: string; color: string; badgeClass: string; mediums: string[] }
> = {
  tiktok: {
    label: "TikTok",
    defaultSource: "tiktok",
    color: "#000000",
    badgeClass: "bg-black text-white",
    mediums: ["video_vt", "bio_link", "tiktok_ads", "live_stream"],
  },
  instagram: {
    label: "Instagram",
    defaultSource: "instagram",
    color: "#E1306C",
    badgeClass: "bg-linear-to-r from-purple-600 via-pink-600 to-amber-500 text-white",
    mediums: ["story", "reels", "bio_link", "ig_ads", "dm_link"],
  },
  youtube: {
    label: "YouTube",
    defaultSource: "youtube",
    color: "#FF0000",
    badgeClass: "bg-red-600 text-white",
    mediums: ["video_desc", "community_post", "shorts", "pinned_comment", "yt_card"],
  },
  whatsapp: {
    label: "WhatsApp",
    defaultSource: "whatsapp",
    color: "#25D366",
    badgeClass: "bg-emerald-600 text-white",
    mediums: ["broadcast", "cs_chat", "status_wa", "group_share"],
  },
  google: {
    label: "Google",
    defaultSource: "google",
    color: "#4285F4",
    badgeClass: "bg-blue-600 text-white",
    mediums: ["cpc_ads", "gmb_maps", "organic_seo", "youtube_desc"],
  },
  facebook: {
    label: "Facebook",
    defaultSource: "facebook",
    color: "#1877F2",
    badgeClass: "bg-blue-700 text-white",
    mediums: ["feeds_post", "fb_ads", "marketplace", "group_post"],
  },
  linkedin: {
    label: "LinkedIn",
    defaultSource: "linkedin",
    color: "#0A66C2",
    badgeClass: "bg-sky-700 text-white",
    mediums: ["b2b_networking", "article", "linkedin_ads", "dm_inmail"],
  },
  offline: {
    label: "Offline Event",
    defaultSource: "offline",
    color: "#059669",
    badgeClass: "bg-emerald-700 text-white",
    mediums: ["flyer_bazaar", "banner_toko", "packaging_sticker", "meja_standee", "kartu_nama"],
  },
  other: {
    label: "Kanal Lainnya",
    defaultSource: "custom",
    color: "#78716C",
    badgeClass: "bg-stone-700 text-white",
    mediums: ["referral", "email_newsletter", "affiliate", "partnership"],
  },
}

export function MarketingCampaignModal({
  open,
  campaign,
  products,
  onClose,
  onSuccess,
}: MarketingCampaignModalProps) {
  const isEditing = !!campaign?.id

  // Form states
  const [name, setName] = useState(campaign?.name || "")
  const [channel, setChannel] = useState<MarketingChannel>(campaign?.channel || "tiktok")
  const [utmSource, setUtmSource] = useState(campaign?.utmSource || "tiktok")
  const [utmMedium, setUtmMedium] = useState(campaign?.utmMedium || "video_vt")
  const [utmCampaign, setUtmCampaign] = useState(campaign?.utmCampaign || "")
  const [utmContent, setUtmContent] = useState(campaign?.utmContent || "")
  const [promoCode, setPromoCode] = useState(campaign?.promoCode || "")
  const [targetType, setTargetType] = useState<"portal" | "product">(campaign?.targetType || "portal")
  const [targetProductId, setTargetProductId] = useState(campaign?.targetProductId || "")
  const [bannerMessage, setBannerMessage] = useState(campaign?.bannerMessage || "")
  const [customGreeting, setCustomGreeting] = useState(campaign?.customGreeting || "")

  // Live QR & Copy state
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  // Auto-fill values when editing or changing channel
  useEffect(() => {
    if (campaign) {
      setName(campaign.name)
      setChannel(campaign.channel)
      setUtmSource(campaign.utmSource)
      setUtmMedium(campaign.utmMedium || "")
      setUtmCampaign(campaign.utmCampaign || "")
      setUtmContent(campaign.utmContent || "")
      setPromoCode(campaign.promoCode || "")
      setTargetType(campaign.targetType || "portal")
      setTargetProductId(campaign.targetProductId || "")
      setBannerMessage(campaign.bannerMessage || "")
      setCustomGreeting(campaign.customGreeting || "")
    } else {
      setName("")
      setChannel("tiktok")
      setUtmSource("tiktok")
      setUtmMedium("video_vt")
      setUtmCampaign("")
      setUtmContent("")
      setPromoCode("")
      setTargetType("portal")
      setTargetProductId("")
      setBannerMessage("")
      setCustomGreeting("")
    }
    setErrorMsg("")
  }, [campaign, open])

  // When changing channel, auto set recommended source and medium if not editing
  const handleChannelChange = (newChan: MarketingChannel) => {
    setChannel(newChan)
    const conf = CHANNEL_CONFIG[newChan]
    setUtmSource(conf.defaultSource)
    if (conf.mediums.length > 0) {
      setUtmMedium(conf.mediums[0])
    }
  }

  // Auto-suggest utm_campaign slug from name if empty
  const handleNameBlur = () => {
    if (!utmCampaign && name) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
      setUtmCampaign(slug)
    }
  }

  const { terminology, renderTemplate } = useStoreProfileStore()

  // Auto-suggest smart greeting & banner if empty
  const handleAutoSuggestCopy = () => {
    const channelName = CHANNEL_CONFIG[channel].label
    const promoText = promoCode ? ` Gunakan kode voucher [${promoCode.toUpperCase()}] untuk diskon eksklusif.` : ""
    setBannerMessage(`${renderTemplate(terminology.bannerGreetingTemplate, channelName)}${promoText}`)
    setCustomGreeting(renderTemplate(terminology.botGreetingTemplate, channelName))
  }

  // Construct target URL
  const baseOrigin = typeof window !== "undefined" ? window.location.origin : "https://qris-herbal-pos-id.netlify.app"
  const targetUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (utmSource) params.set("utm_source", utmSource.toLowerCase())
    if (utmMedium) params.set("utm_medium", utmMedium)
    if (utmCampaign) params.set("utm_campaign", utmCampaign)
    if (utmContent) params.set("utm_content", utmContent)
    if (promoCode) params.set("promo_code", promoCode.toUpperCase())

    if (targetType === "product" && targetProductId) {
      params.set("consultProduct", targetProductId)
    }
    params.set("openChat", "true")

    return `${baseOrigin}/?${params.toString()}`
  }, [baseOrigin, utmSource, utmMedium, utmCampaign, utmContent, promoCode, targetType, targetProductId])

  // Live QR Code Generation
  const generateQr = (showPulse = false) => {
    if (!targetUrl) return
    if (showPulse) setIsRefreshing(true)
    QRCode.toDataURL(
      targetUrl,
      {
        width: 320,
        margin: 2,
        color: {
          dark: "#064e3b",
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadQr = () => {
    if (!qrDataUrl) return
    const a = document.createElement("a")
    a.href = qrDataUrl
    a.download = `QR_Kampanye_${utmCampaign || channel || "marketing"}.png`
    a.click()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMsg("Nama kampanye wajib diisi")
      return
    }
    if (!utmSource.trim()) {
      setErrorMsg("utm_source wajib diisi")
      return
    }

    setIsSubmitting(true)
    setErrorMsg("")

    try {
      const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token")
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      const payload = {
        name,
        channel,
        utmSource: utmSource.toLowerCase().trim(),
        utmMedium: utmMedium ? utmMedium.trim() : null,
        utmCampaign: utmCampaign ? utmCampaign.trim() : null,
        utmContent: utmContent ? utmContent.trim() : null,
        promoCode: promoCode ? promoCode.toUpperCase().trim() : null,
        targetType,
        targetProductId: targetType === "product" ? targetProductId || null : null,
        bannerMessage: bannerMessage ? bannerMessage.trim() : null,
        customGreeting: customGreeting ? customGreeting.trim() : null,
      }

      const url = isEditing
        ? `/.netlify/functions/marketing-campaigns?id=${campaign.id}`
        : `/.netlify/functions/marketing-campaigns`

      const method = isEditing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menyimpan kampanye")
      }

      onSuccess(data.data)
      onClose()
    } catch (err: any) {
      console.error("Gagal submit kampanye:", err)
      setErrorMsg(err.message || "Terjadi kesalahan saat menyimpan kampanye")
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedProduct = products.find((p) => p.id === targetProductId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-3xl border border-stone-200/80 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4 bg-stone-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                {isEditing ? "Edit Kampanye & Regenerate QR" : "Level 4: Generator QR Iklan & Multi-Kanal"}
              </h3>
              <p className="text-xs text-stone-500">
                Lacak konversi pemindaian, interaksi AI Chatbot, keranjang belanja, hingga transaksi lunas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-200/70 hover:text-stone-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body: Split Left (Form) & Right (Live QR Preview) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
          {/* Left Column: Input Form */}
          <div className="flex-1 space-y-4">
            {errorMsg && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
                {errorMsg}
              </div>
            )}

            {/* Kanal Marketing Picker */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-2">
                1. Pilih Kanal / Media Pemasaran (Channel Attribution)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(CHANNEL_CONFIG) as MarketingChannel[]).map((ch) => {
                  const item = CHANNEL_CONFIG[ch]
                  const isSelected = channel === ch
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => handleChannelChange(ch)}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2.5 text-xs font-bold transition-all cursor-pointer border ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs ring-1 ring-emerald-600"
                          : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${isSelected ? "bg-emerald-600" : "bg-stone-400"}`} />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Campaign Name & Slug */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nama Kampanye / Event <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Misal: Promo Ramadhan Berkah"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleNameBlur}
                  required
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  utm_campaign (Kode Event)
                </label>
                <input
                  type="text"
                  placeholder="Misal: promo_ramadhan_2026"
                  value={utmCampaign}
                  onChange={(e) => setUtmCampaign(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* UTM Parameters & Promo Code */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  utm_source <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={utmSource}
                  onChange={(e) => setUtmSource(e.target.value.toLowerCase().trim())}
                  required
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  utm_medium (Tipe Media)
                </label>
                <input
                  type="text"
                  value={utmMedium || ""}
                  onChange={(e) => setUtmMedium(e.target.value.toLowerCase().trim())}
                  placeholder="cpc, bio_link, story"
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                />
                {/* Chip suggestions */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {CHANNEL_CONFIG[channel].mediums.slice(0, 3).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setUtmMedium(m)}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 font-mono cursor-pointer"
                    >
                      +{m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Kode Promo / Voucher
                </label>
                <input
                  type="text"
                  placeholder="BERKAH20"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-mono font-bold text-emerald-800 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Target Destination: Portal vs Product */}
            <div className="rounded-2xl border border-stone-200/80 bg-stone-50/50 p-3.5 space-y-2.5">
              <label className="block text-xs font-bold text-stone-800">
                2. Target Halaman Tujuan Scan QR
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer">
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === "portal"}
                    onChange={() => setTargetType("portal")}
                    className="accent-emerald-600"
                  />
                  <span>{terminology.catalogHeading || "Halaman Katalog Toko"} (Semua Produk)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer">
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === "product"}
                    onChange={() => setTargetType("product")}
                    className="accent-emerald-600"
                  />
                  <span>{terminology.singleProductHeading || "Produk Spesifik (Deep-link & Konsultasi)"}</span>
                </label>
              </div>

              {targetType === "product" && (
                <div className="pt-1">
                  <select
                    value={targetProductId}
                    onChange={(e) => setTargetProductId(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">-- Pilih {terminology.singleProductHeading.includes("Menu") ? "Menu" : "Produk"} Target --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) - Rp {p.price.toLocaleString("id-ID")}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Smart Greeting Banner & RAG Chatbot Context */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-stone-700">
                  3. Personalisasi AI &amp; Smart Greeting Banner
                </label>
                <button
                  type="button"
                  onClick={handleAutoSuggestCopy}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Auto-Suggest Teks</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Smart Greeting Banner (Teks Notifikasi Atas Portal)
                </label>
                <input
                  type="text"
                  placeholder={`Misal: ${renderTemplate(terminology.bannerGreetingTemplate, CHANNEL_CONFIG[channel].label)}`}
                  value={bannerMessage}
                  onChange={(e) => setBannerMessage(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Pesan Pembuka Chatbot AI RAG Khusus Event
                </label>
                <textarea
                  rows={2}
                  placeholder={`Misal: ${renderTemplate(terminology.botGreetingTemplate, CHANNEL_CONFIG[channel].label)}`}
                  value={customGreeting}
                  onChange={(e) => setCustomGreeting(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Live QR Code & Analytics Preview */}
          <div className="w-full lg:w-80 flex flex-col items-center justify-between rounded-3xl border border-emerald-100 bg-linear-to-b from-emerald-50/50 to-stone-50/50 p-5 space-y-4">
            <div className="w-full text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${CHANNEL_CONFIG[channel].badgeClass}`}>
                  {CHANNEL_CONFIG[channel].label}
                </span>
                {promoCode && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Voucher: {promoCode}
                  </span>
                )}
              </div>

              <h4 className="text-sm font-bold text-stone-900 truncate px-2">
                {name || "Pratinjau QR Kampanye"}
              </h4>
              <p className="text-[10px] text-stone-500">
                {targetType === "product" && selectedProduct
                  ? `Target: ${selectedProduct.name}`
                  : "Target: Portal Utama"}
              </p>

              {/* QR Image Box */}
              <div className="relative mx-auto flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-emerald-700/40 bg-white p-2.5 shadow-sm">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR Code Preview"
                    className={`h-full w-full object-contain transition-opacity duration-200 ${
                      isRefreshing ? "opacity-30" : "opacity-100"
                    }`}
                  />
                ) : (
                  <div className="text-xs text-stone-400">Membuat QR...</div>
                )}

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="h-8 w-8 rounded-lg bg-emerald-700 p-1 shadow-md flex items-center justify-center text-white border-2 border-white">
                    <QrCode className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Regenerate Button */}
              <button
                type="button"
                onClick={() => generateQr(true)}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-emerald-700 cursor-pointer pt-1"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>[🔄 Generate Ulang / Refresh QR]</span>
              </button>
            </div>

            {/* Generated URL Box */}
            <div className="w-full space-y-2">
              <div className="rounded-xl bg-white/90 p-2 text-[10px] text-stone-500 border border-stone-200/80 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1 truncate">
                  <ExternalLink className="h-3 w-3 text-emerald-600 shrink-0" />
                  <span className="truncate max-w-[180px] font-mono">{targetUrl}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 shrink-0 cursor-pointer flex items-center gap-1"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? "Tersalin" : "Salin Link"}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  disabled={!qrDataUrl}
                  className="flex min-h-[38px] h-9 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-700 hover:bg-stone-50 transition active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Download PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex min-h-[38px] h-9 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-700 hover:bg-stone-50 transition active:scale-95 cursor-pointer shadow-xs"
                >
                  <Share2 className="h-3.5 w-3.5 text-stone-600" />
                  <span>Salin UTM</span>
                </button>
              </div>
            </div>

            {/* Submit Action */}
            <div className="w-full pt-2 border-t border-stone-200/60">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex min-h-[44px] h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-md shadow-emerald-700/20 transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>{isEditing ? "Perbarui Kampanye" : "Simpan & Aktifkan Kampanye"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
