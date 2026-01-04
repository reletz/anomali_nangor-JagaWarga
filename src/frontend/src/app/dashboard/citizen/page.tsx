'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { reportsApi } from '@/lib/api/reports'
import { useAuthStore } from '@/lib/store/authStore'
import type { Report } from '@/lib/types/report'
import ReportList from '@/components/reports/ReportList'
import { FileText, Clock, CheckCircle, Loader2 } from 'lucide-react'

export default function CitizenDashboard() {
  const router = useRouter()
  const { user, isAuthenticated, checkAuth } = useAuthStore()
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    if (user?.department) {
      router.push('/dashboard/authority')
      return
    }

    loadMyReports()
  }, [isAuthenticated, user, router])

  const loadMyReports = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await reportsApi.getMyReports()
      setReports(data)
    } catch (err: any) {
      console.error('Load my reports error:', err)
      setError('Gagal memuat laporan')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated || user?.department) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard Warga
          </h1>
          <p className="text-gray-600">
            Selamat datang, {user?.name || user?.nik}! Berikut adalah laporan yang telah Anda buat.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {reports.length}
                </div>
                <div className="text-gray-600">Total Laporan</div>
              </div>
              <FileText className="w-12 h-12 text-blue-600 opacity-20" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-yellow-600 mb-2">
                  {reports.filter((r) => r.status === 'in_progress').length}
                </div>
                <div className="text-gray-600">Sedang Diproses</div>
              </div>
              <Clock className="w-12 h-12 text-yellow-600 opacity-20" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {reports.filter((r) => r.status === 'resolved').length}
                </div>
                <div className="text-gray-600">Selesai</div>
              </div>
              <CheckCircle className="w-12 h-12 text-green-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Reports */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
            <p className="text-gray-500 mt-4">Memuat laporan...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Laporan Saya
            </h2>
            <ReportList 
              reports={reports}
              emptyMessage="Anda belum membuat laporan. Klik 'Buat Laporan' untuk memulai."
            />
          </div>
        )}
      </div>
    </div>
  )
}