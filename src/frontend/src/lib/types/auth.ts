export interface User {
  id: string
  email: string
  name?: string
  department?: string
  nik?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: User
}