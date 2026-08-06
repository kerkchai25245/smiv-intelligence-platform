const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

export type Patient = { id: string; national_id_last4: string; first_name: string; last_name: string; province: string | null; district: string | null; subdistrict: string | null; v1: boolean; v2: boolean; v3: boolean; v4: boolean; status: 'active' | 'deceased' | 'moved'; version: number }
export type Summary = { total: number; categories: Record<'v1' | 'v2' | 'v3' | 'v4', number>; by_province: Array<{ name: string; count: number }> }
export type MapPoint = { latitude: number; longitude: number; province: string | null; district: string | null; categories: string[] }
export type ImportError = { row: number; message: string; raw_data?: Record<string, unknown> }
export type ImportResult = { filename: string; status: string; created_count: number; updated_count: number; skipped_count: number; errors: ImportError[] }
export type ImportPreview = Omit<ImportResult, 'status'> & { total_rows: number; valid_rows: number }
export type ImportIssue = { id: string; import_job_id: string; row_number: number; reason: string; raw_data: Record<string, unknown>; resolved: boolean }
export type PatientFilters = { districts: string[]; subdistricts: string[] }
export type PatientQuery = { nationalId?: string; firstName?: string; lastName?: string; district?: string; subdistrict?: string; versions?: string[]; status?: string; page?: number; pageSize?: number }

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API_BASE}/v1${path}`, { ...init, headers })
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const payload = await response.json() as { detail?: string }
      if (payload.detail) message = payload.detail
    } catch {
      // Keep the status-based message when the server returns plain text or HTML.
    }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

export const api = {
  googleLogin: (credential: string) => request<{ access_token: string; user: Record<string, string> }>('/auth/google', '', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential }) }),
  summary: (token: string) => request<Summary>('/dashboard/summary', token),
  patients: (token: string, query: PatientQuery = {}) => {
    const params = new URLSearchParams()
    if (query.nationalId) params.set('national_id', query.nationalId)
    if (query.firstName) params.set('first_name', query.firstName)
    if (query.lastName) params.set('last_name', query.lastName)
    if (query.district) params.set('district', query.district)
    if (query.subdistrict) params.set('subdistrict', query.subdistrict)
    if (query.status) params.set('status', query.status)
    query.versions?.forEach((value) => params.append('v', value))
    params.set('page', String(query.page ?? 1))
    params.set('page_size', String(query.pageSize ?? 20))
    return request<{ items: Patient[]; total: number; page: number; page_size: number }>(`/patients?${params}`, token)
  },
  patientFilters: (token: string) => request<PatientFilters>('/patients/filters', token),
  updatePatient: (token: string, id: string, updates: Partial<Pick<Patient, 'status'>>) => request<Patient>(`/patients/${id}`, token, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) }),
  previewExcel: (token: string, file: File) => request<ImportPreview>('/imports/excel/preview', token, { method: 'POST', headers: { 'Content-Type': file.type, 'X-Filename': encodeURIComponent(file.name) }, body: file }),
  importExcel: (token: string, file: File) => request<ImportResult>('/imports/excel', token, { method: 'POST', headers: { 'Content-Type': file.type, 'X-Filename': encodeURIComponent(file.name) }, body: file }),
  importIssues: (token: string) => request<{ items: ImportIssue[]; total: number }>('/imports/issues?page_size=100', token),
  resolveImportIssue: (token: string, id: string, correction: { national_id: string; first_name: string; last_name: string }) => request<ImportIssue>(`/imports/issues/${id}/resolve`, token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(correction) }),
  unions: (token: string, versions: string[] = []) => { const params = new URLSearchParams(); versions.forEach((value) => params.append('v', value)); return request<Record<string, number>>(`/dashboard/unions?${params}`, token) },
  map: (token: string) => request<MapPoint[]>('/intelligence/map', token),
  insights: (token: string) => request<{ insights: string[]; engine: string }>('/intelligence/insights', token),
}
