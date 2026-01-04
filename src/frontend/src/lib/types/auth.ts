export interface User {
  id: string
  nik?: string
  name?: string
  email?: string
  department?: string
  role?: 'citizen' | 'authority'
}

export interface CitizenLoginRequest {
  nik: string
  password: string
}

export interface AuthorityLoginRequest {
  email: string
  password: string
}

export interface CitizenRegisterRequest {
  name: string
  nik: string
}

export interface AuthResponse {
  token: string
  user: User
}

export type UserRole = 'citizen' | 'authority' | null