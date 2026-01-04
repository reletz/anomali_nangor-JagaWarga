'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { reportsApi } from '@/lib/api/reports'
import { useAuthStore } from '@/lib/store/authStore'
import type { Report, ReportStatus } from '@/lib/types/report'
import ReportList from '@/components/reports/ReportList'
import { toast } from 'sonner'
import { FileText, AlertCircle, Clock, CheckCircle, Loader2, X } from 'lucide-react'

export default function AuthorityDashboard() {
  const router = useRouter()
  const { user, isAuthenticated, checkAuth } = useAuthStore()
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    if (!user?.department) {
      router.push('/dashboard/citizen')
      return
    }

    loadDepartmentReports()
  }, [isAuthenticated, user, router])

  const loadDepartmentReports = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await reportsApi.getDepartmentReports()
      setReports(data)
    } catch (err: any) {
      console.error('Load department reports error:', err)
      setError('Gagal memuat laporan')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated || !user?.department) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard Petugas
          </h1>
          <p className="text-gray-600">
            Departemen: <span className="font-semibold capitalize">{user.department}</span>
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                <div className="text-3xl font-bold text-gray-600 mb-2">
                  {reports.filter((r) => r.status === 'submitted').length}
                </div>
                <div className="text-gray-600">Baru</div>
              </div>
              <AlertCircle className="w-12 h-12 text-gray-600 opacity-20" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-yellow-600 mb-2">
                  {reports.filter((r) => r.status === 'in_progress').length}
                </div>
                <div className="text-gray-600">Diproses</div>
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
              Laporan Departemen
            </h2>
            <ReportList 
              reports={reports}
              onReportClick={setSelectedReport}
              emptyMessage="Tidak ada laporan untuk departemen ini"
            />
          </div>
        )}

        {/* Update Status Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold">Detail Laporan</h2>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-500 hover:text-gray-700 transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm text-gray-600">Kategori</label>
                  <p className="font-medium capitalize">{selectedReport.category}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Deskripsi</label>
                  <p className="text-gray-800">{selectedReport.content}</p>
                </div>
                {selectedReport.location && (
                  <div>
                    <label className="text-sm text-gray-600">Lokasi</label>
                    <p className="text-gray-800">{selectedReport.location}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm text-gray-600">Status Saat Ini</label>
                  <p className="font-medium capitalize">{selectedReport.status}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}