import { apiClient, getServiceUrl } from './client'
import type { LoginRequest, AuthResponse, User } from '@/lib/types/auth'

const AUTH_BASE = getServiceUrl('identity')

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post(`${AUTH_BASE}/login`, data)
    
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
    }
    
    return response.data
  },

  logout: () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
  },

  getCurrentUser: (): User | null => {
    if (typeof window === 'undefined') return null
    
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  },

  isAuthenticated: (): boolean => {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem('auth_token')
  },

  isAuthority: (): boolean => {
    const user = authApi.getCurrentUser()
    return user?.department != null
  },

  isCitizen: (): boolean => {
    const user = authApi.getCurrentUser()
    return user != null && user.department == null
  },
}