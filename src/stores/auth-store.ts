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
      set({ user, isAuthenticated: true })
    }
  },

  logout: () => {
    clearTokens()
    set({ user: null, isAuthenticated: false })
  },

  checkAuth: async () => {
    const token = sessionStorage.getItem("access_token")
    if (!token) {
      set({ isLoading: false })
      return
    }
    try {
      const res = await authApi.me()
      if (res.data) {
        set({ user: res.data, isAuthenticated: true, isLoading: false })
      }
    } catch {
      clearTokens()
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },
}))

function storeTokens(tokens: AuthTokens) {
  sessionStorage.setItem("access_token", tokens.accessToken)
  sessionStorage.setItem("refresh_token", tokens.refreshToken)
}

function clearTokens() {
  sessionStorage.removeItem("access_token")
  sessionStorage.removeItem("refresh_token")
}
