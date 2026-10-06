import { useState, useMemo, useEffect, useCallback } from "react"
import { Link, useSearchParams } from "react-router"
import { useCustomerCartStore, type CartItem } from "@/stores/customer-cart-store"
import { CustomerCartDrawer } from "./CustomerCartDrawer"
import { CustomerPaymentModal } from "./CustomerPaymentModal"
import { CustomerReceiptModal } from "./CustomerReceiptModal"
import { CustomerChatbotWidget } from "./CustomerChatbotWidget"
import { parseProductChatConfig, type MasterProductChatConfig } from "@/lib/product-chat-config"
import { useStoreProfileStore } from "@/lib/store-profile"
import type { Product } from "@/types"
import {
  QrCode,
  Search,
  X,
  ShoppingBag,
  Leaf,
  ShieldCheck,
  Plus,
  Check,
  ChevronRight,
  UserCheck,
  BadgeAlert,
  Loader2,
  Star,
  Info,
  Bot,
  Clock,
} from "lucide-react"

// ─── Modal Detail Khasiat & Legalitas Herbal ───
function HerbalDetailModal({
  product,
  inCartItem,
  onClose,
  onAddToCart,
  onConsultProduct,
  formatRupiah,
  masterConfig,
}: {
  product: Product | null
  inCartItem?: CartItem
  onClose: () => void
  onAddToCart: (p: Product) => { success: boolean; message?: string } | void
  onConsultProduct: (p: Product, customPrompt?: string) => void
  formatRupiah: (n: number) => string
  masterConfig?: MasterProductChatConfig | null
}) {
  if (!product) return null
  const isOutOfStock = product.stock <= 0
  const isMaxStock = inCartItem ? inCartItem.quantity >= product.stock : false
  const isBtnDisabled = isOutOfStock || isMaxStock
  const { terminology, tagline, businessCategory } = useStoreProfileStore()
  const { cleanDescription, chatConfig } = parseProductChatConfig(product.description)
  const isChatVisible = (masterConfig ? masterConfig.masterEnabled : true) && chatConfig.enabled
  const buttonLabel = chatConfig.buttonText || masterConfig?.defaultButtonText || terminology.aiButtonText || "Tanya Asisten AI"

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-stone-200/80 bg-white p-5 sm:p-7 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-250 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Mobile Swipe / Sheet Handle Indicator */}
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-stone-300 sm:hidden shrink-0" />

        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
          aria-label="Tutup Detail"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <div className="relative w-full sm:w-44 aspect-square rounded-2xl overflow-hidden bg-stone-100 ring-1 ring-inset ring-black/5 shrink-0">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-emerald-600">
                <Leaf className="h-12 w-12" />
              </div>
            )}
            <span className="absolute top-2.5 left-2.5 rounded-full bg-emerald-700/95 text-white text-[9px] font-bold px-2.5 py-0.5 shadow-2xs flex items-center gap-1 backdrop-blur-xs">
              <ShieldCheck className="h-3 w-3" /> {businessCategory === "pharmacy_herbal" ? "BPOM Resmi" : "Terverifikasi"}
            </span>
          </div>

          <div className="space-y-2 flex-1">
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/80">
              {product.category || terminology.allCategoryLabel || "Produk Pilihan"}
            </span>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 leading-snug [text-wrap:balance]">
              {product.name}
            </h2>
            <p className="text-xs font-mono text-stone-400">SKU: {product.sku}</p>
            <p className="text-lg sm:text-xl font-bold text-emerald-800 tabular-nums font-mono tracking-tight">
              {formatRupiah(product.price)}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3.5 border-t border-stone-200/80 pt-4">
          <div>
            <h4 className="text-xs font-bold text-stone-500 flex items-center gap-1.5 uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              {businessCategory === "pharmacy_herbal" ? "Informasi Khasiat & Legalitas BPOM" : "Informasi & Detail Spesifikasi"}
            </h4>
            <div className="mt-2 rounded-2xl bg-[#FDFBF7] border border-stone-200/80 p-4 text-xs text-stone-600 leading-relaxed [text-wrap:pretty]">
              {cleanDescription || tagline || "Informasi produk berkualitas tinggi dan siap dipesan."}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-stone-600 bg-stone-50 p-3.5 rounded-xl border border-stone-200/60">
            <span>Status Ketersediaan:</span>
            <span className={`font-bold ${isOutOfStock ? "text-rose-600" : isMaxStock ? "text-amber-700" : "text-emerald-700"}`}>
              {isOutOfStock ? "Stok Habis" : isMaxStock ? `Maksimal di Keranjang (${product.stock})` : `Tersedia (${product.stock} item)`}
            </span>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            {isChatVisible && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onConsultProduct(product, chatConfig.customPrompt)
                }}
                className="min-h-[44px] h-11 w-full py-2.5 px-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-2xs"
              >
                <Bot className="h-4 w-4 text-emerald-700 shrink-0" />
                <span>{buttonLabel}</span>
              </button>
            )}
            <div className="flex gap-2 flex-1">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] h-11 flex-1 py-2.5 px-3 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={isBtnDisabled}
                onClick={() => {
                  const res = onAddToCart(product)
                  if (res && !res.success) {
                    alert(res.message || "Batas stok maksimal tercapai")
                    return
                  }
                  onClose()
                }}
                className="min-h-[44px] h-11 flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-100 disabled:text-stone-400 disabled:border disabled:border-stone-200 text-white text-xs font-bold shadow-sm shadow-emerald-700/20 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>
                  {isOutOfStock
                    ? "Stok Habis"
                    : isMaxStock
                    ? `Maksimal (${inCartItem?.quantity})`
                    : inCartItem
                    ? `Tambah (${inCartItem.quantity})`
                    : (terminology.buyButtonText || "+ Beli")}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Impeccable Product Card Component ───
function ProductCard({
  product,
  inCartItem,
  onAddToCart,
  onViewDetail,
  onConsultProduct,
  formatRupiah,
  masterConfig,
}: {
  product: Product
  inCartItem?: CartItem
  onAddToCart: (p: Product) => { success: boolean; message?: string } | void
  onViewDetail: (p: Product) => void
  onConsultProduct: (p: Product, customPrompt?: string) => void
  formatRupiah: (n: number) => string
  masterConfig?: MasterProductChatConfig | null
}) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const isOutOfStock = product.stock <= 0
  const isMaxStock = inCartItem ? inCartItem.quantity >= product.stock : false
  const isBtnDisabled = isOutOfStock || isMaxStock
  const { terminology, businessCategory } = useStoreProfileStore()
  const { cleanDescription, chatConfig } = parseProductChatConfig(product.description)
  const isChatVisible = (masterConfig ? masterConfig.masterEnabled : true) && chatConfig.enabled
  const buttonLabel = chatConfig.buttonText || masterConfig?.defaultButtonText || terminology.aiButtonText || "Tanya Asisten AI"

  // Category Badges based on pathology cluster
  const getCategoryBadge = () => {
    if (product.category?.includes("Kolesterol")) {
      return { text: "Jantung & Lipid 🫀", bg: "bg-rose-600 text-white" }
    }
    if (product.category?.includes("Darah Kental")) {
      return { text: "Sirkulasi Darah 🩸", bg: "bg-red-700 text-white" }
    }
    if (product.category?.includes("Asam Urat")) {
      return { text: "Asam Urat 🦶", bg: "bg-amber-600 text-white" }
    }
    if (product.category?.includes("Diabetes")) {
      return { text: "Gula Darah 🍬", bg: "bg-emerald-700 text-white" }
    }
    if (product.category?.includes("Hipertensi")) {
      return { text: "Tensi Darah 💓", bg: "bg-indigo-700 text-white" }
    }
    return { text: product.category || terminology.allCategoryLabel || "Produk Pilihan", bg: "bg-emerald-800 text-white" }
  }
  const badge = getCategoryBadge()

  return (
    <div className="group relative flex flex-col justify-between rounded-3xl border border-stone-200/80 bg-white p-3 sm:p-4 shadow-xs hover:shadow-md hover:border-emerald-500/30 hover:-translate-y-0.5 transition-all duration-200">
      <div className="space-y-3">
        {/* ── Outer Image Frame with Concentric Radius & Inset Outline ── */}
        <div 
          onClick={() => onViewDetail(product)}
          className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#F6F4EE] ring-1 ring-inset ring-black/5 cursor-pointer"
        >
          {/* Shimmer Placeholder */}
          {!imageLoaded && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-100 animate-pulse">
              <div className="flex flex-col items-center gap-1.5 text-stone-400">
                <Leaf className="h-8 w-8 stroke-[1.5] text-emerald-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Memuat...
                </span>
              </div>
            </div>
          )}

          {/* High-Definition Herbal Photography */}
          {product.imageUrl && !hasError ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => setHasError(true)}
              className={`h-full w-full object-cover transition-all duration-300 ease-out group-hover:scale-105 ${
                imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
              }`}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-4 text-emerald-700/60 text-center">
              <Leaf className="h-10 w-10 stroke-[1.5]" />
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mt-1">
                {product.category || terminology.allCategoryLabel || "Produk Pilihan"}
              </span>
            </div>
          )}

          {/* Official Verification Badges */}
          <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
            <span className="rounded-full bg-emerald-700/95 backdrop-blur-xs px-2.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-white shadow-2xs flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> {businessCategory === "pharmacy_herbal" ? "BPOM RI ✅" : "Terverifikasi ✅"}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold shadow-2xs ${badge.bg}`}>
              {badge.text}
            </span>
          </div>

          {/* Stock Availability Pill */}
          <div className="absolute bottom-2.5 left-2.5 z-10">
            {isOutOfStock ? (
              <span className="rounded-lg bg-rose-600/90 backdrop-blur-xs px-2 py-0.5 text-[8.5px] font-bold text-white uppercase tracking-wider shadow-2xs">
                Habis
              </span>
            ) : (
              <span className="rounded-lg bg-stone-900/80 backdrop-blur-xs px-2 py-0.5 text-[8.5px] font-bold text-white tabular-nums shadow-2xs">
                Sisa {product.stock}
              </span>
            )}
          </div>

          {/* In-Cart Counter Indicator */}
          {inCartItem && (
            <div className="absolute top-2.5 right-2.5 z-10">
              <span className="flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md">
                <Check className="h-3 w-3 stroke-[2.5]" />
                <span className="tabular-nums font-mono">{inCartItem.quantity}</span>
              </span>
            </div>
          )}
        </div>

        {/* ── Product Information ── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 truncate max-w-[120px]">
              {product.category || "Herbal Terstandar"}
            </span>
            <span className="text-[9px] font-mono text-stone-400 shrink-0">
              {product.sku}
            </span>
          </div>

          <h3 
            onClick={() => onViewDetail(product)}
            className="text-xs sm:text-sm font-semibold text-stone-900 [text-wrap:balance] line-clamp-2 leading-snug min-h-[2.5rem] group-hover:text-emerald-700 transition-colors cursor-pointer"
          >
            {product.name}
          </h3>

          {/* Clinical description snippet */}
          {cleanDescription && (
            <p className="text-[11px] sm:text-xs text-stone-500 line-clamp-2 leading-relaxed [text-wrap:pretty] min-h-[2rem]">
              {cleanDescription}
            </p>
          )}

          <div className="pt-1 flex items-center justify-between">
            <p className="text-sm sm:text-base font-bold text-emerald-800 tabular-nums font-mono tracking-tight">
              {formatRupiah(product.price)}
            </p>
            <button
              type="button"
              onClick={() => onViewDetail(product)}
              className="min-h-[32px] px-2 py-1 text-[11px] font-semibold text-stone-500 hover:text-emerald-700 inline-flex items-center gap-1 transition"
            >
              <Info className="h-3 w-3" />
              <span>Detail</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Action CTA (Strict min 44px touch targets on mobile) ── */}
      <div className="mt-3.5 space-y-2">
        <button
          type="button"
          disabled={isBtnDisabled}
          onClick={() => {
            const res = onAddToCart(product) as any
            if (res && !res.success) {
              alert(res.message || "Batas stok maksimal produk tercapai")
            }
          }}
          className={`press-tactile flex w-full min-h-[44px] h-11 items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs font-bold transition-all shadow-xs active:scale-95 ${
            isOutOfStock
              ? "bg-stone-100 text-stone-400 cursor-not-allowed"
              : isMaxStock
              ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
              : inCartItem
              ? "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/20"
          }`}
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>
            {isOutOfStock
              ? "Stok Habis"
              : isMaxStock
              ? `Maksimal (${inCartItem?.quantity})`
              : inCartItem
              ? `Tambah (${inCartItem.quantity})`
              : (terminology.buyButtonText || "+ Beli Sekarang")}
          </span>
        </button>

        {isChatVisible && (
          <button
            type="button"
            onClick={() => onConsultProduct(product, chatConfig.customPrompt)}
            title={`${terminology.aiButtonText || "Tanya Asisten AI"} seputar ${product.name}`}
            className="press-tactile flex w-full min-h-[44px] h-11 items-center justify-center gap-1.5 rounded-xl py-2 px-2.5 bg-stone-50 hover:bg-emerald-50/80 text-stone-700 hover:text-emerald-800 border border-stone-200/80 hover:border-emerald-200 text-[11px] sm:text-xs font-semibold transition active:scale-95 cursor-pointer shadow-2xs"
          >
            <Bot className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>{buttonLabel}</span>
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Master Customer Portal Page ───
export function CustomerPortalPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { storeName, tagline, businessCategory, terminology, renderTemplate, hydrateFromServer } = useStoreProfileStore()
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    hydrateFromServer()
  }, [hydrateFromServer])
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null)
  const [productToConsult, setProductToConsult] = useState<Product | null>(null)
  const [customPromptOverride, setCustomPromptOverride] = useState<string | undefined>(undefined)

  const handleConsultProduct = useCallback((product: Product, customPrompt?: string) => {
    setIsCartOpen(false)
    setCustomPromptOverride(customPrompt)
    setProductToConsult(product)
  }, [])

  const handleClearConsultProduct = useCallback(() => {
    setProductToConsult(null)
    setCustomPromptOverride(undefined)
  }, [])

  // Current active transaction state
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null)
  const [activeQrisRefId, setActiveQrisRefId] = useState<string | null>(null)
  const [activeQrString, setActiveQrString] = useState<string | null>(null)
  const [activeVaNumber, setActiveVaNumber] = useState<string | null>(null)
  const [completedOrderItems, setCompletedOrderItems] = useState<any[]>([])
  const [completedTotalAmount, setCompletedTotalAmount] = useState(0)
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const {
    cart,
    addToCart,
    getTotalItems,
    getSubtotal,
    customerInfo,
    selectedPayment,
    selectedBank,
    clearCart,
  } = useCustomerCartStore()

  // Active Marketing Campaign state & attribution
  const [activeCampaign, setActiveCampaign] = useState<{
    id?: string
    name?: string
    channel?: string
    bannerMessage?: string
    customGreeting?: string
    promoCode?: string
    utmCampaign?: string
    utmSource?: string
  } | null>(() => {
    try {
      const saved = sessionStorage.getItem("active_marketing_campaign")
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [isBannerDismissed, setIsBannerDismissed] = useState(false)

  // Marketing UTM Scan Attribution Listener
  useEffect(() => {
    const utmSource = searchParams.get("utm_source")
    const utmCampaign = searchParams.get("utm_campaign")
    const utmMedium = searchParams.get("utm_medium")
    const promoCode = searchParams.get("promo_code")
    const campId = searchParams.get("camp_id")

    if (utmSource || utmCampaign || campId) {
      fetch("/.netlify/functions/marketing-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "scan",
          campaignId: campId || undefined,
          utmSource: utmSource || undefined,
          utmCampaign: utmCampaign || undefined,
          utmMedium: utmMedium || undefined,
          metadata: {
            referrer: document.referrer || "direct",
            userAgent: navigator.userAgent,
          },
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data?.campaign) {
            const camp = {
              ...res.data.campaign,
              utmCampaign: utmCampaign || res.data.campaign.utmCampaign,
              utmSource: utmSource || res.data.campaign.utmSource,
              promoCode: promoCode || res.data.campaign.promoCode,
            }
            setActiveCampaign(camp)
            sessionStorage.setItem("active_marketing_campaign", JSON.stringify(camp))
          } else if (utmSource || utmCampaign) {
            const fallbackCamp = {
              channel: utmSource || "marketing",
              utmSource: utmSource || "direct",
              utmCampaign: utmCampaign || undefined,
              promoCode: promoCode || undefined,
              bannerMessage: renderTemplate(terminology.bannerGreetingTemplate, utmSource ? utmSource.toUpperCase() : "Media Digital"),
              customGreeting: renderTemplate(terminology.botGreetingTemplate, utmSource || "kami"),
            }
            setActiveCampaign(fallbackCamp)
            sessionStorage.setItem("active_marketing_campaign", JSON.stringify(fallbackCamp))
          }
        })
        .catch(() => {})
    }
  }, [searchParams])

  const handleAddToCartWithTrack = useCallback(
    (product: Product) => {
      const res = addToCart(product)
      if (activeCampaign) {
        fetch("/.netlify/functions/marketing-track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventType: "add_to_cart",
            campaignId: activeCampaign.id,
            utmCampaign: activeCampaign.utmCampaign,
            utmSource: activeCampaign.utmSource,
            productId: product.id,
          }),
        }).catch(() => {})
      }
      return res
    },
    [addToCart, activeCampaign]
  )

  // State & fetch for active products
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [masterChatConfig, setMasterChatConfig] = useState<MasterProductChatConfig | null>(null)

  useEffect(() => {
    fetch("/.netlify/functions/chatbot-config-get?type=product_chat")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) setMasterChatConfig(res.data)
      })
      .catch(() => {})
  }, [])

  const fetchProducts = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/.netlify/functions/products-list?pageSize=100")
      const json = await res.json()
      const items = (json.data?.items || json.data || []) as Product[]
      setProducts(items)
    } catch (err) {
      console.error("Gagal memuat produk:", err)
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Deep link auto-consultation listener (?consultProduct=<id_or_sku>&openChat=true)
  useEffect(() => {
    const consultParam = searchParams.get("consultProduct")
    if (consultParam && products.length > 0) {
      const target = products.find(
        (p) => p.id === consultParam || p.sku.toLowerCase() === consultParam.toLowerCase()
      )
      if (target) {
        const { chatConfig } = parseProductChatConfig(target.description)
        handleConsultProduct(target, chatConfig.customPrompt)
        const nextParams = new URLSearchParams(searchParams)
        nextParams.delete("consultProduct")
        nextParams.delete("openChat")
        setSearchParams(nextParams, { replace: true })
      }
    }
  }, [products, searchParams, setSearchParams, handleConsultProduct])

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    return ["all", ...Array.from(set)]
  }, [products])

  // Filtered products with multi-attribute search (name, sku, category, description)
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      const matchesCategory =
        selectedCategory === "all" || p.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, searchQuery, selectedCategory])

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n)

  // Category labels with thematic icons
  const getCategoryLabel = (cat: string) => {
    if (cat === "all") return terminology.allCategoryLabel || "Semua Produk"
    if (cat.includes("Kolesterol")) return "Kolesterol & Jantung 🫀"
    if (cat.includes("Darah Kental")) return "Darah Kental & Sirkulasi 🩸"
    if (cat.includes("Asam Urat")) return "Asam Urat & Sendi 🦶"
    if (cat.includes("Diabetes")) return "Diabetes & Gula Darah 🍬"
    if (cat.includes("Hipertensi")) return "Hipertensi & Tensi 💓"
    return cat
  }

  // Handle Checkout from Drawer
  async function handleCheckout() {
    if (cart.length === 0 || isCheckingOut) return

    // Re-use active pending transaction if cart items match previously initiated checkout
    if (activeTransactionId && completedOrderItems.length === cart.length) {
      const isSameOrder = cart.every((c, idx) => {
        const prev = completedOrderItems[idx]
        return prev && prev.product.id === c.product.id && prev.quantity === c.quantity
      })
      if (isSameOrder) {
        setIsCartOpen(false)
        setIsPaymentOpen(true)
        return
      }
    }

    setIsCheckingOut(true)
    try {
      const res = await fetch("/.netlify/functions/transactions-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: undefined,
          paymentMethod: selectedPayment,
          bank: selectedBank.toLowerCase(),
          customerName: customerInfo.name || undefined,
          campaignId: activeCampaign?.id || undefined,
          utmCampaign: activeCampaign?.utmCampaign || undefined,
          utmSource: activeCampaign?.utmSource || undefined,
          notes: `${customerInfo.orderType === "dine_in" ? `[Di Tempat / Meja ${customerInfo.tableNumber || "-"}]` : "[Bawa Pulang / Kirim]"} Pemesan: ${customerInfo.name} (${customerInfo.phone || "No WA"})`,
          items: cart.map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
          })),
        }),
      })

      // Fire marketing tracking for checkout event
      if (activeCampaign) {
        fetch("/.netlify/functions/marketing-track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventType: "checkout",
            campaignId: activeCampaign.id,
            utmCampaign: activeCampaign.utmCampaign,
            utmSource: activeCampaign.utmSource,
          }),
        }).catch(() => {})
      }

      const json = await res.json()

      if (json.success && json.data) {
        setActiveTransactionId(json.data.transactionId)
        setActiveQrisRefId(json.data.qrisRefId)
        setActiveQrString(json.data.qrString || null)
        setActiveVaNumber(json.data.vaNumber || null)
        setCompletedOrderItems([...cart])
        setCompletedTotalAmount(getSubtotal())

        // Close cart and open payment modal
        setIsCartOpen(false)
        setIsPaymentOpen(true)
      } else {
        alert(json.error || "Gagal membuat pesanan. Silakan periksa koneksi.")
      }
    } catch {
      alert("Terjadi kesalahan saat memproses pesanan.")
    } finally {
      setIsCheckingOut(false)
    }
  }

  // Handle Payment Success
  function handlePaymentSuccess() {
    setIsPaymentOpen(false)
    setIsReceiptOpen(true)
    clearCart()
    fetchProducts() // Refresh product stock
  }

  // Memoize campaign context to prevent wasteful chatbot re-renders
  const memoizedCampaignContext = useMemo(() => {
    if (!activeCampaign) return null
    return {
      channel: activeCampaign.channel,
      campaignName: activeCampaign.name,
      customGreeting: activeCampaign.customGreeting,
      promoCode: activeCampaign.promoCode,
    }
  }, [
    activeCampaign?.channel,
    activeCampaign?.name,
    activeCampaign?.customGreeting,
    activeCampaign?.promoCode,
  ])

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#181512] flex flex-col justify-between selection:bg-[#FF5A2B]/20 selection:text-[#FF5A2B]">
      {/* ── TOP HERO WASH ── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-emerald-100/35 via-stone-50/50 to-transparent" />

      {/* ── SMART GREETING & MARKETING ATTRIBUTION BANNER ── */}
      {activeCampaign && !isBannerDismissed && (
        <div className="relative z-40 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white px-4 py-2.5 shadow-sm text-xs border-b border-emerald-900/40 animate-in slide-in-from-top duration-300">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white font-extrabold text-[10px] uppercase">
                {activeCampaign.channel ? activeCampaign.channel.slice(0, 2) : "QR"}
              </span>
              <p className="font-medium text-emerald-50 truncate sm:whitespace-normal">
                {activeCampaign.bannerMessage ||
                  renderTemplate(terminology.bannerGreetingTemplate, activeCampaign.channel?.toUpperCase() || "Iklan")}
              </p>
              {activeCampaign.promoCode && (
                <span className="hidden sm:inline-flex items-center gap-1 bg-amber-400 text-stone-950 font-mono font-black text-[11px] px-2 py-0.5 rounded-md shadow-2xs shrink-0">
                  🎟️ KODE VOUCHER: {activeCampaign.promoCode}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {activeCampaign.promoCode && (
                <span className="sm:hidden inline-flex items-center bg-amber-400 text-stone-950 font-mono font-black text-[10px] px-1.5 py-0.5 rounded">
                  {activeCampaign.promoCode}
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsBannerDismissed(true)}
                className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
                aria-label="Tutup Banner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER (Store Navigation) ── */}
      <header className="sticky top-0 z-30 bg-[#FBF9F5]/90 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-8 py-3 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          {/* Logo & Info Toko */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-xs">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-stone-900">
                  QRIS-POS
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Buka • {storeName}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium hidden sm:block">
                {tagline}
              </p>
            </div>
          </div>

          {/* Right Header Navigation & Staff Portal Link */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 min-h-[40px] rounded-xl border border-stone-200/80 bg-white px-3 py-2 text-xs font-semibold text-stone-600 shadow-2xs hover:border-emerald-600 hover:text-emerald-700 transition"
              title="Akses Kasir & Manajemen Toko"
            >
              <UserCheck className="h-4 w-4 text-emerald-600" />
              <span className="hidden sm:inline">Portal Kasir / Staff</span>
            </Link>

            {/* Cart Header Button (44px min touch target) */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="press-tactile relative flex h-11 min-h-[44px] items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 sm:px-4 text-xs font-bold text-white shadow-xs shadow-emerald-700/20 active:scale-95 transition"
              aria-label="Buka Keranjang Pesanan"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden xs:inline">Keranjang</span>
              {getTotalItems() > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[11px] font-black text-stone-900 tabular-nums font-mono shadow-2xs">
                  {getTotalItems()}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT WORKSPACE ── */}
      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-3.5 sm:px-8 py-5 sm:py-6 space-y-6 sm:space-y-7">
        {/* ── ACTIVE PENDING TRANSACTION BANNER ── */}
        {activeTransactionId && !isPaymentOpen && !isReceiptOpen && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                <Clock className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-stone-900">
                  Anda memiliki pesanan yang menunggu pembayaran
                </p>
                <p className="text-[11px] sm:text-xs text-stone-600">
                  Ref: <span className="font-mono font-semibold">{activeQrisRefId || activeTransactionId.slice(0, 8)}</span> • Total:{" "}
                  <span className="font-bold text-emerald-800 font-mono">{formatRupiah(completedTotalAmount)}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Batalkan transaksi yang tertunda ini?")) {
                    setActiveTransactionId(null)
                    setActiveQrisRefId(null)
                    setCompletedOrderItems([])
                  }
                }}
                className="flex-1 sm:flex-none min-h-[40px] px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 text-xs font-semibold transition cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={() => setIsPaymentOpen(true)}
                className="flex-1 sm:flex-none min-h-[40px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <QrCode className="h-4 w-4" />
                <span>Bayar Sekarang</span>
              </button>
            </div>
          </div>
        )}

        {/* ── STORE HERO BANNER ── */}
        <div className="rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 via-stone-50/60 to-[#FDFBF7] p-5 sm:p-8 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100/70 px-3 py-1 text-xs font-bold text-emerald-800 shadow-2xs">
                <Leaf className="h-3.5 w-3.5 text-emerald-600" />
                <span>{businessCategory === "pharmacy_herbal" ? "Resmi Terdaftar BPOM RI & Bersertifikat Halal" : "Katalog Toko Resmi & Terverifikasi"}</span>
              </div>
              <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-stone-900 tracking-tight [text-wrap:balance]">
                {businessCategory === "pharmacy_herbal" ? "Mitigasi Penyakit Degeneratif & Kualitas Darah 🌿" : storeName}
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed [text-wrap:pretty]">
                {businessCategory === "pharmacy_herbal"
                  ? "Pilihan suplemen fitofarmaka dan ekstrak herbal berkhasiat untuk terapi pendamping Kolesterol Tinggi, Darah Kental, Asam Urat, Diabetes Tipe 2, dan Hipertensi. Transaksi mudah dengan QRIS Dinamis, Transfer Bank, atau GoPay."
                  : (tagline || "Pilihan produk berkualitas dengan transaksi mudah dan aman melalui QRIS Dinamis, Transfer Bank, atau E-Wallet.")}
              </p>
            </div>

            {/* Quality Proof Badges */}
            <div className="flex flex-row lg:flex-col gap-2.5 sm:gap-3 shrink-0">
              <div className="flex items-center gap-2.5 rounded-2xl bg-white/90 border border-stone-200/80 p-3 text-xs font-bold text-stone-900 shadow-2xs flex-1 lg:flex-none">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900">{businessCategory === "pharmacy_herbal" ? "100% BPOM RI" : "100% Asli"}</p>
                  <p className="text-[10px] text-stone-500 font-normal">{businessCategory === "pharmacy_herbal" ? "Bebas BKO" : "Terjamin"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-2xl bg-white/90 border border-stone-200/80 p-3 text-xs font-bold text-stone-900 shadow-2xs flex-1 lg:flex-none">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-500 shrink-0">
                  <Star className="h-4 w-4 fill-amber-400 stroke-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900">⭐ 4.9 / 5.0</p>
                  <p className="text-[10px] text-stone-500 font-normal">Rating Konsumen</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── SEARCH & CATEGORY FILTER ── */}
        <div className="space-y-3">
          {/* Search Box (48px height) */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={terminology.searchPlaceholder || "Cari produk, kategori, atau barcode..."}
              className="w-full h-12 pl-11 pr-12 rounded-2xl border border-stone-200/80 bg-white text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 shadow-2xs focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center text-stone-400 hover:text-stone-700"
                title="Hapus pencarian"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Filter Pills (Horizontal Scroll with 44px min touch target) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`press-tactile shrink-0 min-h-[44px] h-11 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                  selectedCategory === cat
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-white text-stone-600 border border-stone-200/80 hover:bg-stone-50 hover:text-stone-900 hover:border-stone-300"
                }`}
              >
                {getCategoryLabel(cat)}
              </button>
            ))}
          </div>
        </div>

        {/* ── PRODUCT GRID (Adaptive 2-col on mobile, 4-col on desktop) ── */}
        {isLoading ? (
          <div className="flex h-72 flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <span className="text-xs font-bold text-stone-500">
              Menyiapkan {terminology.catalogHeading || "Katalog Produk"}...
            </span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-stone-200 bg-white p-6 text-center">
            <BadgeAlert className="h-10 w-10 text-stone-400 mb-2" />
            <p className="text-sm font-bold text-stone-900">Produk Tidak Ditemukan</p>
            <p className="text-xs text-stone-500 mt-1 max-w-sm">
              Tidak ada produk yang cocok dengan pencarian "{searchQuery}". Silakan coba kata kunci lain atau pilih dari kategori yang tersedia.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 sm:gap-6">
            {filteredProducts.map((product) => {
              const inCartItem = cart.find((i) => i.product.id === product.id)
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  inCartItem={inCartItem}
                  onAddToCart={handleAddToCartWithTrack}
                  onViewDetail={(p) => setSelectedProductDetail(p)}
                  onConsultProduct={handleConsultProduct}
                  formatRupiah={formatRupiah}
                  masterConfig={masterChatConfig}
                />
              )
            })}
          </div>
        )}
      </main>

      {/* ── STICKY BOTTOM FLOATING CART TRAY (Concentric Radius & 44px min touch target) ── */}
      {cart.length > 0 && (
        <div className="sticky bottom-4 z-40 max-w-lg mx-auto w-full px-3 sm:px-4 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center justify-between gap-3 rounded-3xl bg-stone-900/95 p-3 sm:p-4 text-white shadow-xl border border-stone-800 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl bg-emerald-600 text-white font-black text-sm shadow-md">
                <span className="tabular-nums font-mono">{getTotalItems()}</span>
              </div>
              <div>
                <p className="text-[11px] text-stone-400 font-medium leading-none">
                  Total Pesanan
                </p>
                <p className="text-sm sm:text-base font-bold text-amber-300 mt-1 tabular-nums font-mono">
                  {formatRupiah(getSubtotal())}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="press-tactile flex items-center gap-2 min-h-[44px] h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-600 px-4 sm:px-5 text-xs font-bold text-white shadow-md shadow-emerald-700/25 active:scale-95 transition"
            >
              <span>Lihat Keranjang</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer className="mt-12 border-t border-stone-200/80 bg-white py-6 text-center text-xs text-stone-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#181512]">QRIS-POS</span>
            <span>•</span>
            <span>{storeName} • {terminology.catalogHeading || "E-Katalog"}</span>
          </div>
          <p className="text-[11px] text-[#A8A29E]">
            Mendukung Pembayaran QRIS Nasional, Transfer Bank VA (BCA, Mandiri, BRI, BNI), &amp; GoPay
          </p>
        </div>
      </footer>

      {/* ── MODALS & DRAWERS ── */}
      <HerbalDetailModal
        product={selectedProductDetail}
        inCartItem={selectedProductDetail ? cart.find((i) => i.product.id === selectedProductDetail.id) : undefined}
        onClose={() => setSelectedProductDetail(null)}
        onAddToCart={handleAddToCartWithTrack}
        onConsultProduct={handleConsultProduct}
        formatRupiah={formatRupiah}
        masterConfig={masterChatConfig}
      />

      <CustomerCartDrawer
        open={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={handleCheckout}
        isCheckingOut={isCheckingOut}
      />

      <CustomerPaymentModal
        open={isPaymentOpen}
        transactionId={activeTransactionId}
        qrisRefId={activeQrisRefId}
        qrString={activeQrString}
        vaNumber={activeVaNumber}
        totalAmount={completedTotalAmount}
        onPaymentSuccess={handlePaymentSuccess}
        onClose={() => {
          setIsPaymentOpen(false)
          setActiveTransactionId(null)
          setActiveQrisRefId(null)
          setActiveQrString(null)
          setActiveVaNumber(null)
        }}
        onCancelOrder={() => {
          setActiveTransactionId(null)
          setActiveQrisRefId(null)
          setActiveQrString(null)
          setActiveVaNumber(null)
          setCompletedOrderItems([])
          setIsPaymentOpen(false)
        }}
      />

      <CustomerReceiptModal
        open={isReceiptOpen}
        transactionId={activeTransactionId}
        items={completedOrderItems}
        totalAmount={completedTotalAmount}
        customerInfo={customerInfo}
        paymentMethod={selectedPayment}
        onCloseAndReset={() => {
          setIsReceiptOpen(false)
          setActiveTransactionId(null)
          setActiveQrisRefId(null)
          setActiveQrString(null)
          setActiveVaNumber(null)
          setCompletedOrderItems([])
          setCompletedTotalAmount(0)
        }}
      />

      {/* ── FLOATING RAG HERBAL CONSULTANT CHATBOT ── */}
      <CustomerChatbotWidget
        formatRupiah={formatRupiah}
        isCartOpen={isCartOpen}
        productToConsult={productToConsult}
        customPromptOverride={customPromptOverride}
        onClearConsultProduct={handleClearConsultProduct}
        campaignContext={memoizedCampaignContext}
        onFirstEngagement={() => {
          if (activeCampaign) {
            fetch("/.netlify/functions/marketing-track", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                eventType: "chat_engagement",
                campaignId: activeCampaign.id,
                utmCampaign: activeCampaign.utmCampaign,
                utmSource: activeCampaign.utmSource,
              }),
            }).catch(() => {})
          }
        }}
      />
    </div>
  )
}
