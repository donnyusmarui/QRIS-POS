import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import type { Transaction, PaginatedResponse } from "@/types"
import { Receipt, RefreshCw } from "lucide-react"
import { ReceiptModal } from "./ReceiptModal"

export function TransactionsHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await apiFetch<Transaction[]>(`transactions-list?page=${page}&pageSize=20`) as PaginatedResponse<Transaction>
      setTransactions(res.data ?? [])
      setTotalPages(res.pagination?.totalPages ?? 1)
    } catch {
      setTransactions([])
    } finally {
      setIsLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  function handleOpenReceipt(tx: Transaction) {
    setSelectedTx(tx)
    setReceiptOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">Lunas</span>
      case "pending":
        return <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600">Pending</span>
      case "voided":
        return <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-600">Batal</span>
      default:
        return <span>{status}</span>
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Riwayat Transaksi</h1>
          <p className="text-xs text-muted-foreground">Daftar semua transaksi yang pernah dilakukan</p>
        </div>
        <button
          onClick={() => fetchTransactions()}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">ID Transaksi</th>
              <th className="px-4 py-3 text-left font-medium">Waktu</th>
              <th className="px-4 py-3 text-left font-medium">Metode</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Memuat data transaksi...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Belum ada transaksi
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    #{tx.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleString("id-ID", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold uppercase">
                    {tx.paymentMethod}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatRupiah(tx.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getStatusBadge(tx.status)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleOpenReceipt(tx)}
                      className="inline-flex items-center gap-1 rounded p-1.5 text-xs text-primary hover:bg-primary/10"
                      title="Lihat Struk"
                    >
                      <Receipt className="h-4 w-4" />
                      Struk
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Sebelumnya
          </button>
          <span className="text-sm text-muted-foreground">
            Halaman {page} dari {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Berikutnya
          </button>
        </div>
      )}

      {selectedTx && (
        <ReceiptModal
          open={receiptOpen}
          transactionId={selectedTx.id}
          items={(selectedTx.items || []).map((i) => ({
            productId: i.productId,
            productName: i.productName,
            price: i.price,
            quantity: i.quantity,
            stock: 999,
          }))}
          totalAmount={selectedTx.totalAmount}
          paymentMethod={selectedTx.paymentMethod}
          onClose={() => setReceiptOpen(false)}
        />
      )}
    </div>
  )
}
