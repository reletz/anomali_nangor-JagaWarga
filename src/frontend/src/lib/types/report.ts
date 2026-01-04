export type PrivacyLevel = 'public' | 'private' | 'anonymous'
export type ReportStatus = 'submitted' | 'in_progress' | 'resolved' | 'escalated'
export type Category = 'sampah' | 'keamanan' | 'kesehatan' | 'infrastruktur'

export interface Report {
  id: string
  category: Category
  content: string
  location?: string
  privacy_level: PrivacyLevel
  status: ReportStatus
  authority_department: string
  reporter_id?: string
  created_at: string
  updated_at: string
  escalated_at?: string
  resolved_at?: string
}

export interface CreateReportRequest {
  category: Category
  content: string
  location?: string
  privacy_level: PrivacyLevel
  authority_department: string
}

export const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'sampah', label: 'Sampah', icon: '🗑️' },
  { value: 'keamanan', label: 'Keamanan', icon: '🚨' },
  { value: 'kesehatan', label: 'Kesehatan', icon: '🏥' },
  { value: 'infrastruktur', label: 'Infrastruktur', icon: '🏗️' },
]

export const PRIVACY_LEVELS: { value: PrivacyLevel; label: string; description: string }[] = [
  {
    value: 'public',
    label: 'Publik',
    description: 'Laporan dapat dilihat oleh semua orang',
  },
  {
    value: 'private',
    label: 'Privat',
    description: 'Hanya Anda dan petugas yang bisa melihat',
  },
  {
    value: 'anonymous',
    label: 'Anonim',
    description: 'Identitas Anda tidak akan tercatat',
  },
]

export const STATUS_LABELS: Record<ReportStatus, string> = {
  submitted: 'Diterima',
  in_progress: 'Diproses',
  resolved: 'Selesai',
  escalated: 'Ditingkatkan',
}

export const STATUS_COLORS: Record<ReportStatus, string> = {
  submitted: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  escalated: 'bg-red-100 text-red-800',
}