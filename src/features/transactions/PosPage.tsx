import { useState, useEffect, useCallback } from "react"
import { useCartStore } from "@/stores/cart-store"
import { apiFetch } from "@/lib/api"
import type { Product, Customer, PaymentMethod } from "@/types"
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  Loader2,
} from "lucide-react"
import { QrisModal } from "./QrisModal"
import { ReceiptModal } from "./ReceiptModal"

export function PosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [cashGiven, setCashGiven] = useState<number>(0)
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  // Modals state
  const [qrisOpen, setQrisOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null)
  const [activeQrisRef, setActiveQrisRef] = useState<string | null>(null)
  const [completedItems, setCompletedItems] = useState<any[]>([])
  const [completedTotal, setCompletedTotal] = useState(0)

  const { items, addItem, removeItem, updateQuantity, clearCart, totalAmount } =
    useCartStore()

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

  const fetchProducts = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await apiFetch<Product[]>("products-list?pageSize=100")
      setProducts(res.data ?? [])
    } catch {
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await apiFetch<Customer[]>("customers-list?pageSize=50")
      setCustomers(res.data ?? [])
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchProducts()
    fetchCustomers()
  }, [fetchProducts, fetchCustomers])

  const categories = ["all", ...new Set(products.map((p) => p.category).filter(Boolean) as string[])]

  const filteredProducts = products.filter((p) => {
    const matchCategory = selectedCategory === "all" || p.category === selectedCategory
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    return matchCategory && matchSearch
  })

  const total = totalAmount()

  async function handleCheckout() {
    if (items.length === 0) return
    if (paymentMethod === "cash" && cashGiven < total) {
      alert("Jumlah uang tunai kurang dari total pembayaran!")
      return
    }

    setIsCheckingOut(true)
    try {
      const payload = {
        customerId: selectedCustomerId || undefined,
        paymentMethod,
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          price: i.price,
          quantity: i.quantity,
        })),
      }

      const res = await apiFetch<{
        transactionId: string
        status: string
        totalAmount: number
        qrisRefId: string | null
        paymentMethod: string
      }>("transactions-create", {
        method: "POST",
        body: JSON.stringify(payload),
      })

      if (res.data) {
        setActiveTransactionId(res.data.transactionId)
        setActiveQrisRef(res.data.qrisRefId)
        setCompletedItems([...items])
        setCompletedTotal(total)

        if (paymentMethod === "qris") {
          setQrisOpen(true)
        } else {
          clearCart()
          setCashGiven(0)
          setReceiptOpen(true)
          fetchProducts() // refresh stock
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memproses transaksi")
    } finally {
      setIsCheckingOut(false)
    }
  }

  function handleQrisSuccess() {
    setQrisOpen(false)
    clearCart()
    setReceiptOpen(true)
    fetchProducts() // refresh stock
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4 lg:flex-row">
      {/* Product Catalog Section */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card p-4">
        {/* Search & Category Filter */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk atau SKU..."
              className="flex h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat === "all" ? "Semua" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Memuat katalog produk...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Tidak ada produk yang cocok
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock <= 0
                return (
                  <button
                    key={p.id}
                    onClick={() => addItem(p)}
                    disabled={isOutOfStock}
                    className="flex flex-col justify-between rounded-xl border bg-background p-3 text-left transition hover:border-primary hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase">
                        {p.category ?? "Umum"}
                      </span>
                      <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
                        {p.name}
                      </h3>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t pt-2">
                      <span className="text-xs font-bold text-primary">
                        {formatRupiah(p.price)}
                      </span>
                      <span
                        className={`text-[10px] font-medium ${
                          p.stock <= 5 ? "text-destructive font-bold" : "text-muted-foreground"
                        }`}
                      >
                        Stok: {p.stock}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart & Checkout Panel */}
      <div className="flex w-full flex-col justify-between rounded-xl border bg-card p-4 lg:w-96">
        <div>
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-base">Keranjang Kasir</h2>
            </div>
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-destructive hover:underline"
              >
                Reset
              </button>
            )}
          </div>

          {/* Customer Selection */}
          <div className="mt-3">
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">-- Pembeli Umum (Walk-in) --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Cart Items List */}
          <div className="mt-3 max-h-[30vh] overflow-y-auto space-y-2 lg:max-h-[38vh]">
            {items.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Keranjang masih kosong. Klik produk di katalog untuk menambahkan.
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between rounded-lg border bg-background p-2.5"
                >
                  <div className="flex-1 pr-2">
                    <p className="text-xs font-semibold line-clamp-1">{item.productName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatRupiah(item.price)} x {item.quantity} ={" "}
                      <span className="font-semibold text-foreground">
                        {formatRupiah(item.price * item.quantity)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="rounded border p-1 hover:bg-muted"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-bold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => addItem({ id: item.productId, name: item.productName, price: item.price, stock: item.stock } as Product)}
                      disabled={item.quantity >= item.stock}
                      className="rounded border p-1 hover:bg-muted disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="rounded p-1 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="border-t pt-3 space-y-3">
          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Metode Pembayaran</label>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs font-medium transition ${
                  paymentMethod === "cash"
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "hover:bg-muted"
                }`}
              >
                <Banknote className="h-4 w-4" />
                Tunai
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("qris")}
                className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs font-medium transition ${
                  paymentMethod === "qris"
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "hover:bg-muted"
                }`}
              >
                <QrCode className="h-4 w-4" />
                QRIS
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("transfer")}
                className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs font-medium transition ${
                  paymentMethod === "transfer"
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "hover:bg-muted"
                }`}
              >
                <CreditCard className="h-4 w-4" />
                Transfer
              </button>
            </div>
          </div>

          {/* Cash input if method is cash */}
          {paymentMethod === "cash" && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Uang Diterima:</span>
                <span className="font-semibold">{formatRupiah(cashGiven)}</span>
              </div>
              <input
                type="number"
                min={total}
                value={cashGiven || ""}
                onChange={(e) => setCashGiven(Number(e.target.value))}
                placeholder={`Min ${total}`}
                className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {cashGiven >= total && (
                <div className="flex justify-between text-xs font-semibold text-emerald-600">
                  <span>Kembalian:</span>
                  <span>{formatRupiah(cashGiven - total)}</span>
                </div>
              )}
            </div>
          )}

          {/* Total & Checkout Button */}
          <div className="flex items-center justify-between border-t pt-2">
            <div>
              <p className="text-xs text-muted-foreground">Total Pembayaran</p>
              <p className="text-xl font-bold text-primary">{formatRupiah(total)}</p>
            </div>
            <button
              onClick={handleCheckout}
              disabled={items.length === 0 || isCheckingOut || (paymentMethod === "cash" && cashGiven < total)}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCheckingOut && <Loader2 className="h-4 w-4 animate-spin" />}
              {isCheckingOut ? "Memproses..." : "Bayar Sekarang"}
            </button>
          </div>
        </div>
      </div>

      {/* QRIS Modal */}
      <QrisModal
        open={qrisOpen}
        totalAmount={completedTotal}
        qrisRefId={activeQrisRef}
        transactionId={activeTransactionId}
        onSuccess={handleQrisSuccess}
        onClose={() => setQrisOpen(false)}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        open={receiptOpen}
        transactionId={activeTransactionId}
        items={completedItems}
        totalAmount={completedTotal}
        paymentMethod={paymentMethod}
        cashGiven={cashGiven}
        onClose={() => setReceiptOpen(false)}
      />
    </div>
  )
}
