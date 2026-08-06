const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

export type Patient = { id: string; national_id_last4: string; first_name: string; last_name: string; province: string | null; district: string | null; v1: boolean; v2: boolean; v3: boolean; v4: boolean; version: number }
export type Summary = { total: number; categories: Record<'v1' | 'v2' | 'v3' | 'v4', number>; by_province: Array<{ name: string; count: number }> }
export type MapPoint = { latitude: number; longitude: number; province: string | null; district: string | null; categories: string[] }

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API_BASE}/v1${path}`, { ...init, headers })
  if (!response.ok) throw new Error((await response.json()).detail ?? 'Request failed')
  return response.json() as Promise<T>
}

export const api = {
  googleLogin: (credential: string) => request<{ access_token: string; user: Record<string, string> }>('/auth/google', '', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential }) }),
  summary: (token: string) => request<Summary>('/dashboard/summary', token),
  patients: (token: string, search = '') => request<{ items: Patient[]; total: number }>(`/patients?search=${encodeURIComponent(search)}`, token),
  importExcel: (token: string, file: File) => request('/imports/excel', token, { method: 'POST', headers: { 'Content-Type': file.type, 'X-Filename': file.name }, body: file }),
  unions: (token: string) => request<Record<string, number>>('/dashboard/unions', token),
  map: (token: string) => request<MapPoint[]>('/intelligence/map', token),
  insights: (token: string) => request<{ insights: string[]; engine: string }>('/intelligence/insights', token),
}
