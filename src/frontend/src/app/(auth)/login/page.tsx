'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/store/authStore'
import { toast } from 'sonner'
import { User, Building2, LogIn } from 'lucide-react'

type LoginType = 'citizen' | 'authority'

export default function LoginPage() {
  const router = useRouter()
  const setUser = useAuthStore((state) => state.setUser)
  
  const [loginType, setLoginType] = useState<LoginType>('citizen')
  const [citizenData, setCitizenData] = useState({
    nik: '',
    password: '',
  })
  const [authorityData, setAuthorityData] = useState({
    email: '',
    password: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCitizenLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await authApi.loginCitizen(citizenData)
      setUser(response.user)
      
      toast.success('Login berhasil!')
      router.push('/dashboard/citizen')
    } catch (err: any) {
      console.error('Login error:', err)
      toast.error(err.response?.data?.error || 'Login gagal. Periksa NIK Anda.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAuthorityLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await authApi.loginAuthority(authorityData)
      setUser(response.user)
      
      toast.success('Login berhasil!')
      router.push('/dashboard/authority')
    } catch (err: any) {
      console.error('Login error:', err)
      toast.error(err.response?.data?.error || 'Login gagal. Periksa email Anda.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Login</h2>
          <p className="text-gray-600 mt-2">Masuk ke akun JagaWarga Anda</p>
        </div>

        {/* Login Type Selector */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setLoginType('citizen')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-lg font-medium transition ${
              loginType === 'citizen'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <User className="w-5 h-5" />
            <span>Warga</span>
          </button>
          <button
            onClick={() => setLoginType('authority')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-lg font-medium transition ${
              loginType === 'authority'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Building2 className="w-5 h-5" />
            <span>Petugas</span>
          </button>
        </div>

        {/* Citizen Login Form */}
        {loginType === 'citizen' && (
          <form onSubmit={handleCitizenLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NIK (Nomor Induk Kependudukan)
              </label>
              <input
                type="text"
                required
                value={citizenData.nik}
                onChange={(e) => setCitizenData({ ...citizenData, nik: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="3273xxxxxxxxxxxxxx"
                minLength={16}
                maxLength={16}
              />
              <p className="text-xs text-gray-500 mt-1">16 digit NIK Anda</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={citizenData.password}
                onChange={(e) => setCitizenData({ ...citizenData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                placeholder=""
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">Password:  (hardcoded)</p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center space-x-2"
            >
              <LogIn className="w-5 h-5" />
              <span>{isSubmitting ? 'Loading...' : 'Login sebagai Warga'}</span>
            </button>

            <p className="text-center text-sm text-gray-600">
              Belum terdaftar?{' '}
              <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                Daftar di sini
              </Link>
            </p>
          </form>
        )}

        {/* Authority Login Form */}
        {loginType === 'authority' && (
          <form onSubmit={handleAuthorityLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Petugas
              </label>
              <input
                type="email"
                required
                value={authorityData.email}
                onChange={(e) => setAuthorityData({ ...authorityData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="petugas@jagawarga.id"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={authorityData.password}
                onChange={(e) => setAuthorityData({ ...authorityData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                placeholder=""
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">Password:  (hardcoded)</p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center space-x-2"
            >
              <LogIn className="w-5 h-5" />
              <span>{isSubmitting ? 'Loading...' : 'Login sebagai Petugas'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  )
}