import type { Report } from '@/lib/types/report'
import { STATUS_LABELS, STATUS_COLORS, CATEGORIES } from '@/lib/types/report'

interface ReportCardProps {
  report: Report
  onClick?: () => void
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
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{category?.icon}</span>
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
          <span className="mr-1">📍</span>
          <span>{report.location}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t">
        <span>{formatDate(report.created_at)}</span>
        <span className="capitalize">{report.authority_department}</span>
      </div>
    </div>
  )
}