import { useState } from "react"
import { Link, useLocation } from "react-router"
import { useAuthStore } from "@/stores/auth-store"
import { hasPermission } from "@/lib/api"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Warehouse,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import type { Permission } from "@/types"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  permission?: Permission
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: "Produk", href: "/products", icon: <Package className="h-5 w-5" />, permission: "products:read" },
  { label: "Transaksi", href: "/pos", icon: <ShoppingCart className="h-5 w-5" />, permission: "transactions:create" },
  { label: "Inventory", href: "/inventory", icon: <Warehouse className="h-5 w-5" />, permission: "inventory:manage" },
  { label: "Pelanggan", href: "/customers", icon: <Users className="h-5 w-5" />, permission: "customers:manage" },
  { label: "Laporan", href: "/reports", icon: <BarChart3 className="h-5 w-5" />, permission: "reports:view" },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const location = useLocation()

  const visibleItems = navItems.filter(
    (item) => !item.permission || hasPermission(user, item.permission),
  )

  const roleName = user?.roles?.[0]?.name ?? "user"

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <span className="text-lg font-bold">QRIS-POS</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User info + Logout */}
        <div className="border-t border-sidebar-border p-4">
          <div className="mb-2">
            <p className="text-sm font-medium truncate">{user?.fullName}</p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">{roleName}</p>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b bg-card px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1" />
          <span className="text-sm text-muted-foreground">{user?.email}</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
