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
  Receipt,
  LogOut,
  Menu,
  X,
  QrCode,
  ShieldCheck,
} from "lucide-react"
import type { Permission } from "@/types"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  permission?: Permission
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Produk", href: "/products", icon: <Package className="h-4 w-4" />, permission: "products:read" },
  { label: "Transaksi", href: "/pos", icon: <ShoppingCart className="h-4 w-4" />, permission: "transactions:create" },
  { label: "Riwayat", href: "/transactions", icon: <Receipt className="h-4 w-4" />, permission: "transactions:create" },
  { label: "Inventory", href: "/inventory", icon: <Warehouse className="h-4 w-4" />, permission: "inventory:manage" },
  { label: "Pelanggan", href: "/customers", icon: <Users className="h-4 w-4" />, permission: "customers:manage" },
  { label: "Laporan", href: "/reports", icon: <BarChart3 className="h-4 w-4" />, permission: "reports:view" },
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
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-2xs">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-sidebar-foreground">QRIS-POS</span>
              <span className="block text-[10px] font-medium text-sidebar-foreground/60">Point of Sale</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="press-tactile rounded-lg p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent/50 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`press-tactile flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User info + Logout */}
        <div className="border-t border-sidebar-border p-3.5 space-y-2.5">
          <div className="flex items-center gap-2.5 rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
              {user?.fullName?.charAt(0) || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-sidebar-foreground">{user?.fullName}</p>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium capitalize text-sidebar-foreground/60">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                {roleName}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="press-tactile flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/15"
          >
            <LogOut className="h-3.5 w-3.5" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-border/60 bg-card px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="press-tactile rounded-lg border p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Local SQLite Active
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">{user?.email}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
