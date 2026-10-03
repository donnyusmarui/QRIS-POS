import { Navigate } from "react-router"
import { useAuthStore } from "@/stores/auth-store"
import { hasPermission } from "@/lib/api"
import type { Permission } from "@/types"

interface RoleGuardProps {
  children: React.ReactNode
  permission: Permission
  fallback?: React.ReactNode
}

export function RoleGuard({ children, permission, fallback }: RoleGuardProps) {
  const { user } = useAuthStore()

  if (!hasPermission(user, permission)) {
    if (fallback) return <>{fallback}</>
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
