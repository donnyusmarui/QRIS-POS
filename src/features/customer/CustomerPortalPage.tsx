import { useState, useMemo, useEffect, useCallback } from "react"
import { Link } from "react-router"
import { useCustomerCartStore, type CartItem } from "@/stores/customer-cart-store"
import { CustomerCartDrawer } from "./CustomerCartDrawer"
import { CustomerPaymentModal } from "./CustomerPaymentModal"
import { CustomerReceiptModal } from "./CustomerReceiptModal"
import type { Product } from "@/types"
import {
  QrCode,
  Search,
  X,
  ShoppingBag,
  Sparkles,
  Coffee,
  Utensils,
  Plus,
  Check,
  ChevronRight,
  UserCheck,
  BadgeAlert,
  Loader2,
  Star,
  Clock,
} from "lucide-react"

// ─── Impeccable Product Card Component (Zero CLS + Shimmer + Concentric Radius) ───
function ProductCard({
  product,
  inCartItem,
  onAddToCart,
  formatRupiah,
}: {
  product: Product
  inCartItem?: CartItem
  onAddToCart: (p: Product) => void
  formatRupiah: (n: number) => string
}) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const isOutOfStock = product.stock <= 0

  // Culinary Badges based on product signature
  const getBadge = () => {
    if (product.id === "prod_1") {
      return { text: "Bestseller 🔥", bg: "bg-[#FF5A2B] text-white" }
    }
    if (product.id === "prod_3") {
      return { text: "Chef's Pick ⭐", bg: "bg-amber-600 text-white" }
    }
    if (product.id === "prod_5") {
      return { text: "Artisan Uji 🍵", bg: "bg-emerald-700 text-white" }
    }
    return null
  }
  const badge = getBadge()

  return (
    <div className="group relative flex flex-col justify-between rounded-3xl border border-[#EFECE6] bg-white p-3.5 sm:p-4 shadow-sm hover:shadow-xl hover:shadow-orange-500/10 hover:border-[#FF5A2B]/40 transition-all duration-300">
      <div className="space-y-3">
        {/* ── Outer Image Frame with Concentric Radius & Inset Outline ── */}
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#F6F4EE] ring-1 ring-inset ring-black/10">
          {/* Shimmer Placeholder (Prevents Layout Shift while Image Loads) */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-100 animate-pulse">
              <div className="flex flex-col items-center gap-1.5 text-stone-300">
                {product.category?.toLowerCase().includes("makanan") ? (
                  <Utensils className="h-8 w-8 stroke-[1.5]" />
                ) : (
                  <Coffee className="h-8 w-8 stroke-[1.5]" />
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Memuat...
                </span>
              </div>
            </div>
          )}

          {/* High-Definition Food Photography */}
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              className={`h-full w-full object-cover transition-all duration-500 ease-out group-hover:scale-105 ${
                imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
              }`}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-4 text-[#FF5A2B]/60 text-center">
              {product.category?.toLowerCase().includes("makanan") ? (
                <Utensils className="h-10 w-10 stroke-[1.5]" />
              ) : (
                <Coffee className="h-10 w-10 stroke-[1.5]" />
              )}
              <span className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider mt-1">
                {product.category || "Menu"}
              </span>
            </div>
          )}

          {/* Signature Badge */}
          {badge && (
            <div className="absolute top-2.5 left-2.5 z-10">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-sm ${badge.bg}`}
              >
                {badge.text}
              </span>
            </div>
          )}

          {/* Stock Availability Pill */}
          <div className="absolute bottom-2.5 left-2.5 z-10">
            {isOutOfStock ? (
              <span className="rounded-lg bg-red-600/90 backdrop-blur-xs px-2 py-0.5 text-[9px] font-black text-white uppercase tracking-wider shadow-xs">
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
              <span className="flex items-center gap-1 rounded-full bg-[#FF5A2B] px-2.5 py-0.5 text-[10px] font-black text-white shadow-md">
                <Check className="h-3 w-3 stroke-[3]" />
                <span className="tabular-nums">{inCartItem.quantity}</span>
              </span>
            </div>
          )}
        </div>

        {/* ── Product Information (Culinary Typography) ── */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E]">
              {product.category || "Artisan Menu"}
            </span>
            <span className="text-[9px] font-medium text-stone-400">
              {product.sku}
            </span>
          </div>

          <h3 className="text-xs sm:text-sm font-bold text-[#181512] [text-wrap:balance] line-clamp-2 leading-snug group-hover:text-[#FF5A2B] transition-colors">
            {product.name}
          </h3>

          <div className="pt-0.5">
            <p className="text-sm sm:text-base font-black text-[#FF5A2B] tabular-nums">
              {formatRupiah(product.price)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Action CTA (Tactile Scale Depression) ── */}
      <div className="mt-3.5">
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
            {inCartItem ? `Tambah (${inCartItem.quantity})` : "+ Pesan Menu"}
          </span>
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

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
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

  // Handle Checkout from Drawer
  async function handleCheckout() {
    if (cart.length === 0) return

    try {
      // 1. Create transaction in backend
      const res = await fetch("/.netlify/functions/transactions-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: undefined,
          paymentMethod: selectedPayment,
          notes: `${customerInfo.orderType === "dine_in" ? `[Meja ${customerInfo.tableNumber || "-"}]` : "[Takeaway]"} Pemesan: ${customerInfo.name} (${customerInfo.phone || "No WA"})`,
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

      {/* ── HEADER (Fine Bistro Navigation) ── */}
      <header className="sticky top-0 z-30 bg-[#FBF9F5]/90 backdrop-blur-md border-b border-[#EFECE6]/80 px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Gerai Info */}
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
                  Buka • Resto &amp; Cafe
                </span>
              </div>
              <p className="text-[11px] text-[#78716C] font-medium hidden sm:block">
                Artisan Coffee &amp; Gourmet Bakery
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
        {/* ── RESTAURANT AMBIANCE HERO BANNER ── */}
        <div className="rounded-3xl border border-orange-200/80 bg-gradient-to-r from-[#FFF5EE] via-[#FFF9F3] to-[#FFF1EA] p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-bold text-[#FF5A2B] shadow-2xs">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Customer Self-Ordering &amp; E-Katalog Eksklusif</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-[#181512] tracking-tight [text-wrap:balance]">
                Sensasi Cita Rasa Artisan Segar Setiap Hari ☕🥐
              </h1>
              <p className="text-xs sm:text-sm text-[#78716C] leading-relaxed [text-wrap:pretty]">
                Pesan langsung dari meja Anda atau bawa pulang. Pilih makanan &amp; minuman favorit, lalu lakukan pembayaran instan via <b>QRIS Dinamis</b>, <b>Transfer Bank (Virtual Account)</b>, atau <b>GoPay (Gojek)</b>.
              </p>
            </div>

            {/* Resto Highlights / Social Proof Chips */}
            <div className="flex flex-row lg:flex-col gap-3 shrink-0">
              <div className="flex items-center gap-2.5 rounded-2xl bg-white border border-[#EFECE6] p-3 text-xs font-bold text-[#181512] shadow-2xs">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                  <Star className="h-4 w-4 fill-amber-400 stroke-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-black text-[#181512]">⭐ 4.9 / 5.0</p>
                  <p className="text-[10px] text-[#78716C] font-normal">500+ Ulasan Puas</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-2xl bg-white border border-[#EFECE6] p-3 text-xs font-bold text-[#181512] shadow-2xs">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-[#181512]">5 - 10 Menit</p>
                  <p className="text-[10px] text-[#78716C] font-normal">Estimasi Penyajian</p>
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
              placeholder="Cari menu kopi, croissant, atau minuman favorit..."
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
                {cat === "all" ? "Semua Menu 🍽️" : cat === "Minuman" ? "Minuman & Kopi ☕" : cat === "Makanan" ? "Makanan & Pastry 🥐" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* ── MENU PRODUCT GRID ── */}
        {isLoading ? (
          <div className="flex h-72 flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF5A2B]" />
            <span className="text-xs font-bold text-[#78716C]">
              Menyiapkan Katalog Restoran...
            </span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-[#EFECE6] bg-white p-6 text-center">
            <BadgeAlert className="h-10 w-10 text-[#A8A29E] mb-2" />
            <p className="text-sm font-bold text-[#181512]">Menu Tidak Ditemukan</p>
            <p className="text-xs text-[#78716C] mt-1 max-w-sm">
              Tidak ada produk yang cocok dengan pencarian "{searchQuery}". Silakan coba kata kunci lain.
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
                  Total Pesanan
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
            <span>Artisan Resto &amp; Cafe E-Katalog</span>
          </div>
          <p className="text-[11px] text-[#A8A29E]">
            Mendukung Pembayaran QRIS Nasional, Transfer Bank VA (BCA, Mandiri, BRI, BNI), &amp; GoPay
          </p>
        </div>
      </footer>

      {/* ── MODALS & DRAWERS ── */}
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
    </div>
  )
}
