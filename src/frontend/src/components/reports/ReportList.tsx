import type { Report } from '@/lib/types/report'
import ReportCard from './ReportCard'

interface ReportListProps {
  reports: Report[]
  onReportClick?: (report: Report) => void
  emptyMessage?: string
}

export default function ReportList({ 
  reports, 
  onReportClick,
  emptyMessage = 'Tidak ada laporan' 
}: ReportListProps) {
  if (reports.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {reports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          onClick={() => onReportClick?.(report)}
        />
      ))}
    </div>
  )
}