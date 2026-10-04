import { useState, useMemo, useEffect, useCallback } from "react"
import { Link } from "react-router"
import { useCustomerCartStore, type CartItem } from "@/stores/customer-cart-store"
import { CustomerCartDrawer } from "./CustomerCartDrawer"
import { CustomerPaymentModal } from "./CustomerPaymentModal"
import { CustomerReceiptModal } from "./CustomerReceiptModal"
import { CustomerChatbotWidget } from "./CustomerChatbotWidget"
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
} from "lucide-react"

// ─── Modal Detail Khasiat & Legalitas Herbal ───
function HerbalDetailModal({
  product,
  onClose,
  onAddToCart,
  onConsultProduct,
  formatRupiah,
}: {
  product: Product | null
  onClose: () => void
  onAddToCart: (p: Product) => void
  onConsultProduct: (p: Product) => void
  formatRupiah: (n: number) => string
}) {
  if (!product) return null
  const isOutOfStock = product.stock <= 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-[#EFECE6] bg-white p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
          aria-label="Tutup"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <div className="relative w-full sm:w-44 aspect-square rounded-2xl overflow-hidden bg-stone-100 ring-1 ring-black/10 shrink-0">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-emerald-600">
                <Leaf className="h-12 w-12" />
              </div>
            )}
            <span className="absolute top-2 left-2 rounded-full bg-emerald-600/95 text-white text-[9px] font-black px-2.5 py-0.5 shadow-sm flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> BPOM Resmi
            </span>
          </div>

          <div className="space-y-2 flex-1">
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
              {product.category || "Herbal Alami"}
            </span>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 leading-snug">
              {product.name}
            </h2>
            <p className="text-xs font-mono text-stone-400">SKU: {product.sku}</p>
            <p className="text-lg font-bold text-[#FF5A2B] tabular-nums">
              {formatRupiah(product.price)}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3.5 border-t border-[#EFECE6] pt-4">
          <div>
            <h4 className="text-xs font-bold text-[#181512] flex items-center gap-1.5 uppercase tracking-wider text-[#A8A29E]">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Informasi Khasiat &amp; Legalitas BPOM
            </h4>
            <div className="mt-2 rounded-2xl bg-[#FDFBF7] border border-[#EFECE6] p-4 text-xs text-[#57534E] leading-relaxed">
              {product.description || "Suplemen herbal alami berizin resmi BPOM RI untuk mitigasi gangguan sirkulasi darah dan penyakit degeneratif."}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[#78716C] bg-stone-50 p-3 rounded-xl border border-stone-200/60">
            <span>Status Ketersediaan:</span>
            <span className={`font-bold ${isOutOfStock ? "text-red-600" : "text-emerald-700"}`}>
              {isOutOfStock ? "Stok Habis" : `Tersedia (${product.stock} kemasan)`}
            </span>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => {
                onClose()
                onConsultProduct(product)
              }}
              className="py-3 px-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Bot className="h-4 w-4 text-emerald-700" />
              <span>Tanya Apoteker Khasiat Produk Ini</span>
            </button>
            <div className="flex gap-2 flex-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-3 rounded-xl border border-[#EFECE6] text-xs font-bold text-[#78716C] hover:bg-stone-100 transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={isOutOfStock}
                onClick={() => {
                  onAddToCart(product)
                  onClose()
                }}
                className="flex-1 py-3 px-3 rounded-xl bg-[#FF5A2B] text-white text-xs font-bold shadow-md shadow-orange-500/25 hover:bg-[#E5481B] disabled:opacity-50 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>+ Beli</span>
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
}: {
  product: Product
  inCartItem?: CartItem
  onAddToCart: (p: Product) => void
  onViewDetail: (p: Product) => void
  onConsultProduct: (p: Product) => void
  formatRupiah: (n: number) => string
}) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const isOutOfStock = product.stock <= 0

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
    return { text: "Herbal Alami 🌿", bg: "bg-emerald-800 text-white" }
  }
  const badge = getCategoryBadge()

  return (
    <div className="group relative flex flex-col justify-between rounded-3xl border border-[#EFECE6] bg-white p-3.5 sm:p-4 shadow-sm hover:shadow-xl hover:shadow-orange-500/10 hover:border-[#FF5A2B]/40 transition-all duration-300">
      <div className="space-y-3">
        {/* ── Outer Image Frame with Concentric Radius & Inset Outline ── */}
        <div 
          onClick={() => onViewDetail(product)}
          className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#F6F4EE] ring-1 ring-inset ring-black/10 cursor-pointer"
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
              className={`h-full w-full object-cover transition-all duration-500 ease-out group-hover:scale-105 ${
                imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
              }`}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-4 text-emerald-700/60 text-center">
              <Leaf className="h-10 w-10 stroke-[1.5]" />
              <span className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider mt-1">
                {product.category || "Herbal Alami"}
              </span>
            </div>
          )}

          {/* Official Verification Badges */}
          <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
            <span className="rounded-full bg-emerald-600/95 backdrop-blur-xs px-2.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-white shadow-sm flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> BPOM RI ✅
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold shadow-xs ${badge.bg}`}>
              {badge.text}
            </span>
          </div>

          {/* Stock Availability Pill */}
          <div className="absolute bottom-2.5 left-2.5 z-10">
            {isOutOfStock ? (
              <span className="rounded-lg bg-red-600/90 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider shadow-xs">
                Habis
              </span>
            ) : (
              <span className="rounded-lg bg-[#181512]/80 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold text-white tabular-nums shadow-xs">
                Sisa {product.stock}
              </span>
            )}
          </div>

          {/* In-Cart Counter Indicator */}
          {inCartItem && (
            <div className="absolute top-2.5 right-2.5 z-10">
              <span className="flex items-center gap-1 rounded-full bg-[#FF5A2B] px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md">
                <Check className="h-3 w-3 stroke-[2.5]" />
                <span className="tabular-nums">{inCartItem.quantity}</span>
              </span>
            </div>
          )}
        </div>

        {/* ── Product Information ── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 truncate max-w-[130px]">
              {product.category || "Herbal Terstandar"}
            </span>
            <span className="text-[9px] font-mono text-stone-400 shrink-0">
              {product.sku}
            </span>
          </div>

          <h3 
            onClick={() => onViewDetail(product)}
            className="text-xs sm:text-sm font-semibold text-stone-900 [text-wrap:balance] line-clamp-2 leading-snug group-hover:text-[#FF5A2B] transition-colors cursor-pointer"
          >
            {product.name}
          </h3>

          {/* Clinical description snippet */}
          {product.description && (
            <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed [text-wrap:pretty]">
              {product.description}
            </p>
          )}

          <div className="pt-1 flex items-center justify-between">
            <p className="text-sm sm:text-base font-bold text-[#FF5A2B] tabular-nums">
              {formatRupiah(product.price)}
            </p>
            <button
              type="button"
              onClick={() => onViewDetail(product)}
              className="text-[10px] font-semibold text-stone-500 hover:text-[#FF5A2B] inline-flex items-center gap-0.5 transition"
            >
              <Info className="h-3 w-3" />
              <span>Detail</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Action CTA ── */}
      <div className="mt-3.5 space-y-1.5">
        <button
          type="button"
          disabled={isOutOfStock}
          onClick={() => onAddToCart(product)}
          className={`press-tactile flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs font-bold transition-all shadow-xs active:scale-95 ${
            isOutOfStock
              ? "bg-stone-100 text-[#A8A29E] cursor-not-allowed"
              : inCartItem
              ? "bg-[#FFF2ED] text-[#FF5A2B] border border-orange-200 hover:bg-[#FFE6DC]"
              : "bg-[#FF5A2B] text-white shadow-orange-500/20 hover:bg-[#E5481B]"
          }`}
        >
          <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
          <span>
            {inCartItem ? `Tambah (${inCartItem.quantity})` : "+ Beli Herbal"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onConsultProduct(product)}
          title={`Konsultasi Apoteker seputar khasiat ${product.name}`}
          className="press-tactile flex w-full items-center justify-center gap-1.5 rounded-xl py-2 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] sm:text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
        >
          <Bot className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>Tanya Khasiat ke Apoteker</span>
        </button>
      </div>
    </div>
  )
}

// ─── Master Customer Portal Page ───
export function CustomerPortalPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null)
  const [productToConsult, setProductToConsult] = useState<Product | null>(null)

  const handleConsultProduct = useCallback((product: Product) => {
    setIsCartOpen(false)
    setProductToConsult(product)
  }, [])

  // Current active transaction state
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null)
  const [activeQrisRefId, setActiveQrisRefId] = useState<string | null>(null)
  const [completedOrderItems, setCompletedOrderItems] = useState<any[]>([])
  const [completedTotalAmount, setCompletedTotalAmount] = useState(0)

  const {
    cart,
    addToCart,
    getTotalItems,
    getSubtotal,
    customerInfo,
    selectedPayment,
    clearCart,
  } = useCustomerCartStore()

  // State & fetch for active products
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
    if (cat === "all") return "Semua Herbal 🌿"
    if (cat.includes("Kolesterol")) return "Kolesterol & Jantung 🫀"
    if (cat.includes("Darah Kental")) return "Darah Kental & Sirkulasi 🩸"
    if (cat.includes("Asam Urat")) return "Asam Urat & Sendi 🦶"
    if (cat.includes("Diabetes")) return "Diabetes & Gula Darah 🍬"
    if (cat.includes("Hipertensi")) return "Hipertensi & Tensi 💓"
    return cat
  }

  // Handle Checkout from Drawer
  async function handleCheckout() {
    if (cart.length === 0) return

    try {
      const res = await fetch("/.netlify/functions/transactions-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: undefined,
          paymentMethod: selectedPayment,
          notes: `${customerInfo.orderType === "dine_in" ? `[Ambil di Apotek / Meja ${customerInfo.tableNumber || "-"}]` : "[Bawa Pulang / Kirim]"} Pemesan: ${customerInfo.name} (${customerInfo.phone || "No WA"})`,
          items: cart.map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
          })),
        }),
      })

      const json = await res.json()

      if (json.success && json.data) {
        setActiveTransactionId(json.data.transactionId)
        setActiveQrisRefId(json.data.qrisRefId)
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
    }
  }

  // Handle Payment Success
  function handlePaymentSuccess() {
    setIsPaymentOpen(false)
    setIsReceiptOpen(true)
    clearCart()
    fetchProducts() // Refresh product stock
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#181512] flex flex-col justify-between selection:bg-[#FF5A2B]/20 selection:text-[#FF5A2B]">
      {/* ── TOP HERO WASH ── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-[#FFEAA0]/80 via-[#FFF8D6]/40 to-transparent" />

      {/* ── HEADER (Apotek Herbal Navigation) ── */}
      <header className="sticky top-0 z-30 bg-[#FBF9F5]/90 backdrop-blur-md border-b border-[#EFECE6]/80 px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Info Apotek */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FF5A2B] text-white shadow-md shadow-orange-500/25">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-[#181512]">
                  QRIS-POS
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Buka • Apotek Herbal Medika
                </span>
              </div>
              <p className="text-[11px] text-[#78716C] font-medium hidden sm:block">
                Katalog Resep Alami Terstandar BPOM &amp; Halal
              </p>
            </div>
          </div>

          {/* Right Header Navigation & Staff Portal Link */}
          <div className="flex items-center gap-2.5">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#EFECE6] bg-white px-3.5 py-2 text-xs font-bold text-[#78716C] shadow-2xs hover:border-[#FF5A2B] hover:text-[#FF5A2B] transition"
              title="Akses Kasir & Manajemen Toko"
            >
              <UserCheck className="h-4 w-4 text-[#FF5A2B]" />
              <span className="hidden sm:inline">Portal Kasir / Staff</span>
            </Link>

            {/* Cart Header Button */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="press-tactile relative flex h-10 items-center gap-2 rounded-xl bg-[#FF5A2B] px-4 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:bg-[#E5481B] active:scale-95 transition"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Keranjang</span>
              {getTotalItems() > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-black text-[#FF5A2B] tabular-nums">
                  {getTotalItems()}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT WORKSPACE ── */}
      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-4 sm:px-8 py-6 space-y-7">
        {/* ── APOTEK HERBAL HERO BANNER ── */}
        <div className="rounded-3xl border border-orange-200/80 bg-gradient-to-r from-[#FFF5EE] via-[#FFF9F3] to-[#FFF1EA] p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs font-bold text-emerald-800 shadow-2xs">
                <Leaf className="h-3.5 w-3.5 text-emerald-600" />
                <span>Resmi Terdaftar BPOM &amp; Bersertifikat Halal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-900 tracking-tight [text-wrap:balance]">
                Mitigasi Penyakit Degeneratif &amp; Kualitas Darah 🌿
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed [text-wrap:pretty]">
                Pilihan suplemen fitofarmaka dan ekstrak herbal berkhasiat untuk terapi pendamping <b>Kolesterol Tinggi</b>, <b>Darah Kental</b>, <b>Asam Urat</b>, <b>Diabetes Tipe 2</b>, dan <b>Hipertensi</b>. Transaksi mudah dengan <b>QRIS Dinamis</b>, <b>Transfer Bank</b>, atau <b>GoPay</b>.
              </p>
            </div>

            {/* Quality Proof Badges */}
            <div className="flex flex-row lg:flex-col gap-3 shrink-0">
              <div className="flex items-center gap-2.5 rounded-2xl bg-white border border-[#EFECE6] p-3 text-xs font-bold text-stone-900 shadow-2xs">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900">100% BPOM RI</p>
                  <p className="text-[10px] text-stone-500 font-normal">Bebas Bahan Kimia Obat</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-2xl bg-white border border-[#EFECE6] p-3 text-xs font-bold text-stone-900 shadow-2xs">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                  <Star className="h-4 w-4 fill-amber-400 stroke-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900">⭐ 4.9 / 5.0</p>
                  <p className="text-[10px] text-stone-500 font-normal">Rating Konsumen Puas</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── SEARCH & CATEGORY FILTER ── */}
        <div className="space-y-3.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8A29E]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari produk herbal, no. BPOM, atau keluhan (kolesterol, asam urat, tensi, kram, gula)..."
              className="w-full h-12 pl-11 pr-10 rounded-2xl border border-[#EFECE6] bg-white text-xs sm:text-sm font-medium text-[#181512] placeholder:text-[#A8A29E] shadow-2xs focus:border-[#FF5A2B] focus:outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#181512] p-1"
                title="Hapus pencarian"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Filter Pills (Horizontal Scroll) */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`press-tactile shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === cat
                    ? "bg-[#FF5A2B] text-white shadow-sm shadow-orange-500/25"
                    : "bg-white text-[#78716C] border border-[#EFECE6] hover:bg-stone-50 hover:text-[#181512]"
                }`}
              >
                {getCategoryLabel(cat)}
              </button>
            ))}
          </div>
        </div>

        {/* ── HERBAL PRODUCT GRID ── */}
        {isLoading ? (
          <div className="flex h-72 flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF5A2B]" />
            <span className="text-xs font-bold text-[#78716C]">
              Menyiapkan Katalog Apotek Herbal...
            </span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-[#EFECE6] bg-white p-6 text-center">
            <BadgeAlert className="h-10 w-10 text-[#A8A29E] mb-2" />
            <p className="text-sm font-bold text-[#181512]">Produk Herbal Tidak Ditemukan</p>
            <p className="text-xs text-[#78716C] mt-1 max-w-sm">
              Tidak ada produk yang cocok dengan pencarian "{searchQuery}". Coba gunakan kata kunci gejala seperti "asam urat", "kolesterol", "tensi", atau "gula darah".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product) => {
              const inCartItem = cart.find((i) => i.product.id === product.id)
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  inCartItem={inCartItem}
                  onAddToCart={addToCart}
                  onViewDetail={(p) => setSelectedProductDetail(p)}
                  onConsultProduct={handleConsultProduct}
                  formatRupiah={formatRupiah}
                />
              )
            })}
          </div>
        )}
      </main>

      {/* ── STICKY BOTTOM FLOATING CART TRAY (Mobile & Desktop) ── */}
      {cart.length > 0 && (
        <div className="sticky bottom-4 z-40 max-w-lg mx-auto w-full px-4 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center justify-between gap-3 rounded-3xl bg-[#181512]/95 p-3.5 sm:p-4 text-white shadow-2xl border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FF5A2B] text-white font-black text-sm shadow-md">
                <span className="tabular-nums">{getTotalItems()}</span>
              </div>
              <div>
                <p className="text-[11px] text-stone-400 font-medium leading-none">
                  Total Pesanan Herbal
                </p>
                <p className="text-sm sm:text-base font-black text-white mt-1 tabular-nums">
                  {formatRupiah(getSubtotal())}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="press-tactile flex items-center gap-2 rounded-2xl bg-[#FF5A2B] px-4 sm:px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/30 hover:bg-[#E5481B] active:scale-95 transition"
            >
              <span>Lihat Keranjang</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer className="mt-12 border-t border-[#EFECE6] bg-white py-6 text-center text-xs text-[#78716C]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#181512]">QRIS-POS</span>
            <span>•</span>
            <span>Apotek &amp; Resep Herbal Medika E-Katalog</span>
          </div>
          <p className="text-[11px] text-[#A8A29E]">
            Mendukung Pembayaran QRIS Nasional, Transfer Bank VA (BCA, Mandiri, BRI, BNI), &amp; GoPay
          </p>
        </div>
      </footer>

      {/* ── MODALS & DRAWERS ── */}
      <HerbalDetailModal
        product={selectedProductDetail}
        onClose={() => setSelectedProductDetail(null)}
        onAddToCart={addToCart}
        onConsultProduct={handleConsultProduct}
        formatRupiah={formatRupiah}
      />

      <CustomerCartDrawer
        open={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={handleCheckout}
      />

      <CustomerPaymentModal
        open={isPaymentOpen}
        transactionId={activeTransactionId}
        qrisRefId={activeQrisRefId}
        totalAmount={completedTotalAmount}
        onPaymentSuccess={handlePaymentSuccess}
        onClose={() => setIsPaymentOpen(false)}
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
        }}
      />

      {/* ── FLOATING RAG HERBAL CONSULTANT CHATBOT ── */}
      <CustomerChatbotWidget
        formatRupiah={formatRupiah}
        isCartOpen={isCartOpen}
        productToConsult={productToConsult}
        onClearConsultProduct={() => setProductToConsult(null)}
      />
    </div>
  )
}
