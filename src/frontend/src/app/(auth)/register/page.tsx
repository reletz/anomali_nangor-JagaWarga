'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api/auth'
import { toast } from 'sonner'
import { UserPlus } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    name: '',
    nik: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await authApi.registerCitizen(formData)
      
      toast.success('Pendaftaran berhasil! Silakan login dengan NIK Anda.')
      router.push('/login')
    } catch (err: any) {
      console.error('Register error:', err)
      toast.error(err.response?.data?.error || 'Pendaftaran gagal. Coba lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Daftar Warga</h2>
          <p className="text-gray-600 mt-2">Buat akun JagaWarga baru</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nama sesuai KTP"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              NIK (Nomor Induk Kependudukan) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.nik}
              onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="3273xxxxxxxxxxxxxx"
              minLength={16}
              maxLength={16}
            />
            <p className="text-xs text-gray-500 mt-1">16 digit NIK sesuai KTP</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Catatan:</strong> Password default untuk semua akun adalah <code className="bg-blue-100 px-2 py-1 rounded">password123</code>
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center space-x-2"
          >
            <UserPlus className="w-5 h-5" />
            <span>{isSubmitting ? 'Mendaftar...' : 'Daftar'}</span>
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Sudah punya akun?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Login di sini
          </Link>
        </p>
      </div>
    </div>
  )
}