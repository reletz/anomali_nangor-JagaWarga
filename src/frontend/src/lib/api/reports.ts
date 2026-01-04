import { apiClient, getServiceUrl } from './client'
import type { Report, CreateReportRequest } from '@/lib/types/report'

const REPORTS_BASE = `${getServiceUrl('reports')}/api`

export const reportsApi = {
  // Public endpoints
  getPublicReports: async (params?: { department?: string; status?: string }): Promise<Report[]> => {
    const response = await apiClient.get(`${REPORTS_BASE}/reports/public`, { params })
    return response.data.data || []
  },

  createReport: async (data: CreateReportRequest): Promise<Report> => {
    const response = await apiClient.post(`${REPORTS_BASE}/reports`, { report: data })
    return response.data.data
  },

  // Citizen endpoints
  getMyReports: async (): Promise<Report[]> => {
    const response = await apiClient.get(`${REPORTS_BASE}/my-reports`)
    return response.data.data || []
  },

  getMyReport: async (id: string): Promise<Report> => {
    const response = await apiClient.get(`${REPORTS_BASE}/my-reports/${id}`)
    return response.data.data
  },

  // Authority endpoints
  getDepartmentReports: async (params?: { department?: string; status?: string }): Promise<Report[]> => {
    const response = await apiClient.get(`${REPORTS_BASE}/reports`, { params })
    return response.data.data || []
  },

  getReport: async (id: string): Promise<Report> => {
    const response = await apiClient.get(`${REPORTS_BASE}/reports/${id}`)
    return response.data.data
  }
}