import type { Report } from '@/lib/types/report'
import { STATUS_LABELS, STATUS_COLORS, CATEGORIES } from '@/lib/types/report'
import { Trash2, Shield, Heart, Wrench, MapPin, Calendar, Building2 } from 'lucide-react'

interface ReportCardProps {
  report: Report
  onClick?: () => void
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  sampah: <Trash2 className="w-6 h-6" />,
  keamanan: <Shield className="w-6 h-6" />,
  kesehatan: <Heart className="w-6 h-6" />,
  infrastruktur: <Wrench className="w-6 h-6" />,
}

export default function ReportCard({ report, onClick }: ReportCardProps) {
  const category = CATEGORIES.find((c) => c.value === report.category)
  const statusLabel = STATUS_LABELS[report.status]
  const statusColor = STATUS_COLORS[report.status]

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer border border-gray-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="text-blue-600">
            {CATEGORY_ICONS[report.category]}
          </div>
          <h3 className="text-lg font-semibold text-gray-800">
            {category?.label}
          </h3>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Content */}
      <p className="text-gray-600 mb-4 line-clamp-3">{report.content}</p>

      {/* Location */}
      {report.location && (
        <div className="flex items-center text-sm text-gray-500 mb-3">
          <MapPin className="w-4 h-4 mr-1" />
          <span>{report.location}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t">
        <div className="flex items-center space-x-1">
          <Calendar className="w-3 h-3" />
          <span>{formatDate(report.created_at)}</span>
        </div>
        <div className="flex items-center space-x-1 capitalize">
          <Building2 className="w-3 h-3" />
          <span>{report.authority_department}</span>
        </div>
      </div>
    </div>
  )
}