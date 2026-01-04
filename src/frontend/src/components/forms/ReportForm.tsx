'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { CreateReportRequest, Category, PrivacyLevel } from '@/lib/types/report'
import { CATEGORIES, PRIVACY_LEVELS } from '@/lib/types/report'
import { reportsApi } from '@/lib/api/reports'
import { Send, Trash2, Shield, Heart, Wrench } from 'lucide-react'

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  sampah: <Trash2 className="w-5 h-5" />,
  keamanan: <Shield className="w-5 h-5" />,
  kesehatan: <Heart className="w-5 h-5" />,
  infrastruktur: <Wrench className="w-5 h-5" />,
}

export default function ReportForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<CreateReportRequest>({
    category: '' as Category,
    content: '',
    location: '',
    privacy_level: 'public',
    authority_department: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Auto-assign department based on category
      const departmentMap: Record<Category, string> = {
        sampah: 'kebersihan',
        keamanan: 'keamanan',
        kesehatan: 'kesehatan',
        infrastruktur: 'infrastruktur',
      }

      const data: CreateReportRequest = {
        ...formData,
        authority_department: departmentMap[formData.category],
      }

      await reportsApi.createReport(data)
      
      toast.success('Laporan berhasil dikirim!')
      router.push('/reports')
    } catch (err: any) {
      console.error('Submit error:', err)
      toast.error(err.response?.data?.error || 'Gagal mengirim laporan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Kategori <span className="text-red-500">*</span>
        </label>
        <select
          required
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Pilih kategori...</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Deskripsi Masalah <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          rows={5}
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Jelaskan masalah yang Anda laporkan..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          minLength={10}
        />
        <p className="text-sm text-gray-500 mt-1">Minimal 10 karakter</p>
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lokasi (Opsional)
        </label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="Contoh: Jl. Sudirman No. 10, Bandung"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Privacy Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Tingkat Privasi <span className="text-red-500">*</span>
        </label>
        <div className="space-y-3">
          {PRIVACY_LEVELS.map((level) => (
            <label
              key={level.value}
              className="flex items-start space-x-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition"
            >
              <input
                type="radio"
                name="privacy_level"
                value={level.value}
                checked={formData.privacy_level === level.value}
                onChange={(e) => setFormData({ ...formData, privacy_level: e.target.value as PrivacyLevel })}
                className="mt-1 w-4 h-4 text-blue-600"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{level.label}</div>
                <div className="text-sm text-gray-500">{level.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center space-x-2"
      >
        <Send className="w-5 h-5" />
        <span>{isSubmitting ? 'Mengirim...' : 'Kirim Laporan'}</span>
      </button>
    </form>
  )
}