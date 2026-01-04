import { create } from 'zustand'
import type { User } from '@/lib/types/auth'
import { authApi } from '@/lib/api/auth'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean

  setUser: (user: User | null) => void
  logout: () => void
  checkAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ 
    user, 
    isAuthenticated: !!user,
    isLoading: false,
  }),

  logout: () => {
    authApi.logout()
    set({ user: null, isAuthenticated: false })
  },

  checkAuth: () => {
    const user = authApi.getCurrentUser()
    set({ 
      user, 
      isAuthenticated: !!user,
      isLoading: false,
    })
  },
}))