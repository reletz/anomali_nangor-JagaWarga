import ReportForm from '@/components/forms/ReportForm'

export default function SubmitReportPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Buat Laporan Baru
          </h1>
          <p className="text-gray-600 mb-8">
            Laporkan masalah di lingkungan Anda. Laporan akan diteruskan ke
            departemen yang bertanggung jawab.
          </p>

          <ReportForm />
        </div>
      </div>
    </div>
  )
}