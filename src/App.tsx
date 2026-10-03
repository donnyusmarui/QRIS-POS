import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router"
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

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected (inside layout) */}
      <Route
        path="/"
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
                <PlaceholderPage title="Laporan" />
              </RoleGuard>
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Error pages */}
      <Route
        path="/unauthorized"
        element={
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold">403</h1>
              <p className="mt-2 text-muted-foreground">
                Anda tidak memiliki akses ke halaman ini
              </p>
            </div>
          </div>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">Halaman ini sedang dalam pengembangan.</p>
    </div>
  )
}

function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
