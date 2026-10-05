import { useEffect, Component, type ReactNode } from "react"
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router"
import { ShieldAlert, ArrowLeft, RefreshCw } from "lucide-react"
import { useAuthStore } from "@/stores/auth-store"
import { ProtectedRoute } from "@/components/layout/ProtectedRoute"
import { AppLayout } from "@/components/layout/AppLayout"
import { RoleGuard } from "@/components/layout/RoleGuard"
import { LoginPage } from "@/features/auth/LoginPage"
import { DashboardPage } from "@/features/dashboard/DashboardPage"
import { ProductsPage } from "@/features/products/ProductsPage"
import { PosPage } from "@/features/transactions/PosPage"
import { TransactionsHistoryPage } from "@/features/transactions/TransactionsHistoryPage"
import { InventoryPage } from "@/features/inventory/InventoryPage"
import { CustomersPage } from "@/features/customers/CustomersPage"
import { ReportsPage } from "@/features/reports/ReportsPage"
import { AiSettingsPage } from "@/features/settings/AiSettingsPage"
import { ChatInboxPage } from "@/features/settings/ChatInboxPage"
import { MarketingAnalyticsPage } from "@/features/marketing/MarketingAnalyticsPage"

import { CustomerPortalPage } from "@/features/customer/CustomerPortalPage"
import { UnauthorizedModal } from "@/components/common/UnauthorizedModal"

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: "" }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("Application Render Error:", error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#FBF9F5] p-6 text-center text-[#181512]">
          <div className="relative w-full max-w-md rounded-3xl border border-[#EFECE6] bg-white p-8 shadow-jeruk-lg">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF2ED] text-[#FF5A2B]">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-black text-[#181512]">Terjadi Kesalahan Tampilan</h2>
            <p className="mt-2 text-xs text-[#78716C] leading-relaxed">
              {this.state.error || "Gagal memuat halaman antarmuka."}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: "" })
                  window.location.reload()
                }}
                className="press-tactile inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#FF5A2B] px-4 text-xs font-bold text-white shadow-md hover:bg-[#E5481B]"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Muat Ulang Halaman</span>
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Customer Self-Ordering Portal */}
      <Route path="/" element={<CustomerPortalPage />} />
      <Route path="/order" element={<CustomerPortalPage />} />
      <Route path="/menu" element={<CustomerPortalPage />} />

      {/* Staff Login */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected POS & Back-Office Staff Operations */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <AppLayout>
              <RoleGuard permission="products:read">
                <ProductsPage />
              </RoleGuard>
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/marketing"
        element={
          <ProtectedRoute>
            <AppLayout>
              <RoleGuard permission="products:read">
                <MarketingAnalyticsPage />
              </RoleGuard>
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/pos"
        element={
          <ProtectedRoute>
            <AppLayout>
              <RoleGuard permission="transactions:create">
                <PosPage />
              </RoleGuard>
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <AppLayout>
              <RoleGuard permission="transactions:create">
                <TransactionsHistoryPage />
              </RoleGuard>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <AppLayout>
              <RoleGuard permission="inventory:manage">
                <InventoryPage />
              </RoleGuard>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <AppLayout>
              <RoleGuard permission="customers:manage">
                <CustomersPage />
              </RoleGuard>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <AppLayout>
              <RoleGuard permission="reports:view">
                <ReportsPage />
              </RoleGuard>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/ai"
        element={
          <ProtectedRoute>
            <AppLayout>
              <RoleGuard permission="settings:manage">
                <AiSettingsPage />
              </RoleGuard>
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/chat"
        element={
          <ProtectedRoute>
            <AppLayout>
              <RoleGuard permission="customers:manage">
                <ChatInboxPage />
              </RoleGuard>
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Error / Unauthorized Page with Jeruk AI Theme */}
      <Route
        path="/unauthorized"
        element={
          <div className="relative flex min-h-screen items-center justify-center bg-[#FBF9F5] p-4 text-[#181512]">
            {/* Top Sunlight Wash */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-[#FFEAA0]/80 via-[#FFF8D6]/40 to-transparent" />
            
            <div className="relative w-full max-w-md rounded-3xl border border-[#EFECE6] bg-white p-8 text-center shadow-jeruk-lg">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF2ED] text-[#FF5A2B] shadow-inner border border-orange-200/60">
                <ShieldAlert className="h-8 w-8 text-[#FF5A2B]" />
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200/80 px-3 py-1 text-[11px] font-bold text-red-600 mb-2">
                <span>Error 403 • Hak Akses Dibatasi</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-[#181512]">
                Akses Ditolak
              </h1>
              <p className="mt-2 text-xs text-[#78716C] leading-relaxed text-pretty">
                Akun Anda tidak memiliki izin otorisasi yang cukup untuk mengakses halaman ini. Silakan hubungi Administrator sistem.
              </p>

              <div className="mt-6">
                <Link
                  to="/dashboard"
                  className="press-tactile inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#FF5A2B] px-4 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:bg-[#E5481B]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Kembali ke Dashboard Kasir</span>
                </Link>
              </div>
            </div>
          </div>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppRoutes />
        <UnauthorizedModal />
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
