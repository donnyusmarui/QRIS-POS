import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { useCustomerCartStore } from "@/stores/customer-cart-store"
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
  Flame,
  BadgeAlert,
  Loader2,
} from "lucide-react"

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

  // Fetch active products from backend
  const {
    data: productsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["customer-products"],
    queryFn: async () => {
      const res = await fetch("/.netlify/functions/products-list?pageSize=100")
      const json = await res.json()
      return (json.data?.items || json.data || []) as Product[]
    },
  })

  const products = productsData || []

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
          paymentMethod: selectedPayment,
          items: cart.map((i) => ({
            productId: i.product.id,
            productName: i.product.name,
            price: i.product.price,
            quantity: i.quantity,
          })),
          notes: `${customerInfo.orderType === "dine_in" ? `[Meja ${customerInfo.tableNumber}]` : "[Takeaway]"} Pemesan: ${customerInfo.name} ${customerInfo.phone ? `(${customerInfo.phone})` : ""}`,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        const txData = json.data
        setActiveTransactionId(txData.transactionId)
        setActiveQrisRefId(txData.qrisRefId)
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
    refetch() // Refresh product stock
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#181512] flex flex-col justify-between selection:bg-[#FF5A2B]/20 selection:text-[#FF5A2B]">
      {/* ── TOP HERO WASH ── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-[#FFEAA0] via-[#FFF8D6]/60 to-transparent" />

      {/* ── HEADER ── */}
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
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Buka
                </span>
              </div>
              <p className="text-[11px] text-[#78716C] font-medium hidden sm:block">
                Customer Self-Ordering &amp; E-Katalog
              </p>
            </div>
          </div>

          {/* Right Header Navigation & Staff Portal Link */}
          <div className="flex items-center gap-2.5">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#EFECE6] bg-white px-3 py-2 text-xs font-bold text-[#78716C] shadow-2xs hover:border-[#FF5A2B] hover:text-[#FF5A2B] transition"
              title="Akses Kasir & Manajemen Toko"
            >
              <UserCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Portal Kasir / Staff</span>
            </Link>

            {/* Cart Button */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="press-tactile relative flex h-10 items-center gap-2 rounded-xl bg-[#FF5A2B] px-3.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:bg-[#E5481B] transition"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Keranjang</span>
              {getTotalItems() > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-black text-[#FF5A2B]">
                  {getTotalItems()}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-4 sm:px-8 py-6 space-y-6">
        {/* Welcome Banner */}
        <div className="rounded-3xl border border-orange-200/80 bg-gradient-to-r from-[#FFF5EE] via-[#FFF9F3] to-[#FFF1EA] p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-lg">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-white px-3 py-0.5 text-xs font-bold text-[#FF5A2B] shadow-2xs">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Pesan Mandiri &amp; Pembayaran Instan</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#181512] tracking-tight">
                Mau Menikmati Apa Hari Ini? ☕🥐
              </h1>
              <p className="text-xs text-[#78716C] leading-relaxed">
                Pilih menu favorit Anda, tentukan makan di tempat atau bawa pulang, lalu bayar cepat melalui <b>QRIS</b>, <b>Transfer Bank</b>, atau <b>GoPay (Gojek)</b>.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-2 rounded-2xl bg-white border border-[#EFECE6] p-3 text-xs font-bold text-[#181512] shadow-2xs">
                <Flame className="h-4 w-4 text-orange-500" />
                <span>Pesanan Siap dalam 5-10 Menit</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── SEARCH & CATEGORY BAR ── */}
        <div className="space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8A29E]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari makanan, kopi, atau minuman favorit..."
              className="w-full h-11 pl-10 pr-9 rounded-2xl border border-[#EFECE6] bg-white text-xs font-medium text-[#181512] placeholder:text-[#A8A29E] shadow-2xs focus:border-[#FF5A2B] focus:outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#181512]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Filter Pills (Horizontal Scroll) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`press-tactile shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  selectedCategory === cat
                    ? "bg-[#FF5A2B] text-white shadow-sm shadow-orange-500/25"
                    : "bg-white text-[#78716C] border border-[#EFECE6] hover:bg-black/5 hover:text-[#181512]"
                }`}
              >
                {cat === "all" ? "Semua Menu" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* ── MENU PRODUCT GRID ── */}
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF5A2B]" />
            <span className="text-xs font-bold text-[#78716C]">Memuat Katalog Menu...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-[#EFECE6] bg-white p-6 text-center">
            <BadgeAlert className="h-10 w-10 text-[#A8A29E] mb-2" />
            <p className="text-sm font-bold text-[#181512]">Menu Tidak Ditemukan</p>
            <p className="text-xs text-[#78716C] mt-1 max-w-sm">
              Tidak ada produk yang cocok dengan pencarian "{searchQuery}". Coba kata kunci lainnya.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {filteredProducts.map((product) => {
              const inCartItem = cart.find((i) => i.product.id === product.id)
              const isOutOfStock = product.stock <= 0

              return (
                <div
                  key={product.id}
                  className="group relative flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-[#EFECE6] bg-white p-3 sm:p-4 shadow-jeruk-card hover:border-[#FF5A2B]/40 hover:shadow-jeruk-lg transition-all duration-200"
                >
                  <div className="space-y-3">
                    {/* Food Photo / Visual Avatar */}
                    <div className="relative aspect-square w-full rounded-xl sm:rounded-2xl bg-[#FFFBF0] border border-amber-100/70 overflow-hidden flex items-center justify-center">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-[#FF5A2B]/60 p-4 text-center">
                          {product.category?.toLowerCase().includes("minuman") ||
                          product.category?.toLowerCase().includes("kopi") ? (
                            <Coffee className="h-12 w-12 stroke-[1.5]" />
                          ) : (
                            <Utensils className="h-12 w-12 stroke-[1.5]" />
                          )}
                          <span className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider mt-1">
                            {product.category || "Menu"}
                          </span>
                        </div>
                      )}

                      {/* Stock Badge */}
                      <div className="absolute top-2 left-2">
                        {isOutOfStock ? (
                          <span className="rounded-lg bg-red-500/90 backdrop-blur-xs px-2 py-0.5 text-[9px] font-black text-white uppercase tracking-wider">
                            Habis
                          </span>
                        ) : (
                          <span className="rounded-lg bg-[#181512]/75 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold text-white">
                            Sisa {product.stock}
                          </span>
                        )}
                      </div>

                      {/* In-Cart Counter Pill */}
                      {inCartItem && (
                        <div className="absolute top-2 right-2">
                          <span className="flex items-center gap-1 rounded-lg bg-[#FF5A2B] px-2 py-0.5 text-[10px] font-black text-white shadow-xs">
                            <Check className="h-3 w-3" />
                            {inCartItem.quantity}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Information */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E]">
                        {product.sku}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-[#181512] line-clamp-2 leading-snug mt-0.5">
                        {product.name}
                      </h3>
                      <p className="text-xs sm:text-sm font-black text-[#FF5A2B] mt-1.5">
                        {formatRupiah(product.price)}
                      </p>
                    </div>
                  </div>

                  {/* Add Button */}
                  <div className="mt-3">
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => addToCart(product)}
                      className={`press-tactile flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs font-bold transition shadow-xs ${
                        isOutOfStock
                          ? "bg-black/5 text-[#A8A29E] cursor-not-allowed"
                          : inCartItem
                          ? "bg-[#FFF2ED] text-[#FF5A2B] border border-orange-200 hover:bg-[#FFE6DC]"
                          : "bg-[#FF5A2B] text-white shadow-orange-500/20 hover:bg-[#E5481B]"
                      }`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{inCartItem ? `Tambah (${inCartItem.quantity})` : "+ Tambah"}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* ── STICKY BOTTOM FLOATING CART TRAY (Mobile & Desktop) ── */}
      {cart.length > 0 && (
        <div className="sticky bottom-4 z-40 max-w-lg mx-auto w-full px-4 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#181512] p-3.5 text-white shadow-2xl border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF5A2B] text-white font-black text-sm">
                {getTotalItems()}
              </div>
              <div>
                <p className="text-[11px] text-[#A8A29E] font-medium leading-none">Total Belanja</p>
                <p className="text-sm font-black text-white mt-1">
                  {formatRupiah(getSubtotal())}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="press-tactile flex items-center gap-1.5 rounded-xl bg-[#FF5A2B] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/30 hover:bg-[#E5481B] transition"
            >
              <span>Lihat &amp; Bayar</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer className="mt-8 border-t border-[#EFECE6] bg-white py-6 text-center text-xs text-[#78716C]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#181512]">QRIS-POS</span>
            <span>•</span>
            <span>Customer Self-Ordering Portal</span>
          </div>
          <p className="text-[11px] text-[#A8A29E]">
            Mendukung Pembayaran QRIS Nasional, Transfer Bank VA, &amp; GoPay
          </p>
        </div>
      </footer>

      {/* ── MODALS / DRAWERS ── */}
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
