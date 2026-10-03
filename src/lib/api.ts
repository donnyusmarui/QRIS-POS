import type { ApiResponse, AuthResponse, AuthUser, Permission } from "@/types"

const API_BASE = "/.netlify/functions"

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = typeof window !== "undefined" 
    ? (localStorage.getItem("access_token") || sessionStorage.getItem("access_token"))
    : null
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${API_BASE}/${endpoint}`, {
    ...options,
    headers,
  })

  const data = await res.json()

  if (!res.ok) {
    throw new ApiError(data.error || "Request failed", res.status)
  }

  return data as ApiResponse<T>
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

// ─── Auth API ────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<AuthResponse>("auth-login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, fullName: string) =>
    apiFetch<{ user: AuthUser }>("auth-register", {
      method: "POST",
      body: JSON.stringify({ email, password, fullName }),
    }),

  me: () => apiFetch<AuthUser>("auth-me"),
}

// ─── Permission checker (client-side) ────────────────────
export function hasPermission(
  user: AuthUser | null,
  permission: Permission,
): boolean {
  if (!user) return false
  return user.roles.some((role) => role.permissions.includes(permission))
}

export { apiFetch }
