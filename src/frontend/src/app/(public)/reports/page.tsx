'use client'

import { useEffect, useState } from 'react'
import { reportsApi } from '@/lib/api/reports'
import type { Report, Category, ReportStatus } from '@/lib/types/report'
import ReportList from '@/components/reports/ReportList'
import { CATEGORIES } from '@/lib/types/report'
import { Filter, Trash2, Shield, Heart, Wrench } from 'lucide-react'

// Category icons using Lucide
const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  sampah: <Trash2 className="w-4 h-4" />,
  keamanan: <Shield className="w-4 h-4" />,
  kesehatan: <Heart className="w-4 h-4" />,
  infrastruktur: <Wrench className="w-4 h-4" />,
}

export default function PublicReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    department: '',
    status: '',
  })

  useEffect(() => {
    loadReports()
  }, [filters])

  const loadReports = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await reportsApi.getPublicReports(filters)
      setReports(data)
    } catch (err: any) {
      console.error('Load reports error:', err)
      setError('Gagal memuat laporan')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Laporan Publik
          </h1>
          <p className="text-gray-600">
            Lihat semua laporan yang telah dibuat oleh masyarakat
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filter Laporan</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategori
              </label>
              <select
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Semua Kategori</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Semua Status</option>
                <option value="submitted">Diterima</option>
                <option value="in_progress">Diproses</option>
                <option value="resolved">Selesai</option>
                <option value="escalated">Ditingkatkan</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reports */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 mt-4">Memuat laporan...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        ) : (
          <ReportList 
            reports={reports}
            emptyMessage="Belum ada laporan publik"
          />
        )}
      </div>
    </div>
  )
}