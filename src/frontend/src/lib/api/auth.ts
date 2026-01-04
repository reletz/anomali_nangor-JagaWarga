import { apiClient, getServiceUrl } from './client'
import type {
  CitizenLoginRequest,
  AuthorityLoginRequest,
  CitizenRegisterRequest,
  AuthResponse,
  User,
} from '@/lib/types/auth'

const AUTH_BASE = getServiceUrl('identity')

export const authApi = {
  // Register citizen (nik + name only)
  registerCitizen: async (data: CitizenRegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post(`${AUTH_BASE}/register`, data)
    
    return response.data
  },

  // Login for citizen (nik + password)
  loginCitizen: async (data: CitizenLoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post(`${AUTH_BASE}/login`, data)
    
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token)
      localStorage.setItem('user', JSON.stringify({ ...response.data.user, role: 'citizen' }))
    }
    
    return response.data
  },

  // Login for authority (email + password)
  loginAuthority: async (data: AuthorityLoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post(`${AUTH_BASE}/login/authority`, data)
    
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token)
      localStorage.setItem('user', JSON.stringify({ ...response.data.user, role: 'authority' }))
    }
    
    return response.data
  },

  // Logout
  logout: () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
  },

  // Get current user
  getCurrentUser: (): User | null => {
    if (typeof window === 'undefined') return null
    
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  },

  // Check if authenticated
  isAuthenticated: (): boolean => {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem('auth_token')
  },

  // Check if user is authority
  isAuthority: (): boolean => {
    const user = authApi.getCurrentUser()
    return user?.role === 'authority' || user?.department != null
  },

  // Check if user is citizen
  isCitizen: (): boolean => {
    const user = authApi.getCurrentUser()
    return user?.role === 'citizen' || (user != null && user.department == null)
  },
}