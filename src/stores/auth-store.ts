import { create } from "zustand"
import type { AuthUser, AuthTokens } from "@/types"
import { authApi } from "@/lib/api"

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const res = await authApi.login(email, password)
    if (res.data) {
      const { user, tokens } = res.data
      storeTokens(tokens)
      set({ user, isAuthenticated: true, isLoading: false })
    }
  },

  logout: () => {
    clearTokens()
    set({ user: null, isAuthenticated: false, isLoading: false })
  },

  checkAuth: async () => {
    const token = getStoredToken("access_token")
    if (!token) {
      set({ isLoading: false, isAuthenticated: false, user: null })
      return
    }
    try {
      const res = await authApi.me()
      if (res.data) {
        set({ user: res.data, isAuthenticated: true, isLoading: false })
      } else {
        clearTokens()
        set({ user: null, isAuthenticated: false, isLoading: false })
      }
    } catch {
      clearTokens()
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },
}))

function getStoredToken(key: string): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(key) || sessionStorage.getItem(key)
}

function storeTokens(tokens: AuthTokens) {
  try {
    localStorage.setItem("access_token", tokens.accessToken)
    localStorage.setItem("refresh_token", tokens.refreshToken)
  } catch {
    // ignore quota/private mode errors
  }
  try {
    sessionStorage.setItem("access_token", tokens.accessToken)
    sessionStorage.setItem("refresh_token", tokens.refreshToken)
  } catch {
    // ignore
  }
}

function clearTokens() {
  try {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
  } catch {}
  try {
    sessionStorage.removeItem("access_token")
    sessionStorage.removeItem("refresh_token")
  } catch {}
}
